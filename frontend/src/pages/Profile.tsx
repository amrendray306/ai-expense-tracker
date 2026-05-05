import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, Save, X, Edit2, Activity, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Profile() {
  const { updateUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      setProfileData(res.data);
      setFormData({ name: res.data.name || '', phone: res.data.phone || '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put('/users/profile', formData);
      setProfileData({ ...profileData, ...res.data });
      updateUser({ name: res.data.name, phone: res.data.phone });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    }
  };

  if (!profileData) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading profile...</p>
      </div>
    </div>
  );

  const initials = profileData.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <User className="text-primary" size={36} />
            My Profile
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Manage your personal information and preferences.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <Edit2 size={18} /> Edit Profile
          </button>
        )}
      </div>

      {/* Hero Card */}
      <div className="glass-card p-8 md:p-12">
        <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-tr from-primary to-accent p-1 shadow-[0_0_40px_rgba(59,130,246,0.4)]">
              <div className="w-full h-full bg-surface rounded-2xl flex items-center justify-center">
                <span className="text-4xl md:text-5xl font-extrabold text-white/90">{initials}</span>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3 truncate">{profileData.name}</h2>

            {/* Email — min-w-0 + truncate to prevent overflow */}
            <div className="flex items-center gap-2 text-gray-300 mb-2 min-w-0">
              <Mail size={18} className="flex-shrink-0 text-primary" />
              <span className="truncate text-base md:text-lg">{profileData.email}</span>
            </div>

            {profileData.phone && (
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <Phone size={18} className="flex-shrink-0 text-primary" />
                <span className="text-base md:text-lg">{profileData.phone}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-400 mt-1">
              <Calendar size={16} className="flex-shrink-0" />
              <span className="text-sm">Member since {new Date(profileData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
            </div>

            {/* Verification Badge */}
            <div className="flex items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-full">
                <ShieldCheck size={14} /> Verified Account
              </span>
            </div>
          </div>

          {/* Quick Stats inline on large screens */}
          <div className="hidden lg:flex flex-col gap-4 flex-shrink-0">
            <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-6 min-w-[130px]">
              <p className="text-4xl font-extrabold text-primary">{profileData._count?.expenses || 0}</p>
              <p className="text-sm text-gray-400 mt-1">Expenses</p>
            </div>
            <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-6 min-w-[130px]">
              <p className="text-4xl font-extrabold text-purple-400">{profileData._count?.groupMemberships || 0}</p>
              <p className="text-sm text-gray-400 mt-1">Groups</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Details / Edit Card */}
        <div className="lg:col-span-2 glass-card p-8">
          <h3 className="text-2xl font-bold mb-8 border-b border-white/10 pb-4">Account Details</h3>

          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Phone Number <span className="text-gray-500 font-normal">(optional)</span></label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 99999 99999"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                >
                  <Save size={20} /> Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setFormData({ name: profileData.name, phone: profileData.phone || '' }); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <X size={20} /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Full Name</p>
                <p className="text-xl font-semibold">{profileData.name}</p>
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Email Address</p>
                {/* overflow-hidden + break-all ensures long emails wrap properly */}
                <p className="text-xl font-semibold break-all">{profileData.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Phone Number</p>
                <p className="text-xl font-semibold">{profileData.phone || <span className="text-gray-500 text-base font-normal">Not provided</span>}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Account Created</p>
                <p className="text-xl font-semibold">{new Date(profileData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Activity */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="text-primary" size={22} /> Activity
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                <span className="text-gray-300">Expenses Logged</span>
                <span className="text-2xl font-extrabold text-primary">{profileData._count?.expenses || 0}</span>
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                <span className="text-gray-300">Shared Groups</span>
                <span className="text-2xl font-extrabold text-purple-400">{profileData._count?.groupMemberships || 0}</span>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Users className="text-primary" size={22} /> Budget
            </h3>
            <div className="text-center bg-white/5 rounded-xl p-6 border border-white/5">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Monthly Budget</p>
              <p className="text-3xl font-extrabold text-green-400">
                {profileData.monthlyBudget ? `₹${profileData.monthlyBudget.toLocaleString()}` : '—'}
              </p>
              {!profileData.monthlyBudget && (
                <p className="text-xs text-gray-500 mt-2">Set from the Dashboard</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
