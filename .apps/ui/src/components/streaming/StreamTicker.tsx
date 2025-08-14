'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Pin, PinOff, Pause, Play, ChevronRight } from 'lucide-react';

interface TickerEvent {
  id: string;
  eventName: string;
  aggregate: string;
  timestamp: string;
  attributes?: Record<string, any>;
}

interface StreamTickerProps {
  events: TickerEvent[];
  speed?: 'slow' | 'normal' | 'fast' | 'auto';
  position?: 'top' | 'bottom';
  className?: string;
}

const SPEED_MAP = {
  slow: 50,
  normal: 30,
  fast: 15,
  auto: 30
};

const AGGREGATE_COLORS = {
  workflow: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  agent: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
  system: 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400'
};

export function StreamTicker({ 
  events, 
  speed = 'normal',
  position = 'bottom',
  className = '' 
}: StreamTickerProps) {
  const [tickerEvents, setTickerEvents] = useState<TickerEvent[]>([]);
  const [pinnedEvents, setPinnedEvents] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastEventIdRef = useRef<string>('');

  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      if (latestEvent.id !== lastEventIdRef.current) {
        lastEventIdRef.current = latestEvent.id;
        setTickerEvents(prev => [...prev.slice(-20), latestEvent]);
      }
    }
  }, [events]);

  const adjustedSpeed = speed === 'auto' 
    ? Math.max(15, Math.min(50, 30 - (tickerEvents.length - 5) * 2))
    : SPEED_MAP[speed];

  const handlePin = useCallback((eventId: string) => {
    setPinnedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getAggregateStyle = (aggregate: string) => {
    return AGGREGATE_COLORS[aggregate.toLowerCase() as keyof typeof AGGREGATE_COLORS] || AGGREGATE_COLORS.system;
  };

  return (
    <div 
      className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t dark:border-gray-800 ${className}`}
    >
      <div className="relative h-12 flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10" />
        
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="absolute left-2 z-20 p-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title={isPaused ? "Resume ticker" : "Pause ticker"}
        >
          {isPaused ? (
            <Play className="w-3 h-3 text-gray-600 dark:text-gray-400" />
          ) : (
            <Pause className="w-3 h-3 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        <div 
          ref={tickerRef}
          className="flex-1 overflow-hidden px-20"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div 
            ref={scrollRef}
            className="flex items-center space-x-3 h-full"
            style={{
              animation: isPaused ? 'none' : `scroll ${adjustedSpeed}s linear infinite`,
            }}
          >
            {tickerEvents.map((event, index) => (
              <motion.div
                key={`${event.id}-${index}`}
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className={`flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 rounded-md border ${getAggregateStyle(event.aggregate)} ${hoveredEvent === event.id ? 'ring-2 ring-offset-1 ring-blue-400' : ''} ${pinnedEvents.has(event.id) ? 'shadow-lg' : ''} cursor-pointer transition-all duration-200`}
                onMouseEnter={() => setHoveredEvent(event.id)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => handlePin(event.id)}
              >
                <ChevronRight className="w-3 h-3 opacity-50" />
                <span className="text-xs font-mono font-medium">
                  {event.eventName}
                </span>
                <div className="flex items-center space-x-1 text-[10px] opacity-60">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(event.timestamp)}</span>
                </div>
                {pinnedEvents.has(event.id) && (
                  <Pin className="w-3 h-3 text-blue-500" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10" />
        
        <div className="absolute right-2 z-20 flex items-center space-x-1">
          <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 px-2">
            {tickerEvents.length} events
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pinnedEvents.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
          >
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Pinned Events ({pinnedEvents.size})
                </span>
                <button
                  onClick={() => setPinnedEvents(new Set())}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tickerEvents
                  .filter(e => pinnedEvents.has(e.id))
                  .map(event => (
                    <div
                      key={event.id}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md border ${getAggregateStyle(event.aggregate)}`}
                    >
                      <span className="text-xs font-mono">
                        {event.eventName}
                      </span>
                      <button
                        onClick={() => handlePin(event.id)}
                        className="ml-2 hover:text-red-500"
                      >
                        <PinOff className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}