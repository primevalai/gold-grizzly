'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiverFlow } from './RiverFlow';
import { WorkflowNode } from './WorkflowNode';
import { AgentBranch } from './AgentBranch';
import { AutoFollowToggle } from './AutoFollowToggle';
import { Heart, Activity } from 'lucide-react';
import type { Event3D } from '@/hooks/useEventStream3D';

interface EventRiver2DProps {
  events?: Event3D[];
  lastHeartbeat?: Date | null;
  onWorkflowClick?: (workflowId: string) => void;
  onAgentClick?: (agentId: string) => void;
  className?: string;
}

/**
 * 2D scrollable EventRiver with auto-follow functionality
 */
export function EventRiver2D({
  events = [],
  lastHeartbeat,
  onWorkflowClick,
  onAgentClick,
  className = ''
}: EventRiver2DProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const lastScrollTopRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Extract workflows from events (newest first)
  const workflows = useMemo(() => {
    const workflowMap = new Map();
    
    events.forEach(event => {
      let workflowId = null;
      
      // Check if this is a direct workflow event
      if (event.aggregate?.toLowerCase().includes('workflow')) {
        workflowId = event.id || event.attributes?.workflow_id || event.attributes?.WORKFLOW_ID;
      }
      
      // Check if this is an agent event with a workflow_id
      if (event.aggregate?.toLowerCase().includes('agent')) {
        workflowId = event.attributes?.workflow_id || event.attributes?.WORKFLOW_ID;
      }
      
      if (workflowId && !workflowMap.has(workflowId)) {
        workflowMap.set(workflowId, {
          id: workflowId,
          timestamp: event.timestamp,
          events: []
        });
      }
      
      if (workflowId) {
        const workflow = workflowMap.get(workflowId);
        if (workflow) {
          workflow.events.push(event);
          // Update timestamp to latest event
          if (new Date(event.timestamp) > new Date(workflow.timestamp)) {
            workflow.timestamp = event.timestamp;
          }
        }
      }
    });
    
    // Sort workflows by timestamp (newest first)
    return Array.from(workflowMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events]);

  // Extract agents grouped by workflow
  const agentsByWorkflow = useMemo(() => {
    const agentMap = new Map<string, Map<string, Event3D[]>>();
    
    events
      .filter(e => e.aggregate?.toLowerCase().includes('agent'))
      .forEach(event => {
        const workflowId = String(
          event.attributes?.workflow_id || 
          event.attributes?.WORKFLOW_ID || 
          'orphaned'
        );
        const agentId = String(
          event.attributes?.agent_id || 
          event.attributes?.AGENT_ID || 
          event.id
        );
        
        if (!agentMap.has(workflowId)) {
          agentMap.set(workflowId, new Map());
        }
        
        const workflowMap = agentMap.get(workflowId)!;
        if (!workflowMap.has(agentId)) {
          workflowMap.set(agentId, []);
        }
        
        workflowMap.get(agentId)!.push(event);
      });
    
    return agentMap;
  }, [events]);

  // Auto-scroll to top when new events arrive (if following)
  useEffect(() => {
    if (isFollowing && scrollRef.current && events.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length, isFollowing]);

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    const { scrollTop } = scrollRef.current;
    
    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // If user scrolled down and we're in follow mode, disable following
    if (scrollTop > 50 && isFollowing) {
      setIsFollowing(false);
    }
    
    // If user scrolled back to top, potentially re-enable following
    if (scrollTop <= 10 && !isFollowing) {
      // Set timeout to avoid rapid toggling
      scrollTimeoutRef.current = setTimeout(() => {
        if (scrollRef.current && scrollRef.current.scrollTop <= 10) {
          setIsFollowing(true);
        }
      }, 1000);
    }
    
    lastScrollTopRef.current = scrollTop;
  }, [isFollowing]);

  const handleWorkflowClick = (workflowId: string) => {
    setSelectedWorkflow(prev => prev === workflowId ? null : workflowId);
    setSelectedAgent(null);
    onWorkflowClick?.(workflowId);
  };

  const handleAgentClick = (agentId: string) => {
    setSelectedAgent(prev => prev === agentId ? null : agentId);
    onAgentClick?.(agentId);
  };

  const handleFollowToggle = (following: boolean) => {
    setIsFollowing(following);
    if (following && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  const formatHeartbeatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  return (
    <div className={`relative h-full flex flex-col bg-background ${className}`}>
      {/* Header */}
      <div className="flex-none p-4 bg-background border-b border-border z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-foreground">
              FlowState EventRiver
            </h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Heart className={`w-4 h-4 ${lastHeartbeat ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
              <span>Last: {formatHeartbeatTime(lastHeartbeat)}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>{workflows.length} workflows</span>
              <span>•</span>
              <span>{events.length} events</span>
            </div>
            <AutoFollowToggle
              isFollowing={isFollowing}
              onToggle={handleFollowToggle}
            />
          </div>
        </div>
      </div>

      {/* River Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Animated River Background */}
        <RiverFlow isActive={events.length > 0} />
        
        {/* Scrollable Event Container */}
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
          onScroll={handleScroll}
        >
          <div className="min-h-full p-6 pt-12">
            {/* New events indicator */}
            {isFollowing && events.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 text-center"
              >
                <div className="inline-flex items-center space-x-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200 px-3 py-1 rounded-full text-xs">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                  <span>Following live events</span>
                </div>
              </motion.div>
            )}

            {/* No events state */}
            {workflows.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Activity className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Waiting for events...</p>
                <p className="text-sm">Events will flow down the river as they arrive</p>
              </div>
            )}

            {/* Workflow Nodes */}
            <AnimatePresence>
              {workflows.map((workflow, index) => {
                const workflowEvents = workflow.events.filter(e => 
                  e.aggregate?.toLowerCase().includes('workflow') ||
                  (e.aggregate?.toLowerCase().includes('agent') && 
                   (e.attributes?.workflow_id === workflow.id || e.attributes?.WORKFLOW_ID === workflow.id))
                );
                
                const workflowAgents = agentsByWorkflow.get(workflow.id) || new Map();
                const agentEvents = Array.from(workflowAgents.values()).flat();

                return (
                  <div key={workflow.id} className="mb-6">
                    <WorkflowNode
                      workflowId={workflow.id}
                      events={workflowEvents}
                      agentEvents={agentEvents}
                      onClick={handleWorkflowClick}
                    />
                    
                    {/* Agent Branches */}
                    <AnimatePresence>
                      {Array.from(workflowAgents.entries()).map(([agentId, events], agentIndex) => (
                        <AgentBranch
                          key={agentId}
                          agentId={agentId}
                          agentName={events[0]?.attributes?.agent_name}
                          events={events}
                          workflowId={workflow.id}
                          index={agentIndex}
                          onClick={handleAgentClick}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                );
              })}
            </AnimatePresence>

            {/* Bottom spacer for continued scrolling */}
            <div className="h-20" />
          </div>
        </div>
      </div>
    </div>
  );
}