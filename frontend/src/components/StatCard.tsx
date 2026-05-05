import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  delay?: number;
}

export default function StatCard({ title, value, icon, trend, delay = 0 }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-6 relative overflow-hidden group cursor-pointer"
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-primary">
          {icon}
        </div>
        {trend && (
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${trend.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {trend.isPositive ? '+' : '-'}{trend.value}
          </span>
        )}
      </div>
      
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <h2 className="text-3xl font-bold text-white tracking-tight">{value}</h2>
      </div>
    </motion.div>
  );
}
