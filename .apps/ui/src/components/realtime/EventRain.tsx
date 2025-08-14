'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FallingEvent {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  speed: number;
  opacity: number;
  aggregate: 'workflow' | 'agent' | 'system';
  timestamp: number;
}

interface EventRainProps {
  events: Array<{
    id: string;
    eventName: string;
    aggregate: string;
    timestamp: string;
  }>;
  active?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

const AGGREGATE_COLORS = {
  workflow: '#3B82F6',
  agent: '#8B5CF6',
  system: '#6B7280'
};

const SPEED_MULTIPLIERS = {
  low: 0.5,
  medium: 1,
  high: 2
};

export function EventRain({ 
  events, 
  active = true, 
  intensity = 'medium',
  className = '' 
}: EventRainProps) {
  const [fallingEvents, setFallingEvents] = useState<FallingEvent[]>([]);
  const [frozenEvent, setFrozenEvent] = useState<FallingEvent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastEventIdRef = useRef<string>('');

  const createFallingEvent = useCallback((event: EventRainProps['events'][0]) => {
    const container = containerRef.current;
    if (!container) return null;

    const { width } = container.getBoundingClientRect();
    const aggregate = event.aggregate.toLowerCase() as 'workflow' | 'agent' | 'system';

    return {
      id: event.id,
      x: Math.random() * width,
      y: -20,
      text: event.eventName,
      color: AGGREGATE_COLORS[aggregate] || AGGREGATE_COLORS.system,
      speed: (1 + Math.random() * 2) * SPEED_MULTIPLIERS[intensity],
      opacity: 0.3 + Math.random() * 0.5,
      aggregate,
      timestamp: Date.now()
    };
  }, [intensity]);

  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      if (latestEvent.id !== lastEventIdRef.current) {
        lastEventIdRef.current = latestEvent.id;
        const newFallingEvent = createFallingEvent(latestEvent);
        if (newFallingEvent) {
          setFallingEvents(prev => [...prev.slice(-50), newFallingEvent]);
        }
      }
    }
  }, [events, createFallingEvent]);

  useEffect(() => {
    if (!active) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = () => {
      const container = containerRef.current;
      if (!container) return;

      const { height } = container.getBoundingClientRect();

      setFallingEvents(prev => {
        return prev
          .map(event => ({
            ...event,
            y: event.y + event.speed,
            opacity: event.opacity * (1 - (event.y / height) * 0.3)
          }))
          .filter(event => event.y < height && event.opacity > 0.05);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active]);

  const handleEventClick = (event: FallingEvent) => {
    setFrozenEvent(event);
    setTimeout(() => setFrozenEvent(null), 3000);
  };

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10 dark:via-black/20 dark:to-black/40" />
      
      {fallingEvents.map(event => (
        <motion.div
          key={`${event.id}-${event.timestamp}`}
          className="absolute pointer-events-auto cursor-pointer select-none"
          style={{
            left: event.x,
            top: event.y,
            color: event.color,
            opacity: event.opacity,
            fontSize: '10px',
            fontFamily: 'monospace',
            textShadow: `0 0 10px ${event.color}`,
            transform: 'translateX(-50%)',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed'
          }}
          onClick={() => handleEventClick(event)}
          whileHover={{ scale: 1.5, opacity: 1 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: event.opacity }}
        >
          {event.text.substring(0, 20)}
        </motion.div>
      ))}

      <AnimatePresence>
        {frozenEvent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                       bg-black/90 dark:bg-white/90 text-white dark:text-black 
                       px-4 py-3 rounded-lg shadow-2xl pointer-events-auto z-50
                       border border-white/20 dark:border-black/20"
            style={{ 
              boxShadow: `0 0 30px ${frozenEvent.color}`,
            }}
          >
            <div className="text-xs font-mono space-y-1">
              <div className="font-bold" style={{ color: frozenEvent.color }}>
                {frozenEvent.aggregate.toUpperCase()} EVENT
              </div>
              <div className="text-[10px] opacity-80">{frozenEvent.text}</div>
              <div className="text-[8px] opacity-60">ID: {frozenEvent.id}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <div className="flex items-center space-x-2 text-[10px] font-mono opacity-40 hover:opacity-80 transition-opacity">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AGGREGATE_COLORS.workflow }} />
            <span>Workflow</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AGGREGATE_COLORS.agent }} />
            <span>Agent</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AGGREGATE_COLORS.system }} />
            <span>System</span>
          </div>
        </div>
      </div>
    </div>
  );
}