import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserPlus, Receipt, CheckCircle, X, Search, BarChart3, Users, DollarSign, Wallet, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'activity' | 'balances' | 'analytics'>('activity');
  const [groupAnalytics, setGroupAnalytics] = useState<any>(null);
  
  // Modals
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  // Forms
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', paidById: user?.id || '' });
  const [newSettlement, setNewSettlement] = useState({ paidById: user?.id || '', paidToId: '', amount: '' });

  useEffect(() => {
    fetchGroupData();
    fetchBalances();
    fetchAnalytics();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      setGroup(res.data);
    } catch (err) {
      console.error(err);
      navigate('/groups');
    }
  };

  const fetchBalances = async () => {
    try {
      const res = await api.get(`/groups/${id}/balances`);
      setBalances(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get(`/groups/${id}/analytics`);
      setGroupAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery) return;
    try {
      const res = await api.get(`/users/search?q=${searchQuery}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (userIdToAdd: string) => {
    try {
      await api.post(`/groups/${id}/members`, { userIdToAdd });
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchGroupData();
    } catch (err) {
      console.error(err);
      alert('Failed to add member or already in group.');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shared-expenses', {
        groupId: id,
        title: newExpense.title,
        amount: Number(newExpense.amount),
        paidById: newExpense.paidById
      });
      setShowAddExpense(false);
      setNewExpense({ title: '', amount: '', paidById: user?.id || '' });
      fetchGroupData();
      fetchBalances();
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSettleUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shared-expenses/settle', {
        groupId: id,
        paidById: newSettlement.paidById,
        paidToId: newSettlement.paidToId,
        amount: Number(newSettlement.amount)
      });
      setShowSettleUp(false);
      setNewSettlement({ paidById: user?.id || '', paidToId: '', amount: '' });
      fetchGroupData();
      fetchBalances();
      fetchAnalytics();
    } catch (err) {
      console.error(err);
    }
  };

  const generateUPILink = (amount: number, receiverName: string) => {
    // Mock UPI Link (standard format)
    const mockVPA = receiverName.toLowerCase().replace(/\s+/g, '') + '@upi';
    return `upi://pay?pa=${mockVPA}&pn=${encodeURIComponent(receiverName)}&am=${amount}&cu=INR`;
  };

  if (!group) return <div className="text-center py-20">Loading...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/groups')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-bold">{group.name}</h2>
            <p className="text-gray-400 text-sm">{group.members.length} members • Created {new Date(group.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <button onClick={() => setShowAddMember(true)} className="glass px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/5 transition-colors border border-white/10 text-gray-300">
          <UserPlus size={18} />
          Invite
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl w-fit border border-white/5">
        {[
          { id: 'activity', icon: <Receipt size={18} />, label: 'Activity' },
          { id: 'balances', icon: <Users size={18} />, label: 'Balances' },
          { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Analytics' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column (Balances Summary) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border-l-4 border-l-primary">
            <h4 className="text-gray-400 text-xs uppercase tracking-widest mb-2">Group Total</h4>
            <p className="text-3xl font-bold text-white">₹{groupAnalytics?.totalSpend.toFixed(0) || '0'}</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Users size={16} className="text-primary" /> Members
              </h3>
            </div>
            <div className="space-y-4">
              {group.members.map((m: any) => {
                const bal = balances[m.userId] || 0;
                return (
                  <div key={m.id} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-300">{m.user.name}</span>
                      <span className={`text-xs font-bold ${bal > 0 ? 'text-green-400' : bal < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                        {bal > 0 ? `+₹${bal.toFixed(0)}` : bal < 0 ? `-₹${Math.abs(bal).toFixed(0)}` : 'Settled'}
                      </span>
                    </div>
                    {bal < 0 && m.userId === user?.id && (
                      <a 
                        href={generateUPILink(Math.abs(bal), "Group Settlement")}
                        className="text-[10px] bg-green-500/10 text-green-400 py-1 px-2 rounded mt-1 flex items-center gap-1 w-fit hover:bg-green-500/20"
                      >
                        <Wallet size={10} /> Pay via UPI
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Dynamic Content based on Tabs) */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6 min-h-[60vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold">Activity Feed</h3>
                  <button onClick={() => setShowAddExpense(true)} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <Plus size={16} /> New Expense
                  </button>
                </div>
                
                <div className="space-y-4">
                  {[
                    ...group.sharedExpenses.map((e: any) => ({ ...e, type: 'expense' })),
                    ...group.settlements.map((s: any) => ({ ...s, type: 'settlement' }))
                  ]
                  .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'expense' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                          {item.type === 'expense' ? <Receipt size={20} /> : <CheckCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-semibold">{item.type === 'expense' ? item.title : 'Settlement'}</p>
                          <p className="text-xs text-gray-400">
                            {item.paidBy.id === user?.id ? 'You' : item.paidBy.name} {item.type === 'expense' ? `paid ₹${item.amount.toFixed(0)}` : `paid ${item.paidTo.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${item.type === 'settlement' ? 'text-green-400' : ''}`}>₹{item.amount.toFixed(0)}</p>
                        <p className="text-[10px] text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'balances' && (
              <motion.div
                key="balances"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6 min-h-[60vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold">Debt Settlement</h3>
                  <button onClick={() => setShowSettleUp(true)} className="bg-green-500 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <CheckCircle size={16} /> Record Payment
                  </button>
                </div>
                
                <div className="space-y-6">
                  {group.members.filter((m: any) => (balances[m.userId] || 0) < 0).map((m: any) => (
                    <div key={m.userId} className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold">
                          {m.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white">{m.user.name} owes ₹{Math.abs(balances[m.userId]).toFixed(0)}</p>
                          <p className="text-xs text-gray-400">Needs to settle up with group members</p>
                        </div>
                      </div>
                      {m.userId === user?.id && (
                        <button 
                          onClick={() => {
                            setNewSettlement({...newSettlement, amount: Math.abs(balances[m.userId]).toString()});
                            setShowSettleUp(true);
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Settle Now
                        </button>
                      )}
                    </div>
                  ))}
                  {Object.values(balances).every(b => b === 0) && (
                    <div className="text-center py-20 flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 mb-4">
                        <CheckCircle size={32} />
                      </div>
                      <p className="text-gray-300 font-bold">Everyone is settled up!</p>
                      <p className="text-gray-500 text-sm mt-1">No outstanding debts in this group.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6 min-h-[60vh]"
              >
                <h3 className="text-xl font-bold mb-8">Group Analytics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <DollarSign className="text-green-400" size={20} />
                      <h4 className="font-semibold text-gray-300">Total Spent</h4>
                    </div>
                    <p className="text-4xl font-bold text-white">₹{groupAnalytics?.totalSpend.toFixed(0)}</p>
                    <p className="text-sm text-gray-500 mt-2">Across {groupAnalytics?.expenseCount} expenses</p>
                  </div>
                  
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="text-blue-400" size={20} />
                      <h4 className="font-semibold text-gray-300">Top Spender</h4>
                    </div>
                    <p className="text-4xl font-bold text-white">{groupAnalytics?.topSpender?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500 mt-2">Spent ₹{groupAnalytics?.topSpender?.amount.toFixed(0)}</p>
                  </div>
                </div>

                <h4 className="font-bold mb-4 text-sm text-gray-400 uppercase tracking-widest">Spending Breakdown</h4>
                <div className="space-y-4">
                  {groupAnalytics?.memberSpend.map((m: any, idx: number) => {
                    const percent = (m.amount / groupAnalytics.totalSpend) * 100;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">{m.name}</span>
                          <span className="font-bold">₹{m.amount.toFixed(0)} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODALS - Same as before but styled better */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-8 w-full max-w-md relative border border-white/10">
            <button onClick={() => setShowAddMember(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-bold mb-6">Invite Member</h3>
            <div className="flex gap-2 mb-6">
              <input type="text" placeholder="Search name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors" />
              <button onClick={handleSearchUsers} className="bg-primary p-3 rounded-xl hover:bg-primary/90 text-white transition-all"><Search size={20} /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {searchResults.map(u => (
                <div key={u.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <button onClick={() => handleAddMember(u.id)} className="text-xs bg-primary/20 text-primary px-4 py-2 rounded-lg hover:bg-primary/30 font-bold">Invite</button>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && <p className="text-center text-gray-500 py-4">No users found.</p>}
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-8 w-full max-w-md relative border border-white/10">
            <button onClick={() => setShowAddExpense(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-bold mb-6">Shared Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Description</label>
                <input required type="text" placeholder="e.g. Dinner at Marriott" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Amount (₹)</label>
                <input required type="number" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Paid By</label>
                <select required value={newExpense.paidById} onChange={e => setNewExpense({...newExpense, paidById: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary outline-none transition-colors appearance-none [&>option]:bg-[#1a1a1a]">
                  {group.members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>{m.user.id === user?.id ? 'You' : m.user.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 italic text-center">Split equally among {group.members.length} people</p>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl mt-4 shadow-lg transition-all">Save Expense</button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card p-8 w-full max-w-md relative border border-white/10">
            <button onClick={() => setShowSettleUp(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-bold mb-6">Settle Up</h3>
            <form onSubmit={handleSettleUp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Who paid?</label>
                <select required value={newSettlement.paidById} onChange={e => setNewSettlement({...newSettlement, paidById: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary outline-none appearance-none [&>option]:bg-[#1a1a1a]">
                  {group.members.map((m: any) => (
                    <option key={m.userId} value={m.userId}>{m.user.id === user?.id ? 'You' : m.user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Who received?</label>
                <select required value={newSettlement.paidToId} onChange={e => setNewSettlement({...newSettlement, paidToId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary outline-none appearance-none [&>option]:bg-[#1a1a1a]">
                  <option value="">Select recipient</option>
                  {group.members.filter((m: any) => m.userId !== newSettlement.paidById).map((m: any) => (
                    <option key={m.userId} value={m.userId}>{m.user.id === user?.id ? 'You' : m.user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Amount (₹)</label>
                <input required type="number" step="0.01" value={newSettlement.amount} onChange={e => setNewSettlement({...newSettlement, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-primary outline-none transition-colors" />
              </div>
              <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl mt-4 shadow-lg transition-all">Confirm Payment</button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
