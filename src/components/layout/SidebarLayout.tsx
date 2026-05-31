import React from 'react';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {children}
    </div>
  );
}
