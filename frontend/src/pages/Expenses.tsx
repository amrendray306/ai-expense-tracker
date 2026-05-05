import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Receipt, Edit2, Trash2, X, Search, AlertCircle } from 'lucide-react';
import api from '../api';

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: { id: string; name: string };
  categoryId: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [scannedItems, setScannedItems] = useState<Array<{title: string, amount: number}>>([]);
  
  // Form State
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', date: '', categoryId: '' });
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [aiText, setAiText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // ML State
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const res = await api.get('/ml/insights');
      if (res.data && res.data.anomalies) {
        setAnomalies(res.data.anomalies);
      }
    } catch (err) {
      console.error(err);
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

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data.length === 0) {
        // Auto-create defaults
        await api.post('/categories', { name: 'Food' });
        await api.post('/categories', { name: 'Transport' });
        await api.post('/categories', { name: 'Entertainment' });
        await api.post('/categories', { name: 'Bills' });
        const fresh = await api.get('/categories');
        setCategories(fresh.data);
      } else {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/expenses', newExpense);
      setShowAddModal(false);
      setNewExpense({ title: '', amount: '', date: '', categoryId: '' });
      fetchExpenses();
      fetchInsights(); // Refresh anomalies
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('receipt', file);

    setIsScanning(true);
    try {
      const res = await api.post('/expenses/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.items && res.data.items.length > 0) {
        if (res.data.items.length === 1 && res.data.items[0].title === 'Receipt Scan') {
           setNewExpense(prev => ({ ...prev, amount: res.data.items[0].amount.toString() }));
        } else {
           setScannedItems(res.data.items);
           setShowBulkAddModal(true);
           setShowAddModal(false); // Close normal add modal if open
        }
      }
    } catch (err) {
      console.error('Failed to scan receipt', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBulkAdd = async () => {
    try {
      for (const item of scannedItems) {
        await api.post('/expenses', {
          title: item.title,
          amount: item.amount,
          date: new Date().toISOString().split('T')[0], // today
        });
      }
      setShowBulkAddModal(false);
      setScannedItems([]);
      fetchExpenses();
      fetchInsights();
    } catch (err) {
      console.error('Failed to bulk add items', err);
    }
  };

  const handleAiParse = async () => {
    if (!aiText) return;
    setIsParsing(true);
    try {
      const res = await api.post('/ml/parse-expense', { text: aiText });
      const { amount, category, title } = res.data;
      
      // Find category ID by name (case insensitive)
      let catObj = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
      
      // Auto-create category if missing
      if (!catObj && category) {
        try {
          const createRes = await api.post('/categories', { name: category });
          catObj = createRes.data;
          setCategories(prev => [...prev, createRes.data]);
        } catch (e) {
          console.error('Failed to auto-create category:', e);
        }
      }

      const foundCategoryId = catObj ? catObj.id : '';

      setNewExpense(prev => ({
        ...prev,
        title: title || prev.title,
        amount: amount ? amount.toString() : prev.amount,
        categoryId: foundCategoryId || prev.categoryId
      }));
      setAiText('');
    } catch (err) {
      console.error('AI Parse error', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/categories', { name: newCategoryName });
      setShowAddCategoryModal(false);
      setNewCategoryName('');
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      await api.put(`/expenses/${editingExpense.id}`, {
        title: editingExpense.title,
        amount: editingExpense.amount,
        date: editingExpense.date,
        categoryId: editingExpense.categoryId
      });
      setShowEditModal(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense({
      ...expense,
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      const query = searchQuery.toLowerCase();
      const catName = ex.category?.name?.toLowerCase() || '';
      const titleName = ex.title?.toLowerCase() || '';
      return catName.includes(query) || titleName.includes(query);
    });
  }, [expenses, searchQuery]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold">Recent Expenses</h2>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 w-full md:w-64 transition-colors"
            />
          </div>

          <button onClick={() => setShowAddCategoryModal(true)} className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
            <Plus size={18} />
            <span className="hidden sm:inline">Add Category</span>
          </button>
          
          <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] whitespace-nowrap">
            <Plus size={18} />
            <span className="hidden sm:inline">Add Expense</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-medium text-gray-300">Expense</th>
                <th className="p-4 font-medium text-gray-300">Date</th>
                <th className="p-4 font-medium text-gray-300">Amount</th>
                <th className="p-4 font-medium text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const isAnomaly = anomalies.some(a => a.id === expense.id);
                return (
                <tr key={expense.id} className={`border-b border-white/5 transition-colors ${isAnomaly ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-white/5'}`}>
                  <td className="p-4 flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isAnomaly ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                      {isAnomaly ? <AlertCircle size={18} /> : <Receipt size={18} />}
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-2">
                        {expense.title}
                        {isAnomaly && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">Unusual</span>}
                      </p>
                      <p className="text-xs text-gray-400">{expense.category?.name || 'Uncategorized'}</p>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">{new Date(expense.date).toLocaleDateString()}</td>
                  <td className="p-4 font-semibold">₹{Number(expense.amount).toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEditModal(expense)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors mr-1">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(expense.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    {searchQuery ? "No matching expenses found." : "No expenses found. Add some!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold mb-6">Add New Expense</h3>
            
            {/* AI Quick Add */}
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                ✨ AI Quick Add
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="e.g. Spent 500 on dinner" 
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiParse()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-primary/50 text-sm"
                />
                <button 
                  type="button"
                  onClick={handleAiParse}
                  disabled={isParsing || !aiText}
                  className="bg-primary/20 hover:bg-primary/40 text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isParsing ? 'Parsing...' : 'Auto-Fill'}
                </button>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title / Description</label>
                <input required type="text" placeholder="e.g. Starbucks Coffee" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Amount (₹)</label>
                  <input required type="number" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Scan Receipt</label>
                  <div className="relative w-full h-[50px] bg-white/5 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="file" accept="image/*" onChange={handleReceiptScan} disabled={isScanning} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {isScanning ? <span className="text-xs text-primary animate-pulse">Scanning...</span> : <Receipt size={20} className="text-gray-400" />}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                <input required type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select required value={newExpense.categoryId} onChange={e => setNewExpense({...newExpense, categoryId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 [&>option]:bg-surface">
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && <p className="text-xs text-red-400 mt-1">Please create a category via API first.</p>}
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl mt-4">Save Expense</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowEditModal(false); setEditingExpense(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold mb-6">Edit Expense</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title / Description</label>
                <input required type="text" value={editingExpense.title} onChange={e => setEditingExpense({...editingExpense, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount (₹)</label>
                <input required type="number" step="0.01" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                <input required type="date" value={editingExpense.date} onChange={e => setEditingExpense({...editingExpense, date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select required value={editingExpense.categoryId} onChange={e => setEditingExpense({...editingExpense, categoryId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50 [&>option]:bg-surface">
                  <option value="">Select Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl mt-4">Update Expense</button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Items Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-lg relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => { setShowBulkAddModal(false); setScannedItems([]); }} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold mb-2">Receipt Breakdown</h3>
            <p className="text-gray-400 text-sm mb-6">We found multiple items on your receipt. Would you like to add them all?</p>
            
            <div className="space-y-3 mb-6">
              {scannedItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <input 
                    type="text" 
                    value={item.title} 
                    onChange={e => {
                      const newItems = [...scannedItems];
                      newItems[idx].title = e.target.value;
                      setScannedItems(newItems);
                    }}
                    className="bg-transparent border-none text-white focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-1/2"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">₹</span>
                    <input 
                      type="number" 
                      value={item.amount} 
                      onChange={e => {
                        const newItems = [...scannedItems];
                        newItems[idx].amount = Number(e.target.value);
                        setScannedItems(newItems);
                      }}
                      className="bg-transparent border-none text-right font-bold text-white focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 w-20"
                    />
                    <button onClick={() => setScannedItems(scannedItems.filter((_, i) => i !== idx))} className="text-red-400 hover:bg-red-400/10 p-1 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => { setShowBulkAddModal(false); setScannedItems([]); }} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 transition-colors">
                Cancel
              </button>
              <button onClick={handleBulkAdd} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-primary/50 transition-all">
                Add All Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-md relative">
            <button onClick={() => setShowAddCategoryModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold mb-6">Create New Category</h3>
            <form onSubmit={handleAddCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category Name</label>
                <input required type="text" placeholder="e.g. Shopping" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl mt-4">Save Category</button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
