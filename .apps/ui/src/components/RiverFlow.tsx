'use client';

import { motion } from 'framer-motion';

interface RiverFlowProps {
  isActive?: boolean;
  className?: string;
}

/**
 * Animated river background for the EventRiver2D
 */
export function RiverFlow({ isActive = true, className = '' }: RiverFlowProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Main river gradient */}
      <div className="absolute left-4 top-0 w-1 h-full bg-gradient-to-b from-cyan-300 via-blue-400 to-indigo-500 opacity-60" />
      
      {/* Flowing particles */}
      {isActive && (
        <>
          {/* Primary flow particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute left-3.5 w-2 h-2 rounded-full bg-cyan-300 opacity-70 animate-river-flow"
              style={{
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            />
          ))}

          {/* Secondary flow particles */}
          {[...Array(5)].map((_, i) => (
            <div
              key={`secondary-${i}`}
              className="absolute left-3 w-1 h-3 rounded-full bg-blue-400 opacity-50 animate-river-flow"
              style={{
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${4 + Math.random() * 3}s`,
              }}
            />
          ))}

          {/* Sparkle effects */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute w-1 h-1 rounded-full bg-white animate-sparkle"
              style={{
                left: `${16 + Math.random() * 8}px`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </>
      )}

      {/* Glow effects */}
      <div className="absolute left-2 top-0 w-6 h-full bg-gradient-to-b from-cyan-200/20 via-blue-300/20 to-indigo-400/20 blur-sm" />
      <div className="absolute left-1 top-0 w-8 h-full bg-gradient-to-b from-cyan-100/10 via-blue-200/10 to-indigo-300/10 blur-md" />

      {/* Pulsing heartbeat effect at top */}
      <div className="absolute left-1 top-4 w-8 h-8 rounded-full bg-gradient-radial from-cyan-300/40 to-transparent animate-heartbeat" />
    </div>
  );
}