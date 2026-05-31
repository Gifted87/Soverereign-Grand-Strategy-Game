import { ReactNode } from 'react';

export function GameProvider({ children }: { children: ReactNode }) {
  // Game instance context logic could go here
  return <>{children}</>;
}
