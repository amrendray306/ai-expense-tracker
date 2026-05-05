import { motion } from 'framer-motion';
import { BrainCircuit, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
import { useState } from 'react';
import AuthModal from '../components/AuthModal';

export default function Landing() {
  const [authModal, setAuthModal] = useState<{isOpen: boolean, mode: 'login'|'register'}>({ isOpen: false, mode: 'login' });
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8 } }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden selection:bg-primary/30">
      


      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <BrainCircuit className="text-primary" size={24} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              AIFinance
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setAuthModal({ isOpen: true, mode: 'login' })} className="text-gray-300 hover:text-white transition-colors font-medium">
              Log in
            </button>
            <button onClick={() => setAuthModal({ isOpen: true, mode: 'register' })} className="bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]">
              Sign up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-sm font-medium text-blue-200">Powered by Machine Learning</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Master your wealth with <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                AI Precision.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Stop guessing where your money goes. Our intelligent platform analyzes your spending habits, detects anomalies, and forecasts your financial future automatically.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => setAuthModal({ isOpen: true, mode: 'register' })} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95">
                Start Tracking Free
                <ArrowRight size={20} />
              </button>
              <button onClick={() => setAuthModal({ isOpen: true, mode: 'login' })} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                Sign in to Account
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 bg-black/40 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need, none of the clutter.</h2>
            <p className="text-gray-400 text-lg">Designed for speed, clarity, and actionable insights.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/[0.07] transition-colors group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <BrainCircuit size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Predictions</h3>
              <p className="text-gray-400 leading-relaxed">
                Our machine learning models forecast your next 60 days of spending based on your historical patterns.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/[0.07] transition-colors group">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Anomaly Detection</h3>
              <p className="text-gray-400 leading-relaxed">
                Get instantly notified if you make an unusual purchase or if a subscription price spikes unexpectedly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/[0.07] transition-colors group">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Wallet size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Budgets</h3>
              <p className="text-gray-400 leading-relaxed">
                Set monthly limits and receive automated SMS & Email alerts before you accidentally overspend.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <BrainCircuit className="text-gray-400" size={20} />
            <span className="font-semibold text-gray-400">AIFinance</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 AI Expense Tracker. Built for speed and accuracy.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={authModal.isOpen} 
        onClose={() => setAuthModal({ ...authModal, isOpen: false })} 
        initialMode={authModal.mode} 
      />
    </div>
  );
}
