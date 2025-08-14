'use client';

import { useEventStream } from '@/hooks/useEventStream';
import { EventList } from './EventList';
import { ConnectionStatus } from './ConnectionStatus';
import { LiveEventPulse } from './realtime/LiveEventPulse';
import { EventVelocityMeter } from './realtime/EventVelocityMeter';
import { WorkflowSwimlanes } from './orchestration/WorkflowSwimlanes';
import { AgentHierarchy } from './orchestration/AgentHierarchy';
import { Button } from '@/components/ui/button';

/**
 * Props for EventStream component
 */
interface EventStreamProps {
  apiUrl?: string;
}

/**
 * Main component that manages the event stream connection and displays events
 */
export function EventStream({ 
  apiUrl = 'http://localhost:8765' 
}: EventStreamProps) {
  const streamUrl = `${apiUrl}/events/stream`;
  const { 
    events, 
    connectionStatus, 
    metrics,
    connect, 
    disconnect, 
    clearEvents 
  } = useEventStream(streamUrl);

  return (
    <div className="space-y-6">
      {/* Enhanced real-time indicators */}
      <LiveEventPulse 
        connectionStatus={connectionStatus}
        metrics={metrics}
      />

      {/* Real-time metrics dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventVelocityMeter metrics={metrics} />
        
        {/* Legacy connection status - keep for now */}
        <div className="lg:col-span-1">
          <ConnectionStatus 
            status={connectionStatus}
            onReconnect={connect}
            onDisconnect={disconnect}
          />
        </div>
      </div>

      {/* Workflow and Agent Orchestration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkflowSwimlanes events={events} />
        <AgentHierarchy events={events} />
      </div>

      {/* Event controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Event Stream</h2>
          <p className="text-sm text-muted-foreground">
            Real-time events from the API ({events.length} events)
          </p>
        </div>
        
        {events.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearEvents}>
            Clear Events
          </Button>
        )}
      </div>

      {/* Event list */}
      <EventList 
        events={events} 
        loading={false}
        emptyMessage="Waiting for events..."
      />
    </div>
  );
}