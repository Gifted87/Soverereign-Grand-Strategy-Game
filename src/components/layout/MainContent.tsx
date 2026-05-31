import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  return (
    <div className="flex-1 relative bg-[#141310] flex flex-col">
      {children}
    </div>
  );
}
