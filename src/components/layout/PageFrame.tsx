import React from 'react';

interface PageFrameProps {
  children: React.ReactNode;
}

export function PageFrame({ children }: PageFrameProps) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ink text-parchment font-body select-none border-[12px] border-ink-light">
      {children}
    </div>
  );
}
