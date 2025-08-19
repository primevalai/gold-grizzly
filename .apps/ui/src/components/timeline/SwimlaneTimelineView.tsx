'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FlowDirectionControl } from './FlowDirectionControl';
import { TimelineAxis } from './TimelineAxis';
import type { 
  TimelineViewProps, 
  FlowDirection, 
  TimelineWorkflow, 
  TimelineAgent, 
  TimelineEvent 
} from './types';
import type { Event3D } from '@/hooks/useEventStream3D';

/**
 * Swimlane-based timeline visualization matching the reference design
 */
export const SwimlaneTimelineView = memo<TimelineViewProps>(({
  events,
  flowDirection = 'top-to-bottom',
  onFlowDirectionChange,
  onWorkflowClick,
  onAgentClick,
  onEventClick,
  className
}) => {
  const [localFlowDirection, setLocalFlowDirection] = useState<FlowDirection>(flowDirection);

  const handleFlowDirectionChange = useCallback((direction: FlowDirection) => {
    setLocalFlowDirection(direction);
    onFlowDirectionChange?.(direction);
  }, [onFlowDirectionChange]);

  // Transform events into swimlane structure
  const swimlaneData = useMemo(() => {
    
    const workflows = new Map<string, {
      id: string;
      name: string;
      agents: Map<string, {
        id: string;
        name: string;
        events: TimelineEvent[];
      }>;
      startTime: Date;
      endTime: Date;
    }>();

    // Process events into workflow/agent structure
    events.forEach(event => {
      const workflowId = extractWorkflowId(event);
      const agentId = extractAgentId(event);
      
      if (!workflowId) return;

      // Ensure workflow exists
      if (!workflows.has(workflowId)) {
        workflows.set(workflowId, {
          id: workflowId,
          name: `Workflow ${workflowId.slice(-8)}`,
          agents: new Map(),
          startTime: new Date(event.timestamp),
          endTime: new Date(event.timestamp)
        });
      }

      const workflow = workflows.get(workflowId)!;
      
      // Update workflow time bounds
      const eventTime = new Date(event.timestamp);
      if (eventTime < workflow.startTime) workflow.startTime = eventTime;
      if (eventTime > workflow.endTime) workflow.endTime = eventTime;

      if (agentId) {
        // Ensure agent exists
        if (!workflow.agents.has(agentId)) {
          workflow.agents.set(agentId, {
            id: agentId,
            name: event.attributes?.agent_name as string || `Agent ${agentId.slice(-8)}`,
            events: []
          });
        }

        const agent = workflow.agents.get(agentId)!;
        agent.events.push({
          ...event,
          displayName: event.eventName,
          startTime: eventTime,
          status: getEventStatus(event),
          color: getEventColor(event)
        });
      }
    });

    // Convert to array and sort
    const result = Array.from(workflows.values())
      .map(workflow => ({
        ...workflow,
        agents: Array.from(workflow.agents.values())
          .map(agent => ({
            ...agent,
            events: agent.events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          }))
      }))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
    return result;
  }, [events]);

  // Calculate time range for positioning
  const timeRange = useMemo(() => {
    if (swimlaneData.length === 0) {
      return { start: Date.now(), end: Date.now(), duration: 1000 };
    }
    
    let earliest = Infinity;
    let latest = 0;
    
    swimlaneData.forEach(workflow => {
      if (workflow.startTime.getTime() < earliest) earliest = workflow.startTime.getTime();
      if (workflow.endTime.getTime() > latest) latest = workflow.endTime.getTime();
    });
    
    // Fallback if no valid timestamps found
    if (earliest === Infinity || latest === 0) {
      const now = Date.now();
      return { start: now, end: now, duration: 1000 };
    }
    
    return {
      start: earliest,
      end: latest,
      duration: Math.max(latest - earliest, 1000) // Minimum 1 second
    };
  }, [swimlaneData]);

  const isHorizontal = localFlowDirection === 'left-to-right' || localFlowDirection === 'right-to-left';
  const isReversed = localFlowDirection === 'right-to-left' || localFlowDirection === 'bottom-to-top';

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Controls Header */}
      <div className="flex-none bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Timeline View</h2>
          <FlowDirectionControl
            direction={localFlowDirection}
            onChange={handleFlowDirectionChange}
          />
        </div>
      </div>

      {/* Timeline and Swimlane Container */}
      <div className="flex-1 overflow-auto">
        {swimlaneData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">No workflows to display</p>
              <p className="text-sm mt-1">Events will appear here as they are generated</p>
              <p className="text-xs mt-2 text-gray-400">
                Received {events.length} events total
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            'flex',
            isHorizontal ? 'flex-col' : 'flex-row'
          )}>
            {/* Timeline Axis */}
            <TimelineAxis
              timeRange={timeRange}
              flowDirection={localFlowDirection}
              className="flex-none"
            />
            
            {/* Swimlanes */}
            <div className={cn(
              'flex-1 p-2 sm:p-4',
              'flex gap-2 sm:gap-4',
              isHorizontal ? 'flex-col' : 'flex-row flex-wrap xl:flex-nowrap',
              isReversed && isHorizontal && 'flex-col-reverse',
              isReversed && !isHorizontal && 'flex-row-reverse'
            )}>
              {swimlaneData.map((workflow) => (
                <WorkflowSwimlane
                  key={workflow.id}
                  workflow={workflow}
                  timeRange={timeRange}
                  flowDirection={localFlowDirection}
                  onWorkflowClick={onWorkflowClick}
                  onAgentClick={onAgentClick}
                  onEventClick={onEventClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SwimlaneTimelineView.displayName = 'SwimlaneTimelineView';

// Workflow Swimlane Component
interface WorkflowSwimlaneProps {
  workflow: any;
  timeRange: { start: number; end: number; duration: number };
  flowDirection: FlowDirection;
  onWorkflowClick?: (workflow: any) => void;
  onAgentClick?: (agent: any) => void;
  onEventClick?: (event: any) => void;
}

const WorkflowSwimlane = memo<WorkflowSwimlaneProps>(({
  workflow,
  timeRange,
  flowDirection,
  onWorkflowClick,
  onAgentClick,
  onEventClick
}) => {
  const isHorizontal = flowDirection === 'left-to-right' || flowDirection === 'right-to-left';
  const isReversed = flowDirection === 'right-to-left' || flowDirection === 'bottom-to-top';

  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-lg p-2 sm:p-3',
      isHorizontal 
        ? 'w-full min-h-[100px] sm:min-h-[120px]' 
        : 'min-w-[150px] sm:min-w-[200px] h-full flex-shrink-0'
    )}>
      {/* Workflow Header */}
      <div className={cn(
        'flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded',
        isHorizontal ? 'justify-center' : 'justify-start'
      )}>
        <div className="w-3 h-3 bg-blue-500 rounded-full" />
        <span className="font-medium text-sm text-blue-900 truncate">
          {workflow.name}
        </span>
      </div>

      {/* Agent Tracks */}
      <div className={cn(
        'flex gap-2',
        isHorizontal ? 'flex-row' : 'flex-col',
        isReversed && isHorizontal && 'flex-row-reverse',
        isReversed && !isHorizontal && 'flex-col-reverse'
      )}>
        {workflow.agents.map((agent: any) => (
          <AgentTrack
            key={agent.id}
            agent={agent}
            timeRange={timeRange}
            flowDirection={flowDirection}
            onAgentClick={onAgentClick}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
});

// Agent Track Component
interface AgentTrackProps {
  agent: any;
  timeRange: { start: number; end: number; duration: number };
  flowDirection: FlowDirection;
  onAgentClick?: (agent: any) => void;
  onEventClick?: (event: any) => void;
}

const AgentTrack = memo<AgentTrackProps>(({
  agent,
  timeRange,
  flowDirection,
  onAgentClick,
  onEventClick
}) => {
  const isHorizontal = flowDirection === 'left-to-right' || flowDirection === 'right-to-left';
  const isReversed = flowDirection === 'right-to-left' || flowDirection === 'bottom-to-top';

  // Calculate event positions based on time (aligned with timeline axis)
  const getEventPosition = (eventTime: Date) => {
    const relativeTime = eventTime.getTime() - timeRange.start;
    const percentage = Math.max(0, Math.min(100, (relativeTime / timeRange.duration) * 100));
    return isReversed ? 100 - percentage : percentage;
  };

  return (
    <div className={cn(
      'relative border border-gray-100 rounded bg-gray-50',
      isHorizontal 
        ? 'h-12 sm:h-16 flex-1 min-w-[80px] sm:min-w-[100px]' 
        : 'w-12 sm:w-16 flex-1 min-h-[80px] sm:min-h-[100px]'
    )}>
      {/* Agent Label */}
      <div className={cn(
        'absolute bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded text-center',
        isHorizontal ? 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2' :
                      'left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-90'
      )}>
        {agent.name.slice(-8)}
      </div>

      {/* Event Dots */}
      {agent.events.map((event: any, index: number) => {
        const position = getEventPosition(event.startTime);
        const eventColor = getEventColor(event);
        
        return (
          <div
            key={event.id + index}
            className={cn(
              'absolute w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-125 hover:z-10',
              'border-2 border-white shadow-sm'
            )}
            style={{
              backgroundColor: eventColor,
              [isHorizontal ? 'left' : 'top']: `${position}%`,
              [isHorizontal ? 'top' : 'left']: '50%',
              transform: isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)'
            }}
            onClick={() => onEventClick?.(event)}
            title={`${event.displayName} - ${new Date(event.timestamp).toLocaleString()}`}
          />
        );
      })}
    </div>
  );
});

// Helper functions (reused from original)
function extractWorkflowId(event: Event3D): string | null {
  if (event.attributes?.workflow_id) return event.attributes.workflow_id as string;
  if (event.attributes?.WORKFLOW_ID) return event.attributes.WORKFLOW_ID as string;
  if (event.aggregate?.toLowerCase().includes('workflow')) return event.id;
  return null;
}

function extractAgentId(event: Event3D): string | null {
  if (event.attributes?.agent_id) return event.attributes.agent_id as string;
  if (event.attributes?.AGENT_ID) return event.attributes.AGENT_ID as string;
  if (event.aggregate?.toLowerCase().includes('agent')) return event.id;
  return null;
}

function getEventStatus(event: Event3D): 'pending' | 'in_progress' | 'completed' | 'failed' {
  const eventName = event.eventName || '';
  if (eventName.includes('completed')) return 'completed';
  if (eventName.includes('failed') || eventName.includes('error')) return 'failed';
  if (eventName.includes('started') || eventName.includes('progress')) return 'in_progress';
  return 'pending';
}

function getEventColor(event: Event3D): string {
  const status = getEventStatus(event);
  switch (status) {
    case 'completed': return '#10b981';
    case 'failed': return '#ef4444';
    case 'in_progress': return '#3b82f6';
    case 'pending': return '#6b7280';
    default: return '#f59e0b';
  }
}