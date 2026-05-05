import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Home, PieChart, Activity, User, LogOut, BrainCircuit, Users, UserCheck } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Landing from './pages/Landing';
import Analytics from './pages/Analytics';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import NotificationBell from './components/NotificationBell';
import { useAuth } from './context/AuthContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const navLinks = [
    { to: '/dashboard', icon: <Home size={20} />, label: 'Home' },
    { to: '/expenses', icon: <Activity size={20} />, label: 'Expenses' },
    { to: '/analytics', icon: <PieChart size={20} />, label: 'Analytics' },
    { to: '/groups', icon: <Users size={20} />, label: 'Groups' },
    { to: '/friends', icon: <UserCheck size={20} />, label: 'Friends' },
    { to: '/profile', icon: <User size={20} />, label: 'Profile' },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden font-sans text-white">
      <main className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden pb-20 md:pb-0">

        {/* ── Top Navbar ── */}
        <header className="h-16 md:h-20 glass border-b border-white/10 sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">

          {/* Left: Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <BrainCircuit className="text-primary" size={20} />
            </div>
            <span className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              AIFinance
            </span>
          </Link>

          {/* Center: Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ to, icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive(to)
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {icon}
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Notification Bell + Avatar + Logout */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <NotificationBell />
            <Link
              to="/profile"
              className="flex items-center gap-2 hover:bg-white/5 px-2 py-1.5 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] flex-shrink-0">
                <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <span className="text-sm font-medium hidden lg:block max-w-[100px] truncate">
                {user.name}
              </span>
            </Link>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-400 transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* ── Page Content ── */}
        <div className="px-4 py-5 md:px-8 md:py-8 relative z-0 flex-1">
          <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none -z-10 animate-float" />
          <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full mix-blend-screen filter blur-[100px] opacity-30 pointer-events-none -z-10 animate-float" style={{ animationDelay: '2s' }} />

          <Routes>
            <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/expenses"   element={<PrivateRoute><Expenses /></PrivateRoute>} />
            <Route path="/analytics"  element={<PrivateRoute><Analytics /></PrivateRoute>} />
            <Route path="/groups"     element={<PrivateRoute><Groups /></PrivateRoute>} />
            <Route path="/groups/:id" element={<PrivateRoute><GroupDetails /></PrivateRoute>} />
            <Route path="/friends"    element={<PrivateRoute><Friends /></PrivateRoute>} />
            <Route path="/profile"    element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
            <Route path="*"           element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 flex justify-around items-center py-2 px-1">
        {navLinks.map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${
              isActive(to)
                ? 'text-primary bg-primary/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {icon}
            <span className="text-[9px] font-medium leading-none">{label}</span>
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-gray-400 hover:text-red-400 transition-all"
        >
          <LogOut size={20} />
          <span className="text-[9px] font-medium leading-none">Logout</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
