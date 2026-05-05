import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, Users, UserCheck, UserX, X, Check } from 'lucide-react';
import api from '../api';

interface UserResult { id: string; name: string; email: string; }
interface FriendRequest { id: string; sender?: UserResult; receiver?: UserResult; status: string; }

export default function Friends() {
  const [friends, setFriends] = useState<UserResult[]>([]);
  const [requests, setRequests] = useState<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>({ incoming: [], outgoing: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const fetchFriends = async () => {
    const res = await api.get('/friends/list');
    setFriends(res.data);
  };

  const fetchRequests = async () => {
    const res = await api.get('/friends/requests');
    setRequests(res.data);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const res = await api.get(`/users/search?q=${searchQuery}`);
    setSearchResults(res.data);
  };

  const sendRequest = async (receiverId: string) => {
    try {
      await api.post('/friends/request', { receiverId });
      fetchRequests();
      setSearchResults(prev => prev.filter(u => u.id !== receiverId));
      alert('Friend request sent!');
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Could not send request');
    }
  };

  const acceptRequest = async (requestId: string) => {
    await api.post('/friends/accept', { requestId });
    fetchFriends();
    fetchRequests();
  };

  const rejectRequest = async (requestId: string) => {
    await api.post('/friends/reject', { requestId });
    fetchRequests();
  };

  const cancelRequest = async (requestId: string) => {
    await api.post('/friends/cancel', { requestId });
    fetchRequests();
  };

  const removeFriend = async (friendId: string) => {
    if (!confirm('Remove this friend?')) return;
    await api.delete('/friends/remove', { data: { friendId } });
    fetchFriends();
  };

  const pendingCount = requests.incoming.length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Users className="text-primary" size={36} />
          Friends
        </h1>
        <p className="text-gray-400 mt-2">Manage your connections and friend requests.</p>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus size={20} className="text-primary" /> Find People</h3>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-xl font-medium transition-all"
          >
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-4">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-gray-400 break-all">{u.email}</p>
                </div>
                <button
                  onClick={() => sendRequest(u.id)}
                  className="flex items-center gap-1.5 text-sm bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/30 transition-colors"
                >
                  <UserPlus size={15} /> Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all ${activeTab === 'friends' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
        >
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-5 py-3 text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
        >
          Requests
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* Friends List */}
      {activeTab === 'friends' && (
        <div className="glass-card p-6">
          {friends.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No friends yet. Search and add some!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friends.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] flex-shrink-0">
                      <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-sm font-bold">
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">{f.name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{f.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFriend(f.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove friend"
                  >
                    <UserX size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <UserCheck size={20} className="text-green-400" /> Incoming Requests ({requests.incoming.length})
            </h3>
            {requests.incoming.length === 0 ? (
              <p className="text-gray-500 text-sm">No incoming requests</p>
            ) : (
              <div className="space-y-3">
                {requests.incoming.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-400 to-teal-500 p-[2px]">
                        <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-sm font-bold">
                          {r.sender?.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{r.sender?.name}</p>
                        <p className="text-xs text-gray-400">{r.sender?.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptRequest(r.id)}
                        className="flex items-center gap-1 text-sm bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-2 rounded-xl hover:bg-green-500/30"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => rejectRequest(r.id)}
                        className="flex items-center gap-1 text-sm bg-white/5 text-gray-400 border border-white/10 px-3 py-2 rounded-xl hover:bg-red-500/10 hover:text-red-400"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg mb-4 text-gray-300">Sent Requests ({requests.outgoing.length})</h3>
            {requests.outgoing.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending sent requests</p>
            ) : (
              <div className="space-y-3">
                {requests.outgoing.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-500 to-gray-600 p-[2px]">
                        <div className="w-full h-full bg-surface rounded-full flex items-center justify-center text-sm font-bold">
                          {r.receiver?.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{r.receiver?.name}</p>
                        <p className="text-xs text-gray-400">{r.receiver?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full">Pending</span>
                      <button
                        onClick={() => cancelRequest(r.id)}
                        className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                        title="Cancel request"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
