'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, GitBranch, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EventData } from '@/types/events';

interface WorkflowNodeProps {
  workflowId: string;
  events: EventData[];
  agentEvents: EventData[];
  position?: { x: number; y: number };
  onClick?: (workflowId: string) => void;
  className?: string;
}

/**
 * 2D representation of a workflow in the EventRiver
 */
export function WorkflowNode({ 
  workflowId, 
  events, 
  agentEvents,
  position,
  onClick,
  className = '' 
}: WorkflowNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get the latest workflow event
  const latestEvent = events
    .filter(e => e.attributes?.WORKFLOW_ID === workflowId || e.id === workflowId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Determine workflow status
  const getWorkflowStatus = () => {
    if (!latestEvent) return 'unknown';
    if (latestEvent.event_name?.includes('completed')) return 'completed';
    if (latestEvent.event_name?.includes('failed')) return 'failed';
    if (latestEvent.event_name?.includes('started') || latestEvent.event_name?.includes('active')) return 'active';
    return 'unknown';
  };

  const status = getWorkflowStatus();
  const agentCount = agentEvents.length;
  const eventCount = events.length;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'active': return <div className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30';
      case 'failed': return 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30';
      case 'active': return 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30';
      default: return 'border-border bg-card';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative mb-4 animate-fade-in-up ${className}`}
      style={position ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
    >
      {/* River connection line */}
      <div className="absolute left-4 top-0 w-0.5 h-full bg-gradient-to-b from-cyan-400 to-blue-500 opacity-50" />
      
      {/* Workflow fork */}
      <div className="absolute left-4 top-6 w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500" />
      
      <Card 
        className={`ml-12 cursor-pointer transition-all hover:shadow-md ${getStatusColor()}`}
        onClick={() => {
          setIsExpanded(!isExpanded);
          onClick?.(workflowId);
        }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {isExpanded ? 
                <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              }
              <GitBranch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-mono text-sm font-medium text-card-foreground">
                {workflowId.slice(-8)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <Badge 
                variant={status === 'unknown' ? 'secondary' : 'outline'} 
                className="text-xs"
              >
                {status}
              </Badge>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span>{agentCount} agents</span>
            <span>{eventCount} events</span>
            {latestEvent && (
              <span>{formatTimestamp(latestEvent.timestamp)}</span>
            )}
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 pt-3 border-t border-border"
              >
                <div className="space-y-2">
                  {/* Latest event */}
                  {latestEvent && (
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium">Latest: {latestEvent.event_name}</div>
                      <div className="text-muted-foreground/70">
                        {formatTimestamp(latestEvent.timestamp)}
                      </div>
                    </div>
                  )}
                  
                  {/* Workflow ID */}
                  <div className="text-xs text-muted-foreground/70 font-mono">
                    ID: {workflowId}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}