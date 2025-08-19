'use client';

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle, AlertCircle, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventViewerProps } from './types';

/**
 * Individual event display component for timeline
 */
export const EventViewer = memo<EventViewerProps>(({
  event,
  flowDirection,
  isSelected = false,
  onClick,
  className
}) => {
  const handleClick = () => {
    onClick?.(event);
  };

  const getStatusIcon = () => {
    switch (event.status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-3 h-3 text-blue-500" />;
      case 'pending':
        return <Circle className="w-3 h-3 text-gray-400" />;
      default:
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'completed':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'failed':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'in_progress':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      case 'pending':
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
      default:
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
    }
  };

  const isHorizontal = flowDirection === 'left-to-right' || flowDirection === 'right-to-left';
  const isReversed = flowDirection === 'right-to-left' || flowDirection === 'bottom-to-top';

  return (
    <Card
      className={cn(
        'p-2 cursor-pointer transition-all duration-200 border',
        getStatusColor(),
        isSelected && 'ring-2 ring-blue-500 ring-offset-1',
        isHorizontal ? 'min-w-[120px] max-w-[200px]' : 'min-h-[60px]',
        className
      )}
      onClick={handleClick}
    >
      <div 
        className={cn(
          'flex items-center gap-2',
          isHorizontal ? 'flex-col' : 'flex-row',
          isReversed && isHorizontal && 'flex-col-reverse',
          isReversed && !isHorizontal && 'flex-row-reverse'
        )}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>

        {/* Event Info */}
        <div className={cn(
          'flex-1 min-w-0',
          isHorizontal ? 'text-center' : ''
        )}>
          <div className="text-xs font-medium text-gray-900 truncate">
            {event.displayName || event.eventName || 'Unknown Event'}
          </div>
          
          {/* Timestamp */}
          <div className="text-xs text-gray-500 mt-1">
            {event.startTime.toLocaleTimeString('en-US', { 
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>

        {/* Event Type Badge */}
        {event.eventName && (
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs px-1 py-0',
              isHorizontal ? 'text-center' : ''
            )}
          >
            {event.eventName.split('.').pop()}
          </Badge>
        )}
      </div>

      {/* Additional Details on Hover/Selection */}
      {isSelected && event.attributes && Object.keys(event.attributes).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            {Object.entries(event.attributes).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <span className="truncate ml-1">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});

EventViewer.displayName = 'EventViewer';