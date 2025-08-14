'use client';

import { useState } from 'react';
import { useEventStream } from '@/hooks/useEventStream';
import { EventList } from './EventList';
import { ConnectionStatus } from './ConnectionStatus';
import { LiveEventPulse } from './realtime/LiveEventPulse';
import { EventVelocityMeter } from './realtime/EventVelocityMeter';
import { EventRain } from './realtime/EventRain';
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
 * Test version with EventRain component
 */
export function EventStreamTest({ 
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

  const [showEventRain, setShowEventRain] = useState(true);

  return (
    <div className="relative min-h-screen">
      {/* Event Rain Background */}
      {showEventRain && (
        <EventRain 
          events={events}
          active={connectionStatus === 'connected'}
          intensity="medium"
          className="fixed inset-0 pointer-events-none"
        />
      )}
      
      <div className="relative z-10 space-y-6">
        {/* Enhanced real-time indicators */}
        <LiveEventPulse 
          connectionStatus={connectionStatus}
          metrics={metrics}
        />

        {/* Real-time metrics dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EventVelocityMeter metrics={metrics} />
          
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
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowEventRain(!showEventRain)}
            >
              {showEventRain ? 'Hide' : 'Show'} Event Rain
            </Button>
            {events.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearEvents}>
                Clear Events
              </Button>
            )}
          </div>
        </div>

        {/* Event list */}
        <EventList 
          events={events} 
          loading={false}
          emptyMessage="Waiting for events..."
        />
      </div>
    </div>
  );
}