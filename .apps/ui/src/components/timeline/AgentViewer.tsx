'use client';

import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventViewer } from './EventViewer';
import type { AgentViewerProps, TimelineEvent } from './types';

/**
 * Agent visualization component for timeline
 */
export const AgentViewer = memo<AgentViewerProps>(({
  agent,
  flowDirection,
  isSelected = false,
  isExpanded = false,
  onAgentClick,
  onEventClick,
  className
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const handleAgentClick = () => {
    onAgentClick?.(agent);
    setLocalExpanded(!localExpanded);
  };

  const handleEventClick = (event: TimelineEvent) => {
    onEventClick?.(event);
  };

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Circle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'completed':
        return 'border-green-300 bg-green-50';
      case 'failed':
        return 'border-red-300 bg-red-50';
      case 'in_progress':
        return 'border-blue-300 bg-blue-50';
      case 'pending':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-yellow-300 bg-yellow-50';
    }
  };

  const isHorizontal = flowDirection === 'left-to-right' || flowDirection === 'right-to-left';
  const isReversed = flowDirection === 'right-to-left' || flowDirection === 'bottom-to-top';

  // Sort events by start time
  const sortedEvents = [...agent.events].sort((a, b) => 
    a.startTime.getTime() - b.startTime.getTime()
  );

  const duration = agent.endTime ? 
    agent.endTime.getTime() - agent.startTime.getTime() : 
    Date.now() - agent.startTime.getTime();

  return (
    <div className={cn('space-y-2', className)}>
      {/* Agent Header */}
      <Card
        className={cn(
          'p-3 cursor-pointer transition-all duration-200 border-2',
          getStatusColor(),
          isSelected && 'ring-2 ring-purple-500 ring-offset-1',
          'hover:shadow-md'
        )}
        onClick={handleAgentClick}
      >
        <div className={cn(
          'flex items-center gap-3',
          isHorizontal ? 'flex-col' : 'flex-row',
          isReversed && isHorizontal && 'flex-col-reverse',
          isReversed && !isHorizontal && 'flex-row-reverse'
        )}>
          {/* Agent Icon and Expand Button */}
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto"
              onClick={(e) => {
                e.stopPropagation();
                setLocalExpanded(!localExpanded);
              }}
            >
              {localExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </Button>
          </div>

          {/* Agent Info */}
          <div className={cn(
            'flex-1 min-w-0',
            isHorizontal ? 'text-center' : ''
          )}>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-semibold text-gray-900 truncate">
                {agent.name}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mt-1">
              <div>Started: {agent.startTime.toLocaleTimeString()}</div>
              {agent.endTime && (
                <div>Ended: {agent.endTime.toLocaleTimeString()}</div>
              )}
              <div>Duration: {Math.round(duration / 1000)}s</div>
            </div>
          </div>

          {/* Event Count Badge */}
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            {agent.events.length} events
          </Badge>
        </div>

        {/* Agent ID (when selected) */}
        {isSelected && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div>ID: {agent.id}</div>
              {agent.parentAgentId && (
                <div>Parent: {agent.parentAgentId}</div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Events List (when expanded) */}
      {localExpanded && sortedEvents.length > 0 && (
        <div className={cn(
          'ml-4 space-y-1',
          isHorizontal && 'ml-0 mt-2'
        )}>
          <div className={cn(
            'flex gap-2',
            isHorizontal ? (isReversed ? 'flex-col-reverse' : 'flex-col') : 
                          (isReversed ? 'flex-row-reverse' : 'flex-row'),
            !isHorizontal && 'flex-wrap'
          )}>
            {sortedEvents.map((event, index) => (
              <div
                key={event.event_id || index}
                className={cn(
                  isHorizontal ? 'w-full' : 'flex-shrink-0'
                )}
              >
                <EventViewer
                  event={event}
                  flowDirection={flowDirection}
                  onClick={handleEventClick}
                  className="hover:shadow-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

AgentViewer.displayName = 'AgentViewer';