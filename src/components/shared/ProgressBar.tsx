import React from 'react';

interface ProgressBarProps {
  progress: number;
  variant?: 'danger' | 'purple' | 'gold' | 'default';
  size?: 'sm' | 'md';
}

export function ProgressBar({ progress, variant = 'default', size = 'sm' }: ProgressBarProps) {
  const barColors = {
    danger: 'bg-rose-600',
    purple: 'bg-purple-500',
    gold: 'bg-accent',
    default: 'bg-stone-light'
  };

  const heights = {
    sm: 'h-1',
    md: 'h-1.5'
  };

  return (
    <div className={`w-full bg-panel border border-stone/10 ${heights[size]} rounded-full overflow-hidden`}>
      <div 
        className={`${barColors[variant]} h-full transition-all duration-300 rounded-full`} 
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}
