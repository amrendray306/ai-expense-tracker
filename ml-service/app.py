from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from collections import defaultdict
import re

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "AI Expense Tracker ML Service is running!"

# ────────────────────────────────────────────────
# Helper: normalize expense title for grouping
# ────────────────────────────────────────────────
def normalize(title):
    return re.sub(r'[^a-z0-9]', '', str(title).lower())

# ────────────────────────────────────────────────
# 1. Main ML Analyze endpoint (anomaly + prediction)
# ────────────────────────────────────────────────
@app.route('/api/ml/analyze', methods=['POST'])
def analyze():
    data = request.json.get('expenses', [])
    if len(data) < 5:
        return jsonify({
            "anomalies": [],
            "insights": ["Need at least 5 expenses to generate AI insights. Add more expenses!"],
            "prediction": None,
            "coach": []
        })

    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])
    df['amount'] = df['amount'].astype(float)
    df = df.sort_values('date')

    # ── Anomaly Detection (ML Based) ──────────
    if 'category' in df.columns:
        df_encoded = pd.get_dummies(df, columns=['category'])
        features = ['amount'] + [col for col in df_encoded.columns if col.startswith('category_')]
        anomaly_df = df_encoded[features]
    else:
        anomaly_df = df[['amount']]

    # ── Dynamic Anomaly Sensitivity ───────────
    # Sensitivity INCREASES with more expenses (more data = better context for anomaly detection):
    #   - Few expenses  (5):    ~10% contamination (low sensitivity — not enough data)
    #   - Medium       (20):    ~38% contamination (balanced)
    #   - Large        (50):    ~47% contamination (more confident detection)
    #   - Very large  (200+):   60% contamination (maximum — catches subtle patterns)
    # Uses logarithmic growth for a smooth curve.
    n_expenses = len(df)
    log_scale = np.log(max(n_expenses, 1)) / np.log(200)  # normalize to 0→1 over 1→200 expenses
    dynamic_contamination = round(max(0.10, min(0.60, 0.10 + 0.50 * log_scale)), 4)
    
    iso_forest = IsolationForest(contamination=dynamic_contamination, random_state=42)
    df['anomaly'] = iso_forest.fit_predict(anomaly_df)

    # ── Rule-Based Anomaly Detection ──────────
    # Flag anything that is 3x the average transaction amount
    avg_amount = df['amount'].mean()
    df.loc[df['amount'] > (avg_amount * 3), 'anomaly'] = -1

    df['date_str'] = df['date'].dt.strftime('%Y-%m-%d')
    anomalies_df = df[df['anomaly'] == -1].copy()
    anomalies_df['date'] = anomalies_df['date_str']
    anomalies = anomalies_df.drop(columns=['date_str']).to_dict(orient='records')

    # ── Regression for next 60-day prediction ──
    df['days_since_start'] = (df['date'] - df['date'].min()).dt.days
    daily_totals = df.groupby('days_since_start')['amount'].sum().reset_index()
    X = daily_totals[['days_since_start']]
    y = daily_totals['amount']

    model = LinearRegression()
    model.fit(X, y)

    last_day = daily_totals['days_since_start'].max()
    future_days = pd.DataFrame({'days_since_start': [last_day + i for i in range(1, 61)]})
    predictions = model.predict(future_days)
    predicted_total = float(predictions.sum())

    if predicted_total <= 0:
        avg_daily = float(daily_totals['amount'].mean())
        predicted_total = avg_daily * 60

    # ── Category-Level Predictions ──
    category_predictions = []
    if 'category' in df.columns:
        for cat in df['category'].unique():
            cat_df = df[df['category'] == cat]
            if len(cat_df) >= 3:
                cat_daily = cat_df.groupby('days_since_start')['amount'].sum().reset_index()
                X_cat = cat_daily[['days_since_start']]
                y_cat = cat_daily['amount']
                
                cat_model = LinearRegression()
                cat_model.fit(X_cat, y_cat)
                
                cat_pred = cat_model.predict(future_days)
                cat_total = float(cat_pred.sum())
                
                if cat_total <= 0:
                    cat_total = float(cat_daily['amount'].mean()) * 60
                    
                category_predictions.append({
                    "category": str(cat),
                    "predictedAmount": round(cat_total, 2)
                })
            elif len(cat_df) > 0:
                # Fallback for small sample size
                cat_total = float(cat_df['amount'].mean()) * (60 / len(df['date'].unique()))
                category_predictions.append({
                    "category": str(cat),
                    "predictedAmount": round(cat_total, 2)
                })
    
    # Sort category predictions by amount descending
    category_predictions = sorted(category_predictions, key=lambda x: x['predictedAmount'], reverse=True)

    # ── AI Coach (rule-based) ──────────────────
    coach = []
    now = df['date'].max()
    current_month = now.month
    current_year = now.year
    prev_month = 12 if current_month == 1 else current_month - 1
    prev_year = current_year - 1 if current_month == 1 else current_year

    curr = df[(df['date'].dt.month == current_month) & (df['date'].dt.year == current_year)]
    prev = df[(df['date'].dt.month == prev_month) & (df['date'].dt.year == prev_year)]

    curr_total = float(curr['amount'].sum())
    prev_total = float(prev['amount'].sum())

    # Month comparison
    if prev_total > 0:
        change = ((curr_total - prev_total) / prev_total) * 100
        if change > 0:
            coach.append({
                "type": "warning",
                "icon": "📈",
                "title": "Spending Increased",
                "message": f"Your spending increased by {change:.1f}% compared to last month (₹{curr_total:.0f} vs ₹{prev_total:.0f})."
            })
        else:
            coach.append({
                "type": "success",
                "icon": "🎉",
                "title": "Great Progress!",
                "message": f"You reduced spending by {abs(change):.1f}% vs last month! You saved ₹{prev_total - curr_total:.0f}."
            })

    # Top category advice
    if 'category' in df.columns and len(curr) > 0:
        cat_totals = curr.groupby('category')['amount'].sum().sort_values(ascending=False)
        if len(cat_totals) > 0:
            top_cat = cat_totals.index[0]
            top_val = float(cat_totals.iloc[0])
            top_pct = (top_val / curr_total * 100) if curr_total > 0 else 0
            coach.append({
                "type": "info",
                "icon": "💡",
                "title": f"Top Spending: {top_cat}",
                "message": f"You spent ₹{top_val:.0f} ({top_pct:.0f}% of budget) on {top_cat} this month. Consider reviewing this category."
            })

    # Anomaly coach tip
    if len(anomalies) > 0:
        coach.append({
            "type": "warning",
            "icon": "⚠️",
            "title": "Unusual Transactions Detected",
            "message": f"We found {len(anomalies)} unusual expense(s) that deviate from your normal patterns."
        })

    # Savings rate
    avg_monthly = float(df.groupby([df['date'].dt.year, df['date'].dt.month])['amount'].sum().mean())
    if avg_monthly > 0:
        coach.append({
            "type": "info",
            "icon": "💰",
            "title": "Average Monthly Spend",
            "message": f"Your average monthly spending is ₹{avg_monthly:.0f}. Aim to keep it 20% below your income for healthy savings."
        })

    # ── Standard insights (Restored to previous version) ──────
    insights = []
    if len(anomalies) > 0:
        insights.append(f"We detected {len(anomalies)} unusual expenses recently across your categories.")
    
    insights.append(f"Based on your trends, you might spend around ₹{predicted_total:.2f} over the next 2 months.")

    return jsonify({
        "anomalies": anomalies,
        "insights": insights,
        "prediction": predicted_total,
        "category_predictions": category_predictions,
        "coach": coach
    })


