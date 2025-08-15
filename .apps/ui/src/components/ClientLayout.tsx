'use client';

import { AppBar } from './AppBar';
import { ReactNode } from 'react';

/**
 * Client-side layout wrapper that includes app bar
 */
export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <AppBar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}