'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Clock, Activity, TrendingUp, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  eventName: string;
  aggregate: string;
  timestamp: string;
  attributes?: Record<string, any>;
}

interface LiveTimelineProps {
  events: TimelineEvent[];
  timeWindow?: number; // in seconds
  autoScroll?: boolean;
  showDensity?: boolean;
  className?: string;
}

interface DensityPoint {
  timestamp: number;
  count: number;
  events: TimelineEvent[];
}

const AGGREGATE_COLORS = {
  workflow: '#3B82F6',
  agent: '#8B5CF6', 
  system: '#6B7280'
};

export function LiveTimeline({ 
  events, 
  timeWindow = 60,
  autoScroll = true,
  showDensity = true,
  className = '' 
}: LiveTimelineProps) {
  const [isLive, setIsLive] = useState(autoScroll);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [densityData, setDensityData] = useState<DensityPoint[]>([]);
  const [timeRange, setTimeRange] = useState({ start: Date.now() - timeWindow * 1000, end: Date.now() });
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const calculateDensity = useCallback((events: TimelineEvent[], window: number, buckets: number = 60) => {
    const now = Date.now();
    const startTime = now - window * 1000;
    const bucketSize = (window * 1000) / buckets;
    
    const density: DensityPoint[] = [];
    
    for (let i = 0; i < buckets; i++) {
      const bucketStart = startTime + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      
      const bucketEvents = events.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        return eventTime >= bucketStart && eventTime < bucketEnd;
      });
      
      density.push({
        timestamp: bucketStart + bucketSize / 2,
        count: bucketEvents.length,
        events: bucketEvents
      });
    }
    
    return density;
  }, []);

  useEffect(() => {
    const density = calculateDensity(events, timeWindow);
    setDensityData(density);
  }, [events, timeWindow, calculateDensity]);

  useEffect(() => {
    if (isLive && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [events, isLive]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive) {
        setTimeRange({ 
          start: Date.now() - timeWindow * 1000, 
          end: Date.now() 
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, timeWindow]);

  const formatTime = (timestamp: string | number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventPosition = (timestamp: string) => {
    const eventTime = new Date(timestamp).getTime();
    const progress = (eventTime - timeRange.start) / (timeRange.end - timeRange.start);
    return Math.max(0, Math.min(100, progress * 100));
  };

  const getAggregateColor = (aggregate: string) => {
    return AGGREGATE_COLORS[aggregate.toLowerCase() as keyof typeof AGGREGATE_COLORS] || AGGREGATE_COLORS.system;
  };

  const maxDensity = Math.max(...densityData.map(d => d.count), 1);

  const handleJumpToLive = () => {
    setIsLive(true);
    setTimeRange({ 
      start: Date.now() - timeWindow * 1000, 
      end: Date.now() 
    });
  };

  const getEventsByTime = () => {
    return events
      .filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        return eventTime >= timeRange.start && eventTime <= timeRange.end;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Live Timeline
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timeWindow}s window
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
                         ${isLive 
                           ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                           : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}
            >
              {isLive ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                  LIVE
                </>
              ) : (
                <>
                  <Pause className="inline w-3 h-3 mr-1" />
                  PAUSED
                </>
              )}
            </button>
            
            {!isLive && (
              <button
                onClick={handleJumpToLive}
                className="px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 
                          dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                <SkipForward className="inline w-3 h-3 mr-1" />
                Jump to Live
              </button>
            )}
          </div>
        </div>
      </div>

      {showDensity && (
        <div className="px-4 pt-4">
          <div className="h-16 relative">
            <div className="absolute inset-0 flex items-end">
              {densityData.map((point, index) => {
                const height = (point.count / maxDensity) * 100;
                const isHighDensity = point.count > maxDensity * 0.7;
                
                return (
                  <div
                    key={index}
                    className="flex-1 px-px group relative"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      className={`w-full rounded-t transition-colors cursor-pointer
                                ${isHighDensity 
                                  ? 'bg-red-400/30 dark:bg-red-500/30' 
                                  : 'bg-blue-400/30 dark:bg-blue-500/30'}
                                hover:bg-blue-500/50 dark:hover:bg-blue-400/50`}
                      title={`${point.count} events at ${formatTime(point.timestamp)}`}
                    />
                    {point.count > 0 && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 
                                    opacity-0 group-hover:opacity-100 transition-opacity
                                    bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
                        {point.count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{formatTime(timeRange.start)}</span>
            <span className="flex items-center space-x-1">
              <TrendingUp className="w-3 h-3" />
              <span>{events.length} events</span>
            </span>
            <span>{formatTime(timeRange.end)}</span>
          </div>
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        className="relative h-32 mx-4 my-4 overflow-x-auto overflow-y-hidden"
      >
        <div ref={timelineRef} className="relative h-full">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
            
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-800"
                style={{ left: `${(i + 1) * 20}%` }}
              />
            ))}
          </div>

          <div className="relative h-full">
            {getEventsByTime().map((event, index) => {
              const position = getEventPosition(event.timestamp);
              const color = getAggregateColor(event.aggregate);
              const yOffset = (index % 3) * 30 - 30;
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-1/2 transform -translate-y-1/2 cursor-pointer"
                  style={{ 
                    left: `${position}%`,
                    transform: `translate(-50%, ${yOffset}px)`
                  }}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-lg
                             hover:scale-150 transition-transform"
                    style={{ 
                      backgroundColor: color,
                      boxShadow: `0 0 10px ${color}`
                    }}
                  />
                  <div className="absolute top-5 left-1/2 transform -translate-x-1/2 
                                whitespace-nowrap text-[10px] opacity-0 hover:opacity-100 
                                transition-opacity bg-black/80 text-white px-1 py-0.5 rounded">
                    {event.eventName}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {isLive && (
            <div className="absolute top-0 bottom-0 right-0 w-px bg-red-500 animate-pulse">
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getAggregateColor(selectedEvent.aggregate) }}
                  />
                  <span className="text-xs font-mono font-medium text-gray-900 dark:text-gray-100">
                    {selectedEvent.eventName}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-[10px] text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(selectedEvent.timestamp)}</span>
                  </span>
                  <span>ID: {selectedEvent.id}</span>
                  <span className="uppercase">{selectedEvent.aggregate}</span>
                </div>
                {selectedEvent.attributes && (
                  <div className="text-[10px] font-mono text-gray-600 dark:text-gray-400">
                    {JSON.stringify(selectedEvent.attributes, null, 2)}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}