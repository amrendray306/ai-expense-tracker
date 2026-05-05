import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import api from '../api';

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcon: Record<string, string> = {
  FRIEND_REQUEST: '👋',
  FRIEND_ACCEPTED: '🤝',
  EXPENSE_ADDED: '💸',
  ANOMALY: '⚠️',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const { socket } = useSocket();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handler = (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      
      // Show toast for budget alerts or anomalies
      if (notif.type === 'budget_alert' || notif.type === 'ANOMALY') {
        setToast({ message: notif.message, type: notif.type });
        setTimeout(() => setToast(null), 5000);
      }
    };
    socket.on('notification', handler);
    return () => { socket.off('notification', handler); };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const markOne = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAll = async () => {
    await api.patch('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 hover:bg-white/10 rounded-xl transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-primary' : 'text-gray-400'} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 md:w-96 bg-[#121212] border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-lg text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAll} className="text-xs text-primary hover:text-white flex items-center gap-1 font-semibold">
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-white/10">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Bell size={32} className="mx-auto mb-3 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 px-5 py-4 hover:bg-white/10 transition-colors cursor-pointer ${!n.isRead ? 'bg-primary/20 border-l-4 border-l-primary' : ''}`}
                    onClick={() => !n.isRead && markOne(n.id)}
                  >
                    <span className="text-2xl flex-shrink-0 mt-0.5">{typeIcon[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.isRead ? 'text-white font-bold' : 'text-gray-300'}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)] flex-shrink-0 mt-1.5" />
                    )}
                    {n.isRead && (
                      <Check size={14} className="text-gray-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[100] bg-[#1a1a1a] p-5 border-l-4 border-l-red-500 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-xl flex items-center gap-4 max-w-sm border border-white/10"
          >
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-red-500/20">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white uppercase tracking-tight">Alert Detected</p>
              <p className="text-xs text-gray-300 mt-1 font-medium leading-relaxed">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white p-1">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
