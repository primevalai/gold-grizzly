'use client';

import { memo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Workflow, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Circle,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentViewer } from './AgentViewer';
import type { WorkflowViewerProps, TimelineAgent, TimelineEvent } from './types';

/**
 * Workflow visualization component for timeline
 */
export const WorkflowViewer = memo<WorkflowViewerProps>(({
  workflow,
  flowDirection,
  isSelected = false,
  isExpanded = false,
  onWorkflowClick,
  onAgentClick,
  onEventClick,
  className
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const handleWorkflowClick = () => {
    onWorkflowClick?.(workflow);
    setLocalExpanded(!localExpanded);
  };

  const handleAgentClick = (agent: TimelineAgent) => {
    onAgentClick?.(agent);
  };

  const handleEventClick = (event: TimelineEvent) => {
    onEventClick?.(event);
  };

  const getStatusIcon = () => {
    switch (workflow.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (workflow.status) {
      case 'completed':
        return 'border-green-400 bg-green-50';
      case 'failed':
        return 'border-red-400 bg-red-50';
      case 'in_progress':
        return 'border-blue-400 bg-blue-50';
      case 'pending':
        return 'border-gray-400 bg-gray-50';
      default:
        return 'border-yellow-400 bg-yellow-50';
    }
  };

  const isHorizontal = flowDirection === 'left-to-right' || flowDirection === 'right-to-left';
  const isReversed = flowDirection === 'right-to-left' || flowDirection === 'bottom-to-top';

  // Sort agents by start time (earliest first)
  const sortedAgents = [...workflow.agents].sort((a, b) => 
    a.startTime.getTime() - b.startTime.getTime()
  );

  const duration = workflow.endTime ? 
    workflow.endTime.getTime() - workflow.startTime.getTime() : 
    Date.now() - workflow.startTime.getTime();

  return (
    <div className={cn('space-y-3', className)}>
      {/* Workflow Header */}
      <Card
        className={cn(
          'p-4 cursor-pointer transition-all duration-200 border-2',
          getStatusColor(),
          isSelected && 'ring-2 ring-blue-500 ring-offset-1',
          'hover:shadow-lg'
        )}
        onClick={handleWorkflowClick}
      >
        <div className={cn(
          'flex items-center gap-4',
          isHorizontal ? 'flex-col' : 'flex-row',
          isReversed && isHorizontal && 'flex-col-reverse',
          isReversed && !isHorizontal && 'flex-row-reverse'
        )}>
          {/* Workflow Icon and Expand Button */}
          <div className="flex items-center gap-3">
            <Workflow className="w-6 h-6 text-blue-600" />
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
                <ChevronDown className="w-5 h-5" /> : 
                <ChevronRight className="w-5 h-5" />
              }
            </Button>
          </div>

          {/* Workflow Info */}
          <div className={cn(
            'flex-1 min-w-0',
            isHorizontal ? 'text-center' : ''
          )}>
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <span className="font-bold text-lg text-gray-900 truncate">
                {workflow.name || `Workflow ${workflow.id.slice(-8)}`}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <div>Started: {workflow.startTime.toLocaleTimeString()}</div>
              {workflow.endTime && (
                <div>Ended: {workflow.endTime.toLocaleTimeString()}</div>
              )}
              <div>Duration: {Math.round(duration / 1000)}s</div>
              {workflow.userPrompt && (
                <div className="italic mt-2 text-gray-700 truncate max-w-md">
                  &ldquo;{workflow.userPrompt}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Users className="w-3 h-3 mr-1" />
              {workflow.agents.length} agents
            </Badge>
            <Badge variant="outline" className="bg-gray-100">
              {workflow.totalEvents} events
            </Badge>
          </div>
        </div>

        {/* Workflow ID and Details (when selected) */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-1">
              <div><span className="font-medium">ID:</span> {workflow.id}</div>
              <div>
                <span className="font-medium">Agents:</span> {workflow.agents.map(a => a.name).join(', ')}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Agents List (when expanded) */}
      {localExpanded && sortedAgents.length > 0 && (
        <div className={cn(
          'ml-6 space-y-3',
          isHorizontal && 'ml-0 mt-3'
        )}>
          <div className={cn(
            'flex gap-3',
            isHorizontal ? (isReversed ? 'flex-col-reverse' : 'flex-col') : 
                          (isReversed ? 'flex-row-reverse' : 'flex-row'),
            !isHorizontal && 'flex-wrap'
          )}>
            {sortedAgents.map((agent) => (
              <div
                key={agent.id}
                className={cn(
                  isHorizontal ? 'w-full' : 'flex-shrink-0 min-w-[300px]'
                )}
              >
                <AgentViewer
                  agent={agent}
                  flowDirection={flowDirection}
                  onAgentClick={handleAgentClick}
                  onEventClick={handleEventClick}
                  className="hover:shadow-md"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

WorkflowViewer.displayName = 'WorkflowViewer';