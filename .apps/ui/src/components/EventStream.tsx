'use client';

import { useState, useMemo } from 'react';
import { useEventStream } from '@/hooks/useEventStream';
import { EventList } from './EventList';
import { ConnectionStatus } from './ConnectionStatus';
import { LiveEventPulse } from './realtime/LiveEventPulse';
import { EventVelocityMeter } from './realtime/EventVelocityMeter';
import { EventRain } from './realtime/EventRain';
import { WorkflowSwimlanes } from './orchestration/WorkflowSwimlanes';
import { AgentHierarchy } from './orchestration/AgentHierarchy';
import { StreamTicker } from './streaming/StreamTicker';
import { LiveTimeline } from './streaming/LiveTimeline';
import { AgentMonitor } from './aggregates/AgentMonitor';
import { AggregateSelector, type AggregateView } from './aggregates/AggregateSelector';
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

  const [aggregateView, setAggregateView] = useState<AggregateView>('all');
  const [showEventRain, setShowEventRain] = useState(true);

  // Filter events based on aggregate view
  const filteredEvents = useMemo(() => {
    if (aggregateView === 'all') return events;
    return events.filter(e => 
      e.aggregate?.toLowerCase() === aggregateView.toLowerCase()
    );
  }, [events, aggregateView]);

  // Calculate aggregate counts
  const aggregateCounts = useMemo(() => {
    return {
      workflow: events.filter(e => e.aggregate?.toLowerCase() === 'workflow').length,
      agent: events.filter(e => e.aggregate?.toLowerCase() === 'agent').length,
      system: events.filter(e => e.aggregate?.toLowerCase() === 'system').length
    };
  }, [events]);

  // Extract agent data from events
  const agentData = useMemo(() => {
    const agents: Record<string, any> = {};
    
    events
      .filter(e => e.aggregate?.toLowerCase() === 'agent')
      .forEach(event => {
        const agentId = String(event.attributes?.AGENT_ID || event.id || 'unknown');
        const agentName = event.eventName?.includes('_') 
          ? event.eventName.split('_')[0] 
          : event.eventName;
        
        if (agentId && agentId !== 'unknown' && !agents[agentId]) {
          agents[agentId] = {
            id: agentId,
            name: agentName,
            status: 'idle',
            eventCount: 0,
            startTime: event.timestamp,
            lastAction: event.eventName,
            progress: 0
          };
        }
        
        if (agents[agentId]) {
          agents[agentId].eventCount++;
          agents[agentId].lastAction = event.eventName || 'unknown';
          
          // Update status based on event
          const eventName = event.eventName || '';
          if (eventName.includes('STARTED')) {
            agents[agentId].status = 'active';
            agents[agentId].progress = 25;
          } else if (eventName.includes('EXECUTING') || eventName.includes('EXECUTED')) {
            agents[agentId].status = 'active';
            agents[agentId].progress = 60;
          } else if (eventName.includes('COMPLETED')) {
            agents[agentId].status = 'completed';
            agents[agentId].progress = 100;
            agents[agentId].endTime = event.timestamp;
          } else if (eventName.includes('FAILED')) {
            agents[agentId].status = 'failed';
            agents[agentId].endTime = event.timestamp;
          }
        }
        
        // Extract parent/child relationships
        if (event.attributes?.PARENT) {
          agents[agentId].parentAgent = event.attributes.PARENT;
        }
      });
    
    return agents;
  }, [events]);

  return (
    <div className="relative min-h-screen">
      {/* Event Rain Background */}
      {/* {showEventRain && (
        <EventRain 
          events={events}
          active={connectionStatus === 'connected'}
          intensity="medium"
          className="fixed inset-0 pointer-events-none"
        />
      )} */}
      
      <div className="relative z-10 space-y-6">
        {/* Enhanced real-time indicators */}
        <LiveEventPulse 
          connectionStatus={connectionStatus}
          metrics={metrics}
        />

        {/* Aggregate Selector */}
        {/* <AggregateSelector
          currentView={aggregateView}
          onViewChange={setAggregateView}
          counts={aggregateCounts}
        /> */}

        {/* Live Timeline */}
        <LiveTimeline
          events={filteredEvents}
          timeWindow={60}
          autoScroll={true}
          showDensity={true}
        />

        {/* Real-time metrics dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EventVelocityMeter metrics={metrics} />
          
          {/* Agent Monitor for agent aggregate view
          {aggregateView === 'agent' || aggregateView === 'all' ? (
            <AgentMonitor 
              agents={agentData}
              events={filteredEvents}
            />
          ) : (
            <div className="lg:col-span-1">
              <ConnectionStatus 
                status={connectionStatus}
                onReconnect={connect}
                onDisconnect={disconnect}
              />
            </div>
          )} */}
        </div>

        {/* Workflow and Agent Orchestration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkflowSwimlanes events={filteredEvents} />
          <AgentHierarchy events={filteredEvents} />
        </div>

        {/* Event controls */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Event Stream</h2>
            <p className="text-sm text-muted-foreground">
              Real-time events from the API ({filteredEvents.length} events)
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
          events={filteredEvents} 
          loading={false}
          emptyMessage="Waiting for events..."
        />
      </div>

      {/* Stream Ticker at bottom */}
      <StreamTicker
        events={events}
        speed="auto"
        position="bottom"
      />
    </div>
  );
}