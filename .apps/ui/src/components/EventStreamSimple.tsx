'use client';

import { useEventStream } from '@/hooks/useEventStream';
import { EventList } from './EventList';
import { ConnectionStatus } from './ConnectionStatus';
import { Button } from '@/components/ui/button';

/**
 * Props for EventStream component
 */
interface EventStreamProps {
  apiUrl?: string;
}

/**
 * Simple version of EventStream for testing
 */
export function EventStreamSimple({ 
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
      {/* Connection status */}
      <ConnectionStatus 
        status={connectionStatus}
        onReconnect={connect}
        onDisconnect={disconnect}
      />

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