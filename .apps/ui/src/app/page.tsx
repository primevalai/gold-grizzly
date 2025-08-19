'use client';

import { useState, useCallback, useEffect } from 'react';
import { SwimlaneTimelineView } from '@/components/timeline';
import { useEventStream3D } from '@/hooks/useEventStream3D';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { TimelineWorkflow, TimelineAgent, TimelineEvent } from '@/components/timeline';

/**
 * Home page component displaying the timeline view
 */
export default function Home() {
  const { 
    events, 
    connectionStatus, 
    metrics, 
    connect, 
    disconnect, 
    clearEvents 
  } = useEventStream3D('http://127.0.0.1:8765/events/stream');
  
  // Fallback: fetch events from API if streaming isn't working
  const [apiEvents, setApiEvents] = useState([]);
  const [hasAttemptedApiFetch, setHasAttemptedApiFetch] = useState(false);
  
  // Fetch API events on mount
  useEffect(() => {
    if (!hasAttemptedApiFetch) {
      setHasAttemptedApiFetch(true);
      
      fetch('http://127.0.0.1:8765/events/?limit=50')
        .then(res => res.json())
        .then(data => {
          // Transform API events to Event3D format
          const transformed = data.map((event: any) => ({
            id: event.event_id,
            aggregate: event.aggregate_type,
            eventName: event.event_name,
            timestamp: event.timestamp,
            attributes: {
              ...event.attributes,
              // Ensure these workflow/agent IDs are available in attributes for extraction
              workflow_id: event.workflow_id || event.attributes?.workflow_id,
              agent_id: event.agent_id || event.attributes?.agent_id,
              agent_name: event.agent_name || event.attributes?.agent_name,
              user_prompt: event.user_prompt || event.attributes?.user_prompt,
              parent_agent_id: event.parent_agent_id || event.attributes?.parent_agent_id
            }
          }));
          setApiEvents(transformed);
        })
        .catch(err => console.error('Failed to fetch events:', err));
    }
  }, [hasAttemptedApiFetch]);

  // Use streaming events if available, otherwise API events
  const displayEvents = events.length > 0 ? events : apiEvents;
  

  const [selectedWorkflow, setSelectedWorkflow] = useState<TimelineWorkflow | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<TimelineAgent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const handleWorkflowClick = useCallback((workflow: TimelineWorkflow) => {
    setSelectedWorkflow(prev => prev?.id === workflow.id ? null : workflow);
    setSelectedAgent(null);
    setSelectedEvent(null);
  }, []);

  const handleAgentClick = useCallback((agent: TimelineAgent) => {
    setSelectedAgent(prev => prev?.id === agent.id ? null : agent);
    setSelectedEvent(null);
  }, []);

  const handleEventClick = useCallback((event: TimelineEvent) => {
    setSelectedEvent(prev => prev?.event_id === event.event_id ? null : event);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Controls Bar */}
      <div className="flex-none bg-card border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge 
              variant="secondary" 
              className={`${getStatusColor(connectionStatus)} text-white`}
            >
              {connectionStatus}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {metrics.eventsPerSecond}/s • {metrics.totalEvents} total
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href="/experimental">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <span>3D View</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
            
            {connectionStatus === 'connected' ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={disconnect}
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={connect}
              >
                Connect
              </Button>
            )}
            
            {events.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearEvents}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Timeline View */}
      <div className="flex-1 overflow-hidden">
        <SwimlaneTimelineView
          events={displayEvents}
          onWorkflowClick={handleWorkflowClick}
          onAgentClick={handleAgentClick}
          onEventClick={handleEventClick}
        />
      </div>

      {/* Selection Info Panel */}
      {(selectedWorkflow || selectedAgent || selectedEvent) && (
        <div className="absolute top-20 right-4 z-20 bg-card border border-border rounded-lg p-4 max-w-sm shadow-lg">
          {selectedWorkflow && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Workflow Selected</h3>
              <p className="text-sm text-card-foreground">
                {selectedWorkflow.name || `Workflow ${selectedWorkflow.id.slice(-8)}`}
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>ID: {selectedWorkflow.id}</div>
                <div>Agents: {selectedWorkflow.agents.length}</div>
                <div>Events: {selectedWorkflow.totalEvents}</div>
                <div>Status: {selectedWorkflow.status}</div>
                {selectedWorkflow.userPrompt && (
                  <div className="italic mt-2">&ldquo;{selectedWorkflow.userPrompt}&rdquo;</div>
                )}
              </div>
            </div>
          )}
          
          {selectedAgent && (
            <div className="space-y-2 mt-4">
              <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">Agent Selected</h3>
              <p className="text-sm text-card-foreground">{selectedAgent.name}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>ID: {selectedAgent.id}</div>
                <div>Events: {selectedAgent.events.length}</div>
                <div>Status: {selectedAgent.status}</div>
                <div>Started: {selectedAgent.startTime.toLocaleTimeString()}</div>
                {selectedAgent.parentAgentId && (
                  <div>Parent: {selectedAgent.parentAgentId}</div>
                )}
              </div>
            </div>
          )}

          {selectedEvent && (
            <div className="space-y-2 mt-4">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Event Selected</h3>
              <p className="text-sm text-card-foreground">{selectedEvent.displayName}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Type: {selectedEvent.event_type}</div>
                <div>Status: {selectedEvent.status}</div>
                <div>Time: {selectedEvent.startTime.toLocaleString()}</div>
                {selectedEvent.attributes && Object.keys(selectedEvent.attributes).length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Attributes:</div>
                    {Object.entries(selectedEvent.attributes).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { 
              setSelectedWorkflow(null); 
              setSelectedAgent(null); 
              setSelectedEvent(null);
            }}
            className="mt-2 text-muted-foreground hover:text-foreground"
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
}