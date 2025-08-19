'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { WorkflowViewer } from './WorkflowViewer';
import { FlowDirectionControl } from './FlowDirectionControl';
import type { 
  TimelineViewProps, 
  FlowDirection, 
  TimelineWorkflow, 
  TimelineAgent, 
  TimelineEvent 
} from './types';
import type { Event3D } from '@/hooks/useEventStream3D';

/**
 * Main timeline visualization component
 */
export const TimelineView = memo<TimelineViewProps>(({
  events,
  flowDirection = 'left-to-right',
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

  // Transform raw events into timeline structure
  const timelineData = useMemo(() => {
    const workflows = new Map<string, TimelineWorkflow>();
    const agents = new Map<string, TimelineAgent>();
    const processedEvents = new Map<string, TimelineEvent>();

    // First pass: process all events and create timeline events
    events.forEach(event => {
      const timelineEvent: TimelineEvent = {
        ...event,
        displayName: event.eventName || 'Unknown Event',
        startTime: new Date(event.timestamp),
        status: getEventStatus(event),
        color: getEventColor(event)
      };
      
      processedEvents.set(event.id, timelineEvent);
    });

    // Second pass: group events by agent and workflow
    processedEvents.forEach(event => {
      const workflowId = extractWorkflowId(event);
      const agentId = extractAgentId(event);

      if (workflowId) {
        // Ensure workflow exists
        if (!workflows.has(workflowId)) {
          const userPrompt = event.attributes?.user_prompt as string;
          workflows.set(workflowId, {
            id: workflowId,
            name: userPrompt ? `Workflow: ${userPrompt.slice(0, 50)}...` : undefined,
            startTime: event.startTime,
            endTime: undefined,
            status: 'pending',
            agents: [],
            userPrompt: userPrompt,
            totalEvents: 0
          });
        }

        const workflow = workflows.get(workflowId)!;

        if (agentId) {
          // Ensure agent exists
          if (!agents.has(agentId)) {
            agents.set(agentId, {
              id: agentId,
              name: event.attributes?.agent_name as string || `Agent ${agentId.slice(-8)}`,
              startTime: event.startTime,
              endTime: undefined,
              status: 'pending',
              events: [],
              workflowId,
              parentAgentId: event.attributes?.parent_agent_id as string
            });
          }

          const agent = agents.get(agentId)!;
          agent.events.push(event);

          // Update agent timing and status
          if (event.startTime < agent.startTime) {
            agent.startTime = event.startTime;
          }
          agent.status = getAgentStatus(agent.events);
        }

        // Update workflow timing and status
        if (event.startTime < workflow.startTime) {
          workflow.startTime = event.startTime;
        }
        workflow.totalEvents++;
      }
    });

    // Third pass: assign agents to workflows and update statuses
    agents.forEach(agent => {
      const workflow = workflows.get(agent.workflowId);
      if (workflow) {
        workflow.agents.push(agent);
        
        // Update workflow status based on agents
        const agentStatuses = workflow.agents.map(a => a.status);
        if (agentStatuses.every(s => s === 'completed')) {
          workflow.status = 'completed';
        } else if (agentStatuses.some(s => s === 'failed')) {
          workflow.status = 'failed';
        } else if (agentStatuses.some(s => s === 'in_progress')) {
          workflow.status = 'in_progress';
        }

        // Set workflow end time
        const latestAgentTime = Math.max(...workflow.agents.map(a => 
          Math.max(...a.events.map(e => e.startTime.getTime()))
        ));
        if (latestAgentTime > workflow.startTime.getTime()) {
          workflow.endTime = new Date(latestAgentTime);
        }
      }
    });

    // Sort workflows by earliest start time (most recent first)
    return Array.from(workflows.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  }, [events]);

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

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto p-4">
        {timelineData.length === 0 ? (
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
            'space-y-6',
            isHorizontal ? 'flex flex-col' : 'flex flex-row flex-wrap gap-6',
            isReversed && isHorizontal && 'flex-col-reverse',
            isReversed && !isHorizontal && 'flex-row-reverse'
          )}>
            {timelineData.map((workflow) => (
              <div
                key={workflow.id}
                className={cn(
                  isHorizontal ? 'w-full' : 'flex-shrink-0 min-w-[400px] max-w-[600px]'
                )}
              >
                <WorkflowViewer
                  workflow={workflow}
                  flowDirection={localFlowDirection}
                  onWorkflowClick={onWorkflowClick}
                  onAgentClick={onAgentClick}
                  onEventClick={onEventClick}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

TimelineView.displayName = 'TimelineView';

// Helper functions
function extractWorkflowId(event: Event3D): string | null {
  // Check attributes first
  if (event.attributes?.workflow_id) return event.attributes.workflow_id as string;
  if (event.attributes?.WORKFLOW_ID) return event.attributes.WORKFLOW_ID as string;
  
  // If this is a workflow event, use the event id
  if (event.aggregate?.toLowerCase().includes('workflow')) {
    return event.id;
  }
  
  return null;
}

function extractAgentId(event: Event3D): string | null {
  // Check attributes first
  if (event.attributes?.agent_id) return event.attributes.agent_id as string;
  if (event.attributes?.AGENT_ID) return event.attributes.AGENT_ID as string;
  
  // If this is an agent event, use the event id
  if (event.aggregate?.toLowerCase().includes('agent')) {
    return event.id;
  }
  
  return null;
}

function getEventStatus(event: Event3D): TimelineEvent['status'] {
  const eventName = event.eventName || '';
  
  if (eventName.includes('completed')) {
    return 'completed';
  }
  if (eventName.includes('failed') || eventName.includes('error')) {
    return 'failed';
  }
  if (eventName.includes('started') || eventName.includes('progress')) {
    return 'in_progress';
  }
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

function getAgentStatus(events: TimelineEvent[]): TimelineAgent['status'] {
  if (events.some(e => e.status === 'failed')) return 'failed';
  if (events.some(e => e.status === 'in_progress')) return 'in_progress';
  if (events.every(e => e.status === 'completed')) return 'completed';
  return 'pending';
}