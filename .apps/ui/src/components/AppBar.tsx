'use client';

import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';

/**
 * Application bar component with navigation and branding
 */
export function AppBar() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6">
        <div className="flex items-center space-x-2">
          <Image
            src="/gold-grizzly-avatar.png"
            alt="Gold Grizzly"
            width={32}
            height={32}
            className="rounded-sm p-1"
          />
          <span className="hidden font-bold sm:inline-block">
            Gold Grizzly
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-muted-foreground">
            Event Telemetry Dashboard
          </span>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}