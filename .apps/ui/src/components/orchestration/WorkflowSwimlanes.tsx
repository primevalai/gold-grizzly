'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EventData } from '@/types/events';

/**
 * Props for WorkflowSwimlanes component
 */
interface WorkflowSwimlanesProps {
  events: EventData[];
}

/**
 * Workflow data grouped by workflow ID
 */
interface WorkflowGroup {
  workflowId: string;
  events: EventData[];
  status: 'active' | 'completed' | 'failed';
  startTime: Date;
  lastActivity: Date;
  agentCount: number;
}

/**
 * WorkflowSwimlanes component for visualizing parallel workflow executions
 */
export function WorkflowSwimlanes({ events }: WorkflowSwimlanesProps) {
  // Group events by workflow ID
  const workflowGroups = groupEventsByWorkflow(events);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Workflow Swimlanes
          <Badge variant="outline">
            {workflowGroups.length} workflows
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {workflowGroups.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No workflows detected yet
            </div>
          ) : (
            workflowGroups.map((workflow) => (
              <WorkflowLane key={workflow.workflowId} workflow={workflow} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual workflow lane component
 */
function WorkflowLane({ workflow }: { workflow: WorkflowGroup }) {
  const statusColors = {
    active: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  const duration = workflow.lastActivity.getTime() - workflow.startTime.getTime();
  const durationText = formatDuration(duration);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <motion.div
            className={`w-3 h-3 rounded-full ${statusColors[workflow.status]}`}
            animate={workflow.status === 'active' ? {
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Workflow ID */}
          <div>
            <div className="font-medium text-sm">
              Workflow: {workflow.workflowId.slice(0, 8)}...
            </div>
            <div className="text-xs text-muted-foreground">
              {workflow.events.length} events • {workflow.agentCount} agents
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={
            workflow.status === 'active' ? 'default' :
            workflow.status === 'completed' ? 'secondary' : 'destructive'
          }>
            {workflow.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {durationText}
          </span>
        </div>
      </div>

      {/* Event timeline */}
      <div className="flex gap-1 h-2 bg-muted rounded overflow-hidden">
        {workflow.events.slice(0, 20).map((event, index) => (
          <motion.div
            key={event.event_id}
            initial={{ width: 0 }}
            animate={{ width: '4px' }}
            transition={{ delay: index * 0.1 }}
            className={`h-full ${getEventColor(event)} min-w-[4px]`}
            title={`${event.event_type} - ${new Date(event.timestamp).toLocaleTimeString()}`}
          />
        ))}
        {workflow.events.length > 20 && (
          <div className="flex-1 h-full bg-muted-foreground/20 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              +{workflow.events.length - 20}
            </span>
          </div>
        )}
      </div>

      {/* Recent events */}
      <div className="mt-2 text-xs text-muted-foreground">
        Last: {workflow.events[0]?.event_type} • {formatTimeAgo(workflow.lastActivity)}
      </div>
    </motion.div>
  );
}

/**
 * Group events by workflow ID
 */
function groupEventsByWorkflow(events: EventData[]): WorkflowGroup[] {
  const groups = new Map<string, WorkflowGroup>();

  events.forEach(event => {
    // For workflow events, use aggregate_id as workflow_id, otherwise use workflow_id field or attributes
    const workflowId = event.aggregate_type === 'workflow_aggregate' 
      ? event.aggregate_id 
      : event.workflow_id || (event.attributes?.workflow_id as string) || 'no-workflow';
    
    if (!groups.has(workflowId)) {
      groups.set(workflowId, {
        workflowId,
        events: [],
        status: 'active',
        startTime: new Date(event.timestamp),
        lastActivity: new Date(event.timestamp),
        agentCount: 0,
      });
    }

    const group = groups.get(workflowId)!;
    group.events.unshift(event); // Add to front for newest first
    
    const eventTime = new Date(event.timestamp);
    if (eventTime > group.lastActivity) {
      group.lastActivity = eventTime;
    }
    if (eventTime < group.startTime) {
      group.startTime = eventTime;
    }

    // Count unique agents
    const agentIds = new Set(group.events
      .filter(e => e.agent_id)
      .map(e => e.agent_id));
    group.agentCount = agentIds.size;

    // Determine status
    if (group.events.some(e => e.event_type.includes('failed') || e.event_type.includes('error'))) {
      group.status = 'failed';
    } else if (group.events.some(e => e.event_type.includes('completed') || e.event_type.includes('finished'))) {
      group.status = 'completed';
    } else {
      group.status = 'active';
    }
  });

  return Array.from(groups.values())
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
}

/**
 * Get color class for event type
 */
function getEventColor(event: EventData): string {
  if (event.aggregate_type === 'workflow_aggregate') {
    return 'bg-blue-400';
  } else if (event.aggregate_type === 'agent_aggregate') {
    return 'bg-purple-400';
  } else if (event.aggregate_type === 'system_aggregate') {
    return 'bg-gray-400';
  }
  return 'bg-muted-foreground/40';
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

/**
 * Format time ago
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}