# ────────────────────────────────────────────────
# 2. Subscription Detection endpoint
# ────────────────────────────────────────────────
@app.route('/api/ml/subscriptions', methods=['POST'])
def detect_subscriptions():
    data = request.json.get('expenses', [])
    if len(data) < 3:
        return jsonify({"subscriptions": [], "totalMonthlyCost": 0})

    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])
    df['amount'] = df['amount'].astype(float)
    df['normalized'] = df['title'].apply(normalize) if 'title' in df.columns else df.get('description', pd.Series([''] * len(df))).apply(normalize)

    # Group by normalized title
    groups = df.groupby('normalized')

    subscriptions = []
    for name, group in groups:
        if len(group) < 2:
            continue

        group = group.sort_values('date')
        amounts = group['amount'].tolist()
        dates = group['date'].tolist()

        # Check amount consistency (within 5% variance)
        avg_amount = float(np.mean(amounts))
        variance = float(np.std(amounts) / avg_amount) if avg_amount > 0 else 1
        if variance > 0.05:
            continue  # Amounts vary too much — not a subscription

        # Check date interval consistency
        if len(dates) >= 2:
            intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_interval = float(np.mean(intervals))
            interval_variance = float(np.std(intervals))

            # Allow ±5 days variance in interval
            if interval_variance > 5:
                continue

            # Classify interval
            if 25 <= avg_interval <= 35:
                freq = 'Monthly'
                monthly_cost = avg_amount
            elif 6 <= avg_interval <= 8:
                freq = 'Weekly'
                monthly_cost = avg_amount * 4.3
            elif 85 <= avg_interval <= 95:
                freq = 'Quarterly'
                monthly_cost = avg_amount / 3
            elif 355 <= avg_interval <= 370:
                freq = 'Yearly'
                monthly_cost = avg_amount / 12
            else:
                continue  # Unrecognized pattern

            original_title = group['title'].iloc[-1] if 'title' in group.columns else name
            subscriptions.append({
                "name": str(original_title),
                "amount": avg_amount,
                "frequency": freq,
                "monthlyCost": round(monthly_cost, 2),
                "lastCharged": dates[-1].strftime('%Y-%m-%d'),
                "occurrences": len(group)
            })

    total_monthly = round(sum(s['monthlyCost'] for s in subscriptions), 2)

    return jsonify({
        "subscriptions": subscriptions,
        "totalMonthlyCost": total_monthly
    })


