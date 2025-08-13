'use client';

import { AppBar } from './AppBar';
import { ReactNode } from 'react';

/**
 * Client-side layout wrapper that includes app bar
 */
export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppBar />
      <main>
        {children}
      </main>
    </>
  );
}