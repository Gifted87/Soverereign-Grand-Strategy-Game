import React from 'react';

interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeader({ children, className = '' }: SectionHeaderProps) {
  return (
    <div className={`text-xs text-stone-light uppercase tracking-widest border-b border-stone/30 pb-1 mb-2 mt-4 font-sans ${className}`}>
      {children}
    </div>
  );
}
