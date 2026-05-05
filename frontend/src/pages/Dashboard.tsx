import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, CreditCard, Edit2, AlertCircle, BrainCircuit, Download } from 'lucide-react';
import StatCard from '../components/StatCard';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

interface Expense {
  id: string;
  amount: number;
  date: string;
  category: { name: string };
}

export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState(user?.monthlyBudget?.toString() || '0');
  const [insightsData, setInsightsData] = useState<{insights: string[], prediction: number | null}>({ insights: [], prediction: null });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchExpenses();
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const res = await api.get('/ml/insights');
      setInsightsData(res.data);
    } catch (err) {
      console.error('Failed to fetch insights', err);
    }
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const res = await api.get('/reports/monthly', {
        responseType: 'blob' // Important for binary data
      });
      
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
      setIsDownloading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBudget = async () => {
    try {
      const res = await api.put('/auth/budget', { budget: Number(newBudget) });
      updateUser({ monthlyBudget: res.data.monthlyBudget });
      setIsEditingBudget(false);
    } catch (err) {
      console.error('Failed to update budget', err);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthExpenses = expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const budget = user?.monthlyBudget || 0;
  const budgetPercentage = budget > 0 ? Math.min((thisMonthExpenses / budget) * 100, 100) : 0;
  const isOverBudget = budget > 0 && thisMonthExpenses > budget;

  // Group by category for Pie Chart
  const categoryTotals = expenses.reduce((acc: any, curr) => {
    const catName = curr.category?.name || 'Uncategorized';
    acc[catName] = (acc[catName] || 0) + curr.amount;
    return acc;
  }, {});

  const topCategory = Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b, 'None');

  const pieData = {
    labels: Object.keys(categoryTotals).length > 0 ? Object.keys(categoryTotals) : ['No Data'],
    datasets: [
      {
        data: Object.keys(categoryTotals).length > 0 ? Object.values(categoryTotals) : [1],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    ],
  };

  // Group by month for Line Chart
  const monthlyTotals = expenses.reduce((acc: any, curr) => {
    const month = new Date(curr.date).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + curr.amount;
    return acc;
  }, {});

  const lineData = {
    labels: Object.keys(monthlyTotals).length > 0 ? Object.keys(monthlyTotals) : ['No Data'],
    datasets: [
      {
        label: 'Expenses',
        data: Object.keys(monthlyTotals).length > 0 ? Object.values(monthlyTotals) : [0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)' } },
      y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: 'rgba(255, 255, 255, 0.7)' } }
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Future Prediction</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {insightsData.prediction ? `₹${insightsData.prediction.toFixed(2)}` : 'Need more data'}
              </h3>
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <BrainCircuit size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Predicted expenses for next 60 days</p>
        </div>
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Monthly Budget</p>
              {isEditingBudget ? (
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="number" 
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded p-1 w-24 text-white"
                  />
                  <button onClick={handleUpdateBudget} className="text-xs bg-primary px-2 py-1 rounded">Save</button>
                  <button onClick={() => setIsEditingBudget(false)} className="text-xs bg-gray-500 px-2 py-1 rounded">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-white">₹{budget.toFixed(2)}</h3>
                  <button onClick={() => setIsEditingBudget(true)} className="text-gray-400 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <TrendingUp size={24} />
            </div>
          </div>
          
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Spent: ₹{thisMonthExpenses.toFixed(2)}</span>
              <span className={isOverBudget ? 'text-red-400 font-bold' : 'text-gray-400'}>{budgetPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${budgetPercentage}%` }}
              ></div>
            </div>
            {isOverBudget && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> Exceeded limit!
              </p>
            )}
          </div>
        </div>
        <StatCard 
          title="Top Category" 
          value={topCategory} 
          icon={<CreditCard size={24} />} 
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="glass-card p-6 lg:col-span-1"
        >
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="text-primary" size={20} />
            <h3 className="text-lg font-semibold">AI Insights</h3>
          </div>
          <div className="space-y-4">
            {insightsData.insights && insightsData.insights.length > 0 ? (
              insightsData.insights.map((insight, idx) => (
                <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10 text-sm text-gray-300">
                  {insight}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">Add at least 5 expenses to see AI insights.</p>
            )}
          </div>
          
          <button 
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="w-full mt-6 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg p-3 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Download size={16} />
            {isDownloading ? 'Generating...' : 'Download Monthly PDF'}
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card p-6 lg:col-span-2 h-[400px]"
        >
          <h3 className="text-lg font-semibold mb-4">Expense Trends</h3>
          <Line data={lineData} options={chartOptions} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="glass-card p-6 lg:col-span-1 h-[400px]"
        >
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255, 255, 255, 0.7)' } } } }} />
        </motion.div>
      </div>
    </div>
  );
}
