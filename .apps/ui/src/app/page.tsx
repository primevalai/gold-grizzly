'use client';

import { useState, useCallback } from 'react';
import { EventRiver2D } from '@/components/EventRiver2D';
import { useEventStream3D } from '@/hooks/useEventStream3D';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

/**
 * Home page component displaying the 2D scrollable event river
 */
export default function Home() {
  const { 
    events, 
    connectionStatus, 
    lastHeartbeat,
    metrics, 
    connect, 
    disconnect, 
    clearEvents 
  } = useEventStream3D('http://127.0.0.1:8765/events/stream');

  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const handleWorkflowClick = useCallback((workflowId: string) => {
    setSelectedWorkflow(prev => prev === workflowId ? null : workflowId);
    setSelectedAgent(null);
  }, []);

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgent(prev => prev === agentId ? null : agentId);
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

      {/* Main EventRiver2D */}
      <div className="flex-1 overflow-hidden">
        <EventRiver2D
          events={events}
          lastHeartbeat={lastHeartbeat}
          onWorkflowClick={handleWorkflowClick}
          onAgentClick={handleAgentClick}
        />
      </div>

      {/* Selection Info Panel */}
      {(selectedWorkflow || selectedAgent) && (
        <div className="absolute top-20 right-4 z-20 bg-card border border-border rounded-lg p-4 max-w-sm shadow-lg">
          {selectedWorkflow && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Workflow Selected</h3>
              <p className="text-sm text-card-foreground">ID: {selectedWorkflow}</p>
              <div className="text-xs text-muted-foreground">
                Events: {events.filter(e => 
                  e.aggregate?.toLowerCase() === 'workflow' && 
                  (e.attributes?.WORKFLOW_ID === selectedWorkflow || e.id === selectedWorkflow)
                ).length}
              </div>
            </div>
          )}
          
          {selectedAgent && (
            <div className="space-y-2 mt-4">
              <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">Agent Selected</h3>
              <p className="text-sm text-card-foreground">ID: {selectedAgent}</p>
              <div className="text-xs text-muted-foreground">
                Events: {events.filter(e => 
                  e.aggregate?.toLowerCase() === 'agent' && 
                  (e.attributes?.AGENT_ID === selectedAgent || e.id === selectedAgent)
                ).length}
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSelectedWorkflow(null); setSelectedAgent(null); }}
            className="mt-2 text-muted-foreground hover:text-foreground"
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
}