# ────────────────────────────────────────────────
# 3. Smart Analytics endpoint (month comparison)
# ────────────────────────────────────────────────
@app.route('/api/ml/smart-analytics', methods=['POST'])
def smart_analytics():
    data = request.json.get('expenses', [])
    if not data:
        return jsonify({"monthlyComparison": [], "savingsRate": 0, "totalSpent": 0})

    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])
    df['amount'] = df['amount'].astype(float)

    # Last 6 months monthly totals
    df['month_label'] = df['date'].dt.strftime('%b %Y')
    df['month_key'] = df['date'].dt.to_period('M')

    monthly = df.groupby('month_key')['amount'].sum().reset_index()
    monthly = monthly.sort_values('month_key').tail(6)

    comparison = []
    for i, row in monthly.iterrows():
        comparison.append({
            "month": str(row['month_key']),
            "total": round(float(row['amount']), 2)
        })

    # Category breakdown for current month
    now = df['date'].max()
    curr = df[(df['date'].dt.month == now.month) & (df['date'].dt.year == now.year)]
    cat_breakdown = []
    if 'category' in df.columns and len(curr) > 0:
        cat_totals = curr.groupby('category')['amount'].sum().sort_values(ascending=False)
        for cat, val in cat_totals.items():
            cat_breakdown.append({"category": str(cat), "amount": round(float(val), 2)})

    total_spent = round(float(df['amount'].sum()), 2)

    return jsonify({
        "monthlyComparison": comparison,
        "categoryBreakdown": cat_breakdown,
        "totalSpent": total_spent
    })


# ────────────────────────────────────────────────
# 4. Natural Language Expense Parser endpoint
# ────────────────────────────────────────────────
@app.route('/api/ml/parse-expense', methods=['POST'])
def parse_expense():
    text = request.json.get('text', '').lower()
    
    # 1. Extract Amount
    # Matches an optional currency symbol, then digits, then optional decimal
    amount_match = re.search(r'(?:rs|inr|\$|₹|€)?\s*(\d+(\.\d+)?)', text)
    amount = float(amount_match.group(1)) if amount_match else 0.0
    
    # 2. Extract Category (Heuristics)
    category = "Other"
    food_keywords = ['food', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'coffee', 'starbucks', 'cafe', 'restaurant', 'groceries', 'snack']
    transport_keywords = ['uber', 'lyft', 'taxi', 'flight', 'train', 'bus', 'fuel', 'gas', 'petrol', 'transport', 'cab']
    utilities_keywords = ['electricity', 'water', 'internet', 'wifi', 'bill', 'utilities', 'phone', 'recharge']
    shopping_keywords = ['clothes', 'shoes', 'amazon', 'mall', 'shopping', 'bought']
    entertainment_keywords = ['movie', 'cinema', 'netflix', 'spotify', 'concert', 'game', 'ticket']
    
    if any(word in text for word in food_keywords):
        category = "Food"
    elif any(word in text for word in transport_keywords):
        category = "Transport"
    elif any(word in text for word in utilities_keywords):
        category = "Utilities"
    elif any(word in text for word in shopping_keywords):
        category = "Shopping"
    elif any(word in text for word in entertainment_keywords):
        category = "Entertainment"
        
    # 3. Extract Title
    # Clean up the text by removing the amount so the title is cleaner
    if amount_match:
        title = text.replace(amount_match.group(0), '').strip()
    else:
        title = text.strip()
        
    # Capitalize first letter safely
    title = title.capitalize() if title else "AI Quick Add"
    
    return jsonify({
        "amount": amount,
        "category": category,
        "title": title
    })

if __name__ == '__main__':
    app.run(port=5002, debug=True)
