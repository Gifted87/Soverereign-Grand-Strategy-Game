import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'danger' | 'purple' | 'success' | 'warning' | 'default';
  pulse?: boolean;
}

export function Badge({ children, variant = 'default', pulse = false }: BadgeProps) {
  const styles = {
    danger: 'bg-rose-950/40 text-rose-400 border-rose-900/40',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-500/20',
    success: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40',
    warning: 'bg-amber-950/40 text-amber-400 border-amber-900/40',
    default: 'bg-stone/20 text-stone-light border-stone/30'
  };

  return (
    <span className={`text-[8px] font-sans px-1.5 py-0.5 border rounded-md font-bold uppercase ${styles[variant]} ${pulse ? 'animate-pulse' : ''}`}>
      {children}
    </span>
  );
}
