'use client';

import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';

/**
 * Application bar component with navigation and branding
 */
export function AppBar() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <div className="mr-6 flex items-center space-x-2">
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
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <span className="text-sm text-muted-foreground">
              Event Telemetry Dashboard
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}