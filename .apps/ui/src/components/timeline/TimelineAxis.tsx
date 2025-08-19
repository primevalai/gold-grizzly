'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { FlowDirection } from './types';

interface TimelineAxisProps {
  timeRange: {
    start: number;
    end: number;
    duration: number;
  };
  flowDirection: FlowDirection;
  className?: string;
}

interface TimeTick {
  position: number;
  timestamp: number;
  label: string;
  showLabel: boolean;
}

/**
 * Timeline axis component that displays time tick marks and labels
 */
export const TimelineAxis = memo<TimelineAxisProps>(({
  timeRange,
  flowDirection,
  className
}) => {
  const isHorizontal = flowDirection === 'left-to-right' || flowDirection === 'right-to-left';
  const isReversed = flowDirection === 'right-to-left' || flowDirection === 'bottom-to-top';

  // Calculate time ticks based on duration
  const timeTicks = useMemo(() => {
    const { start, end, duration } = timeRange;
    const ticks: TimeTick[] = [];

    // Determine appropriate tick interval based on duration
    let tickInterval: number;
    let labelFormat: (date: Date) => string;

    if (duration < 60 * 1000) { // Less than 1 minute
      tickInterval = 10 * 1000; // Every 10 seconds
      labelFormat = (date) => date.toLocaleTimeString('en-US', { 
        hour12: false, 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } else if (duration < 60 * 60 * 1000) { // Less than 1 hour
      tickInterval = 5 * 60 * 1000; // Every 5 minutes
      labelFormat = (date) => date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (duration < 24 * 60 * 60 * 1000) { // Less than 1 day
      // For spans of a few hours, use 30-minute intervals for better granularity
      tickInterval = 30 * 60 * 1000; // Every 30 minutes
      labelFormat = (date) => {
        const time = date.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const dateStr = date.toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit' 
        });
        return `${dateStr} ${time}`;
      };
    } else { // More than 1 day
      tickInterval = 6 * 60 * 60 * 1000; // Every 6 hours
      labelFormat = (date) => date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit' 
      }) + ' ' + date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    // Generate ticks
    const startTick = Math.ceil(start / tickInterval) * tickInterval;
    
    for (let timestamp = startTick; timestamp <= end; timestamp += tickInterval) {
      const relativeTime = timestamp - start;
      const percentage = (relativeTime / duration) * 100;
      const position = isReversed ? 100 - percentage : percentage;
      const label = labelFormat(new Date(timestamp));

      ticks.push({
        position,
        timestamp,
        label,
        showLabel: true // We'll optimize this later for spacing
      });
    }

    // Optimize label display based on available space
    // Show every nth label to prevent overcrowding
    const maxLabels = isHorizontal ? 8 : 6;
    if (ticks.length > maxLabels) {
      const step = Math.ceil(ticks.length / maxLabels);
      ticks.forEach((tick, index) => {
        tick.showLabel = index % step === 0;
      });
    }
    
    // Add padding to prevent edge labels from being cut off in vertical mode
    if (!isHorizontal && ticks.length > 0) {
      // Adjust positions to add padding at top and bottom
      ticks.forEach(tick => {
        tick.position = 5 + (tick.position * 0.9); // Add 5% padding at top, compress to 90% of space
      });
    }

    return ticks;
  }, [timeRange, isReversed]);

  if (timeTicks.length === 0) {
    // Fallback: show basic timeline with current time if no ticks generated
    const now = new Date();
    return (
      <div
        className={cn(
          'relative bg-gray-50 border border-gray-200',
          isHorizontal 
            ? 'h-12 w-full border-b-2' 
            : 'w-32 h-full border-r-2',
        )}
      >
        {/* Timeline Label */}
        <div className={cn(
          'absolute text-sm font-semibold text-gray-800 bg-white px-2 py-1 rounded border border-gray-300 shadow-sm',
          isHorizontal 
            ? 'top-1 left-2' 
            : 'top-2 left-1 rotate-90 origin-left whitespace-nowrap'
        )}>
          {isHorizontal ? 'Timeline (Time →)' : 'Timeline (Time ↓)'}
        </div>
        
        {/* Current Time Marker */}
        <div className={cn(
          'absolute',
          isHorizontal ? 'left-1/2 transform -translate-x-1/2' : 'top-1/2 transform -translate-y-1/2'
        )}>
          <div className={cn(
            'bg-gray-400',
            isHorizontal ? 'w-px h-3 mx-auto' : 'h-px w-3 my-auto'
          )} />
          <div className={cn(
            'absolute text-xs font-medium text-gray-700 select-none bg-white px-1 py-0.5 rounded border border-gray-200 shadow-sm',
            isHorizontal 
              ? 'bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap' 
              : 'right-5 top-1/2 transform -translate-y-1/2 whitespace-nowrap'
          )}>
            {now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative bg-gray-50 border border-gray-200',
        isHorizontal 
          ? 'h-12 w-full border-b-2' 
          : 'w-40 h-full border-r-2',
        className
      )}
    >
      {/* Timeline Label */}
      <div className={cn(
        'absolute text-sm font-semibold text-gray-800 bg-white px-2 py-1 rounded border border-gray-300 shadow-sm z-10',
        isHorizontal 
          ? 'top-1 left-2' 
          : 'top-16 left-1/2 -translate-x-1/2 rotate-90 origin-center whitespace-nowrap'
      )}>
        {isHorizontal ? 'Timeline (Time →)' : 'Timeline (Time ↓)'}
      </div>

      {/* Time Ticks */}
      {timeTicks.map((tick, index) => (
        <div
          key={index}
          className="absolute w-full h-full pointer-events-none"
        >
          {/* Tick Mark */}
          <div
            className={cn(
              'absolute bg-gray-400',
              isHorizontal 
                ? 'w-px h-3' 
                : 'h-px w-3'
            )}
            style={{
              [isHorizontal ? 'left' : 'top']: `${tick.position}%`,
              [isHorizontal ? 'bottom' : 'right']: '0',
              [isHorizontal ? 'transform' : 'transform']: isHorizontal 
                ? 'translateX(-50%)' 
                : 'translateY(-50%)'
            }}
          />
          
          {/* Tick Label */}
          {tick.showLabel && (
            <div
              className={cn(
                'absolute text-xs font-medium text-gray-700 select-none bg-white px-1 py-0.5 rounded border border-gray-200 shadow-sm whitespace-nowrap pointer-events-auto',
                isHorizontal 
                  ? 'top-5 transform -translate-x-1/2' 
                  : 'left-8 text-[10px]'
              )}
              style={{
                [isHorizontal ? 'left' : 'top']: `${tick.position}%`,
                transform: isHorizontal ? 'translateX(-50%)' : 'translateY(-50%)'
              }}
            >
              {tick.label}
            </div>
          )}
          
          {/* Grid Line (subtle) - extends into swimlane area */}
          <div
            className={cn(
              'absolute bg-gray-200 opacity-20 pointer-events-none z-0',
              isHorizontal 
                ? 'w-px' 
                : 'h-px',
            )}
            style={{
              [isHorizontal ? 'top' : 'left']: '100%',
              [isHorizontal ? 'height' : 'width']: '200vh', // Large enough to extend into content
              [isHorizontal ? 'left' : 'top']: '0'
            }}
          />
        </div>
      ))}
    </div>
  );
});

TimelineAxis.displayName = 'TimelineAxis';