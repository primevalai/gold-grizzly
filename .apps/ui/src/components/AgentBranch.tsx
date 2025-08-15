'use client';

import { motion } from 'framer-motion';
import { Bot, CheckCircle, AlertCircle, Clock, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EventData } from '@/types/events';

interface AgentBranchProps {
  agentId: string;
  agentName?: string;
  events: EventData[];
  workflowId: string;
  index: number;
  onClick?: (agentId: string) => void;
  className?: string;
}

/**
 * 2D representation of an agent branch in the EventRiver
 */
export function AgentBranch({ 
  agentId, 
  agentName,
  events, 
  workflowId,
  index,
  onClick,
  className = '' 
}: AgentBranchProps) {
  // Get the latest agent event
  const latestEvent = events
    .filter(e => 
      (e.attributes?.AGENT_ID === agentId || e.id === agentId) &&
      (e.attributes?.WORKFLOW_ID === workflowId || e.attributes?.workflow_id === workflowId)
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  // Determine agent status
  const getAgentStatus = () => {
    if (!latestEvent) return 'unknown';
    if (latestEvent.event_name?.includes('completed')) return 'completed';
    if (latestEvent.event_name?.includes('failed')) return 'failed';
    if (latestEvent.event_name?.includes('started') || latestEvent.event_name?.includes('active')) return 'active';
    return 'unknown';
  };

  const status = getAgentStatus();
  const eventCount = events.length;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />;
      case 'active': return <div className="w-3 h-3 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />;
      default: return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20';
      case 'failed': return 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20';
      case 'active': return 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20';
      default: return 'border-border bg-card/50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Calculate branch position offset
  const branchOffset = 16 + (index * 8); // Stagger branches

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.1, duration: 0.3, ease: 'easeOut' }}
      className={`relative ml-16 mb-2 animate-fade-in-up ${className}`}
      style={{ 
        marginLeft: `${4 + branchOffset}rem`,
        animationDelay: `${index * 100}ms`
      }}
    >
      {/* Branch connection line */}
      <div 
        className="absolute top-3 bg-gradient-to-r from-purple-400 to-pink-500 opacity-60"
        style={{
          left: `-${branchOffset + 8}px`,
          width: `${branchOffset + 8}px`,
          height: '1px'
        }}
      />
      
      {/* Agent tributary */}
      <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-purple-400 to-pink-500 opacity-40" />

      <Card 
        className={`cursor-pointer transition-all hover:shadow-sm ${getStatusColor()} text-xs`}
        onClick={() => onClick?.(agentId)}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <Bot className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="font-mono text-xs font-medium text-card-foreground">
                {agentName || agentId.slice(-8)}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <Badge 
                variant={status === 'unknown' ? 'secondary' : 'outline'} 
                className="text-[10px] px-1 py-0"
              >
                {status}
              </Badge>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center space-x-3 text-[10px] text-muted-foreground">
            <span>{eventCount} events</span>
            {latestEvent && (
              <>
                <span>•</span>
                <span>{formatTimestamp(latestEvent.timestamp)}</span>
              </>
            )}
          </div>

          {/* Latest event name */}
          {latestEvent && (
            <div className="mt-1 text-[10px] text-muted-foreground/70 truncate">
              {latestEvent.event_name}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}