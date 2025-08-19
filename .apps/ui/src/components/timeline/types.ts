/**
 * Timeline component type definitions
 */

import type { EventData } from '@/types/events';
import type { Event3D } from '@/hooks/useEventStream3D';

/**
 * Flow direction for timeline layout
 */
export type FlowDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

/**
 * Individual event with processed data for timeline visualization
 */
export interface TimelineEvent extends Event3D {
  displayName: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  color: string;
}

/**
 * Agent data structure for timeline
 */
export interface TimelineAgent {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  events: TimelineEvent[];
  workflowId: string;
  parentAgentId?: string;
}

/**
 * Workflow data structure for timeline
 */
export interface TimelineWorkflow {
  id: string;
  name?: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agents: TimelineAgent[];
  userPrompt?: string;
  totalEvents: number;
}

/**
 * Props for EventViewer component
 */
export interface EventViewerProps {
  event: TimelineEvent;
  flowDirection: FlowDirection;
  isSelected?: boolean;
  onClick?: (event: TimelineEvent) => void;
  className?: string;
}

/**
 * Props for AgentViewer component
 */
export interface AgentViewerProps {
  agent: TimelineAgent;
  flowDirection: FlowDirection;
  isSelected?: boolean;
  isExpanded?: boolean;
  onAgentClick?: (agent: TimelineAgent) => void;
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

/**
 * Props for WorkflowViewer component
 */
export interface WorkflowViewerProps {
  workflow: TimelineWorkflow;
  flowDirection: FlowDirection;
  isSelected?: boolean;
  isExpanded?: boolean;
  onWorkflowClick?: (workflow: TimelineWorkflow) => void;
  onAgentClick?: (agent: TimelineAgent) => void;
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

/**
 * Props for TimelineView component
 */
export interface TimelineViewProps {
  events: Event3D[];
  flowDirection?: FlowDirection;
  onFlowDirectionChange?: (direction: FlowDirection) => void;
  onWorkflowClick?: (workflow: TimelineWorkflow) => void;
  onAgentClick?: (agent: TimelineAgent) => void;
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

/**
 * Props for FlowDirectionControl component
 */
export interface FlowDirectionControlProps {
  direction: FlowDirection;
  onChange: (direction: FlowDirection) => void;
  className?: string;
}