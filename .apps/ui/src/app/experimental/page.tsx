'use client';

import { useState, useCallback } from 'react';
import { EventRiverScene } from '@/components/3d/EventRiver';
import { useEventStream3D } from '@/hooks/useEventStream3D';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Home page component displaying the immersive 3D event river
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
  const [showSettings, setShowSettings] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(6); // Default camera distance

  const handleWorkflowClick = useCallback((workflowId: string) => {
    setSelectedWorkflow(prev => prev === workflowId ? null : workflowId);
    setSelectedAgent(null); // Clear agent selection
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
    <div className="relative w-full h-full bg-black text-white overflow-hidden">
      {/* Immersive 3D Event River Scene */}
      <EventRiverScene 
        events={events}
        lastHeartbeat={lastHeartbeat}
        onWorkflowClick={handleWorkflowClick}
        onAgentClick={handleAgentClick}
        cameraDistance={zoomLevel}
      />
      
      {/* Overlay UI Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex justify-between items-start">
          {/* Title and Status */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">FlowState Event River</h1>
            <div className="flex items-center space-x-3">
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(connectionStatus)} text-white`}
              >
                {connectionStatus}
              </Badge>
              <span className="text-sm text-gray-300">
                {metrics.totalEvents} events | {metrics.eventsPerSecond}/s
              </span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            {connectionStatus === 'connected' ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={disconnect}
                className="bg-black/50 border-gray-600 text-white hover:bg-gray-800"
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={connect}
                className="bg-black/50 border-gray-600 text-white hover:bg-gray-800"
              >
                Connect
              </Button>
            )}
            {events.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearEvents}
                className="bg-black/50 border-gray-600 text-white hover:bg-gray-800"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">{metrics.totalEvents}</div>
              <div className="text-xs text-gray-400">Total Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">{metrics.workflowCount}</div>
              <div className="text-xs text-gray-400">Workflows</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{metrics.agentCount}</div>
              <div className="text-xs text-gray-400">Agents</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{Math.round(metrics.connectionUptime)}s</div>
              <div className="text-xs text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Info Panel */}
      {(selectedWorkflow || selectedAgent) && (
        <div className="absolute top-20 right-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 max-w-sm">
          {selectedWorkflow && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-orange-400">Workflow Selected</h3>
              <p className="text-sm text-gray-300">ID: {selectedWorkflow}</p>
              <div className="text-xs text-gray-400">
                Events: {events.filter(e => 
                  e.aggregate.toLowerCase() === 'workflow' && 
                  (e.attributes?.WORKFLOW_ID === selectedWorkflow || e.id === selectedWorkflow)
                ).length}
              </div>
            </div>
          )}
          
          {selectedAgent && (
            <div className="space-y-2 mt-4">
              <h3 className="text-lg font-semibold text-green-400">Agent Selected</h3>
              <p className="text-sm text-gray-300">ID: {selectedAgent}</p>
              <div className="text-xs text-gray-400">
                Events: {events.filter(e => 
                  e.aggregate.toLowerCase() === 'agent' && 
                  (e.attributes?.AGENT_ID === selectedAgent || e.id === selectedAgent)
                ).length}
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSelectedWorkflow(null); setSelectedAgent(null); }}
            className="mt-2 text-gray-400 hover:text-white"
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Settings Gear Icon */}
      <div className="absolute bottom-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="bg-black/50 border-gray-600 text-white hover:bg-gray-800 p-2"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 8v6m11-7h-6m-8 0H1m11-7a4 4 0 0 1 0 8m0-8a4 4 0 0 0 0 8"/>
          </svg>
        </Button>
      </div>

      {/* Settings Palette */}
      {showSettings && (
        <div className="absolute bottom-16 right-4 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-4 min-w-64">
          <h3 className="text-lg font-semibold text-white mb-3">Settings</h3>
          
          {/* Zoom Control */}
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Zoom Level</label>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-400">Far</span>
              <input
                type="range"
                min="2"
                max="15"
                step="0.5"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-400">Close</span>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Distance: {zoomLevel.toFixed(1)}
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
              className="w-full text-gray-400 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}