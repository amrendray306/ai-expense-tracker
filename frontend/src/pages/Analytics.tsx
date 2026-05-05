import { useState, useEffect } from 'react';
import { BrainCircuit, AlertTriangle, TrendingUp, RefreshCw, Plus, Target, Calendar, Sparkles, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MLData {
  anomalies: any[];
  insights: string[];
  prediction: number | null;
  category_predictions?: Array<{
    category: string;
    predictedAmount: number;
  }>;
  coach: Array<{
    type: 'warning' | 'success' | 'info';
    icon: string;
    title: string;
    message: string;
  }>;
}

interface Subscription {
  name: string;
  amount: number;
  frequency: string;
  monthlyCost: number;
  lastCharged: string;
  occurrences: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string | null;
  emoji: string;
}

export default function Analytics() {
  const [data, setData] = useState<MLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New States
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalSubCost, setTotalSubCost] = useState(0);
  const [smartAnalytics, setSmartAnalytics] = useState<any>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', deadline: '', emoji: '🎯' });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [insightsRes, subRes, analyticsRes, goalsRes] = await Promise.all([
        api.get('/ml/insights'),
        api.get('/ml/subscriptions'),
        api.get('/ml/analytics'),
        api.get('/goals')
      ]);

      setData(insightsRes.data);
      setSubscriptions(subRes.data.subscriptions);
      setTotalSubCost(subRes.data.totalMonthlyCost);
      setSmartAnalytics(analyticsRes.data);
      setGoals(goalsRes.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to connect to ML service. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloadingPdf(true);
      const res = await api.get('/reports/monthly', {
        responseType: 'blob' // Important for binary data
      });
      
      // Create a link to download the blob
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Financial_Report_${new Date().getMonth() + 1}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      await api.post('/goals', newGoal);
      setShowGoalModal(false);
      setNewGoal({ name: '', targetAmount: '', deadline: '', emoji: '🎯' });
      const goalsRes = await api.get('/goals');
      setGoals(goalsRes.data);
    } catch (err) {
      console.error('Failed to create goal', err);
    }
  };

  const handleUpdateSavedAmount = async (goalId: string, currentSaved: number, increment: number) => {
    try {
      await api.put(`/goals/${goalId}`, { savedAmount: currentSaved + increment });
      const goalsRes = await api.get('/goals');
      setGoals(goalsRes.data);
    } catch (err) {
      console.error('Failed to update goal amount', err);
    }
  };

  const barData = {
    labels: smartAnalytics?.monthlyComparison.map((m: any) => m.month) || [],
    datasets: [
      {
        label: 'Monthly Spending',
        data: smartAnalytics?.monthlyComparison.map((m: any) => m.total) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderRadius: 8,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'rgba(255, 255, 255, 0.5)' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: 'rgba(255, 255, 255, 0.5)' } }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <RefreshCw className="text-primary animate-spin mb-4" size={40} />
        <h2 className="text-xl font-semibold text-gray-300">Generating AI Financial Strategy...</h2>
        <p className="text-gray-500 mt-2">Running Advanced Pattern Recognition</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Sparkles className="text-yellow-400" size={32} />
            Smart Finance Hub
          </h1>
          <p className="text-gray-400">AI-driven insights, subscription tracking, and goal management.</p>
        </div>
        <div className="flex gap-3 self-start">
          <button 
            onClick={handleDownloadReport}
            disabled={downloadingPdf}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors border border-blue-500/20 disabled:opacity-50"
          >
            {downloadingPdf ? <RefreshCw className="animate-spin" size={18} /> : <PieChart size={18} />}
            {downloadingPdf ? 'Generating...' : 'Download Report'}
          </button>
          <button 
            onClick={fetchAllData}
            className="glass px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/5 transition-colors border border-white/10 text-gray-300"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-red-400 font-semibold text-lg mb-1">Service Unreachable</h3>
            <p className="text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {/* AI COACH SECTION */}
      <section>
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <BrainCircuit className="text-primary" size={24} />
          AI Financial Coach
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.coach && data.coach.length > 0 ? (
            data.coach.map((tip, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`glass-card p-6 border-l-4 ${
                  tip.type === 'warning' ? 'border-l-yellow-500' : 
                  tip.type === 'success' ? 'border-l-green-500' : 'border-l-blue-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <h4 className="font-bold text-white">{tip.title}</h4>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{tip.message}</p>
              </motion.div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full">No coach advice yet. Keep tracking to train your AI.</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MONTHLY TRENDS CHART */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="text-green-400" size={24} />
              Spending Trends
            </h3>
            <div className="text-sm text-gray-400">Last 6 Months</div>
          </div>
          <div className="h-[300px]">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* SUBSCRIPTIONS PANEL */}
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="text-purple-400" size={24} />
            Subscriptions
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {subscriptions.length > 0 ? (
              subscriptions.map((sub, idx) => (
                <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-white">{sub.name}</h4>
                    <p className="text-xs text-gray-500">{sub.frequency} • ₹{sub.amount.toFixed(0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-400 font-bold">₹{sub.monthlyCost.toFixed(0)}/mo</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No recurring patterns detected yet.</p>
            )}
          </div>
          {subscriptions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
              <span className="text-gray-400 text-sm">Estimated Monthly:</span>
              <span className="text-xl font-bold text-white">₹{totalSubCost.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* CATEGORY PREDICTIONS SECTION */}
      {data?.category_predictions && data.category_predictions.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <BrainCircuit className="text-blue-400" size={24} />
            AI Category Forecast (Next 60 Days)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.category_predictions.map((pred, idx) => (
              <div key={idx} className="glass-card p-5 border-l-4 border-l-blue-500">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">{pred.category}</p>
                <p className="text-2xl font-bold text-white mt-2">₹{pred.predictedAmount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORY BREAKDOWN SECTION */}
      <section>
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <PieChart className="text-blue-400" size={24} />
          Spending by Category
        </h3>
        <div className="glass-card p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              {smartAnalytics?.categoryBreakdown && smartAnalytics.categoryBreakdown.length > 0 ? (
                smartAnalytics.categoryBreakdown.map((cat: any, idx: number) => {
                  const totalCurrentMonth = smartAnalytics.categoryBreakdown.reduce((acc: number, curr: any) => acc + curr.amount, 0);
                  const percentage = ((cat.amount / totalCurrentMonth) * 100).toFixed(1);
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-sm font-bold text-white uppercase tracking-wider">{cat.category}</span>
                          <p className="text-xs text-gray-500">₹{cat.amount.toLocaleString()}</p>
                        </div>
                        <span className="text-sm font-bold text-primary">{percentage}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No categorical data for this month.
                </div>
              )}
            </div>

            <div className="bg-white/5 rounded-3xl p-8 flex flex-col justify-center items-center text-center border border-white/5">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <Target size={40} />
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">Monthly Budget Status</h4>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">
                You've spent <span className="text-white font-bold">₹{smartAnalytics?.categoryBreakdown?.reduce((acc: number, curr: any) => acc + curr.amount, 0).toLocaleString() || 0}</span> so far this month.
              </p>
              <div className="flex gap-4 w-full">
                <div className="flex-1 bg-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Top Category</p>
                  <p className="font-bold text-white truncate">{smartAnalytics?.categoryBreakdown?.[0]?.category || 'N/A'}</p>
                </div>
                <div className="flex-1 bg-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Categories</p>
                  <p className="font-bold text-white">{smartAnalytics?.categoryBreakdown?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SAVINGS GOALS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Target className="text-primary" size={24} />
            Savings Goals
          </h3>
          <button 
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-2 bg-primary/20 text-primary hover:bg-primary/30 px-4 py-2 rounded-xl transition-all text-sm font-medium"
          >
            <Plus size={16} /> Add Goal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const percent = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
            return (
              <div key={goal.id} className="glass-card p-6 group relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                    {goal.emoji}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Remaining</p>
                    <p className="font-bold text-white">₹{(goal.targetAmount - goal.savedAmount).toFixed(0)}</p>
                  </div>
                </div>
                
                <h4 className="text-lg font-bold text-white mb-1">{goal.name}</h4>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">₹{goal.savedAmount.toFixed(0)} of ₹{goal.targetAmount.toFixed(0)}</span>
                  <span className="text-primary font-bold">{percent.toFixed(0)}%</span>
                </div>
                
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden mb-6">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateSavedAmount(goal.id, goal.savedAmount, 500)}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    +₹500
                  </button>
                  <button 
                    onClick={() => handleUpdateSavedAmount(goal.id, goal.savedAmount, 1000)}
                    className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    +₹1000
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* GOAL MODAL */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGoalModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 w-full max-w-md relative z-10 border border-white/10"
            >
              <h3 className="text-2xl font-bold mb-6">New Savings Goal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Goal Name</label>
                  <input 
                    type="text" 
                    value={newGoal.name}
                    onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary transition-colors outline-none"
                    placeholder="e.g. New Macbook"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Target (₹)</label>
                    <input 
                      type="number" 
                      value={newGoal.targetAmount}
                      onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary transition-colors outline-none"
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Emoji</label>
                    <input 
                      type="text" 
                      value={newGoal.emoji}
                      onChange={e => setNewGoal({...newGoal, emoji: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary transition-colors outline-none text-center"
                      placeholder="🎯"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Deadline (Optional)</label>
                  <input 
                    type="date" 
                    value={newGoal.deadline}
                    onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary transition-colors outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateGoal}
                  className="flex-1 bg-primary text-white font-bold px-4 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all"
                >
                  Create Goal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
