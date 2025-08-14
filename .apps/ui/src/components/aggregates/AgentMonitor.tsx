'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Activity, Clock, Zap, MessageSquare, CheckCircle, AlertCircle, XCircle, Loader2, ChevronRight } from 'lucide-react';

interface AgentData {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'failed' | 'idle';
  eventCount: number;
  tokenUsage?: number;
  startTime?: string;
  endTime?: string;
  parentAgent?: string;
  childAgents?: string[];
  lastAction?: string;
  progress?: number;
}

interface AgentMonitorProps {
  agents: Record<string, AgentData>;
  events: Array<{
    id: string;
    eventName: string;
    aggregate: string;
    timestamp: string;
    attributes?: Record<string, any>;
  }>;
  className?: string;
}

const STATUS_COLORS = {
  active: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-600 dark:text-green-400', ring: '#10B981' },
  completed: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', ring: '#3B82F6' },
  failed: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', ring: '#EF4444' },
  idle: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-600 dark:text-gray-400', ring: '#6B7280' }
};

const STATUS_ICONS = {
  active: <Loader2 className="w-4 h-4 animate-spin" />,
  completed: <CheckCircle className="w-4 h-4" />,
  failed: <XCircle className="w-4 h-4" />,
  idle: <Clock className="w-4 h-4" />
};

const AGENT_AVATARS = [
  '🤖', '🧠', '⚡', '🔮', '🎯', '🚀', '💡', '🔧', '📊', '🎨'
];

function getAgentAvatar(agentName: string): string {
  const hash = agentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AGENT_AVATARS[hash % AGENT_AVATARS.length];
}

function ProgressRing({ progress, status }: { progress: number; status: AgentData['status'] }) {
  const radius = 32;
  const strokeWidth = 4;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      height={radius * 2}
      width={radius * 2}
      className="absolute inset-0"
    >
      <circle
        stroke={STATUS_COLORS[status].ring}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference + ' ' + circumference}
        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="transform -rotate-90 origin-center"
      />
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        className="opacity-10"
      />
    </svg>
  );
}

export function AgentMonitor({ agents, events, className = '' }: AgentMonitorProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const agentStats = useMemo(() => {
    const stats = {
      total: Object.keys(agents).length,
      active: Object.values(agents).filter(a => a.status === 'active').length,
      completed: Object.values(agents).filter(a => a.status === 'completed').length,
      failed: Object.values(agents).filter(a => a.status === 'failed').length,
      totalTokens: Object.values(agents).reduce((sum, a) => sum + (a.tokenUsage || 0), 0)
    };
    return stats;
  }, [agents]);

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return 'N/A';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const toggleAgentExpansion = (agentId: string) => {
    setExpandedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Agent Monitor
            </h3>
          </div>
          
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <Activity className="w-3 h-3 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">{agentStats.active} active</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-3 h-3 text-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">{agentStats.completed} done</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400">{agentStats.totalTokens} tokens</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(agents).map(([agentId, agent]) => {
          const isExpanded = expandedAgents.has(agentId);
          const statusStyle = STATUS_COLORS[agent.status];
          
          return (
            <motion.div
              key={agentId}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative p-4 rounded-lg border-2 ${statusStyle.border} ${statusStyle.bg} 
                         cursor-pointer transition-all hover:shadow-lg`}
              onClick={() => toggleAgentExpansion(agentId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-16 h-16 flex items-center justify-center">
                      {agent.progress !== undefined && (
                        <ProgressRing progress={agent.progress} status={agent.status} />
                      )}
                      <div className="relative z-10 text-2xl">
                        {getAgentAvatar(agent.name)}
                      </div>
                    </div>
                    {agent.status === 'active' && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                      {agent.name}
                    </h4>
                    <div className={`flex items-center space-x-1 mt-1 ${statusStyle.text}`}>
                      {STATUS_ICONS[agent.status]}
                      <span className="text-xs font-medium uppercase">{agent.status}</span>
                    </div>
                  </div>
                </div>

                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{agent.eventCount} events</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(agent.startTime, agent.endTime)}</span>
                </span>
              </div>

              {agent.lastAction && (
                <div className="mt-2 px-2 py-1 bg-white/50 dark:bg-gray-800/50 rounded text-xs text-gray-700 dark:text-gray-300">
                  <span className="opacity-60">Last:</span> {agent.lastAction}
                </div>
              )}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div className="space-y-2 text-xs">
                      {agent.parentAgent && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Parent:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {agents[agent.parentAgent]?.name || agent.parentAgent}
                          </span>
                        </div>
                      )}
                      
                      {agent.childAgents && agent.childAgents.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Children:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {agent.childAgents.length} agents
                          </span>
                        </div>
                      )}
                      
                      {agent.tokenUsage && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Tokens:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {agent.tokenUsage.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">ID:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300 text-[10px]">
                          {agentId.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {Object.keys(agents).length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No agents active</p>
        </div>
      )}
    </div>
  );
}