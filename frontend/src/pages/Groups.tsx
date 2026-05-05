import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    try {
      await api.post('/groups', { name: newGroupName });
      setShowAddModal(false);
      setNewGroupName('');
      fetchGroups();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Users className="text-primary" size={32} />
            Shared Groups
          </h2>
          <p className="text-gray-400 mt-1">Split bills and track shared expenses seamlessly.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Create Group</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {groups.map(group => (
          <Link to={`/groups/${group.id}`} key={group.id}>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="glass-card p-6 h-full flex flex-col cursor-pointer border border-white/5 hover:border-primary/30 transition-all"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{group.name}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
              </p>
              
              <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex -space-x-2">
                  {group.members.slice(0, 3).map((m: any) => (
                    <div key={m.id} className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
                      <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-xs font-bold">
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  ))}
                  {group.members.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-xs text-gray-400">
                      +{group.members.length - 3}
                    </div>
                  )}
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-primary transition-colors" size={20} />
              </div>
            </motion.div>
          </Link>
        ))}

        {groups.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
            <Users size={48} className="text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No groups yet</h3>
            <p className="text-gray-400 text-center max-w-md">Create a group to start splitting bills with friends, family, or roommates.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card p-6 w-full max-w-md relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold mb-6">Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Group Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Goa Trip, Apartment, etc." 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50" 
                />
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl mt-4">
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
