'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { EventData } from '@/types/events';

/**
 * Props for AgentHierarchy component
 */
interface AgentHierarchyProps {
  events: EventData[];
}

/**
 * Agent node in the hierarchy tree
 */
interface AgentNode {
  agentId: string;
  agentName?: string;
  parentAgentId?: string;
  workflowId?: string;
  events: EventData[];
  children: AgentNode[];
  status: 'active' | 'completed' | 'failed' | 'idle';
  depth: number;
  startTime: Date;
  lastActivity: Date;
}

/**
 * AgentHierarchy component for visualizing nested agent relationships
 */
export function AgentHierarchy({ events }: AgentHierarchyProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Build agent hierarchy tree
  const agentTree = buildAgentTree(events);

  const toggleNode = (agentId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedNodes(newExpanded);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Agent Hierarchy
          <Badge variant="outline">
            {agentTree.length} root agents
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {agentTree.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No agents detected yet
            </div>
          ) : (
            agentTree.map((node) => (
              <AgentTreeNode
                key={node.agentId}
                node={node}
                expanded={expandedNodes.has(node.agentId)}
                onToggle={() => toggleNode(node.agentId)}
                expandedNodes={expandedNodes}
                onToggleNode={toggleNode}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual agent tree node component
 */
function AgentTreeNode({
  node,
  expanded,
  onToggle,
  expandedNodes,
  onToggleNode,
}: {
  node: AgentNode;
  expanded: boolean;
  onToggle: () => void;
  expandedNodes: Set<string>;
  onToggleNode: (agentId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const indentWidth = node.depth * 20;

  const statusColors = {
    active: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    idle: 'bg-gray-400',
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: node.depth * 0.1 }}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
        style={{ marginLeft: indentWidth }}
      >
        {/* Workflow indicator instead of expand/collapse */}
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-accent" title={`Workflow: ${node.workflowId?.slice(0, 8) || 'none'}`} />
        </div>

        {/* Status indicator */}
        <motion.div
          className={`w-2 h-2 rounded-full ${statusColors[node.status]}`}
          animate={node.status === 'active' ? {
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          } : {}}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Agent info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {node.agentName || 'Unknown Agent'}
            </span>
            <Badge variant="outline" className="text-xs">
              {node.events.length}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {node.agentId.slice(0, 8)}... • {formatTimeAgo(node.lastActivity)}
          </div>
        </div>

        {/* Status badge */}
        <Badge variant={
          node.status === 'active' ? 'default' :
          node.status === 'completed' ? 'secondary' :
          node.status === 'failed' ? 'destructive' : 'outline'
        } size="sm">
          {node.status}
        </Badge>
      </motion.div>

    </div>
  );
}

/**
 * Build agent hierarchy tree from events
 */
function buildAgentTree(events: EventData[]): AgentNode[] {
  const agentMap = new Map<string, AgentNode>();

  // First pass: create all agent nodes
  events.forEach(event => {
    // For agent events, use aggregate_id as the agent_id, otherwise use agent_id from attributes or direct field
    const agentId = event.aggregate_type === 'agent_aggregate' 
      ? event.aggregate_id 
      : event.agent_id || (event.attributes?.agent_id as string) || (event.attributes?.AGENT_ID as string);
    
    if (!agentId) return;

    if (!agentMap.has(agentId)) {
      // Extract agent name from event type (e.g., "agent.testAgent.started" -> "testAgent")
      const agentName = event.event_type.match(/^agent\.([^.]+)/)?.[1] || event.agent_name;
      
      agentMap.set(agentId, {
        agentId: agentId,
        agentName: agentName,
        parentAgentId: event.parent_agent_id || (event.attributes?.parent_agent_id as string) || (event.attributes?.PARENT as string),
        workflowId: event.workflow_id || (event.attributes?.workflow_id as string) || (event.attributes?.WORKFLOW_ID as string),
        events: [],
        children: [],
        status: 'idle',
        depth: 0,
        startTime: new Date(event.timestamp),
        lastActivity: new Date(event.timestamp),
      });
    }

    const node = agentMap.get(agentId)!;
    node.events.push(event);
    
    const eventTime = new Date(event.timestamp);
    if (eventTime > node.lastActivity) {
      node.lastActivity = eventTime;
    }
    if (eventTime < node.startTime) {
      node.startTime = eventTime;
    }

    // Update agent name if not set
    if (!node.agentName && event.agent_name) {
      node.agentName = event.agent_name;
    }

    // Determine status
    if (node.events.some(e => e.event_type.includes('failed') || e.event_type.includes('error'))) {
      node.status = 'failed';
    } else if (node.events.some(e => e.event_type.includes('completed') || e.event_type.includes('finished'))) {
      node.status = 'completed';
    } else if (node.events.some(e => e.event_type.includes('started') || e.event_type.includes('running'))) {
      node.status = 'active';
    }
  });

  // Second pass: group by workflow and parent relationships
  const workflowGroups = new Map<string, AgentNode[]>();
  const rootNodes: AgentNode[] = [];
  
  agentMap.forEach(node => {
    // Group sibling agents by workflow instead of nesting
    const workflowId = node.workflowId || 'no-workflow';
    
    if (!workflowGroups.has(workflowId)) {
      workflowGroups.set(workflowId, []);
    }
    
    // All agents in the same workflow are siblings (depth 0)
    node.depth = 0;
    workflowGroups.get(workflowId)!.push(node);
  });
  
  // Convert workflow groups to flat root nodes (no nesting)
  workflowGroups.forEach(agents => {
    rootNodes.push(...agents);
  });

  // Sort by last activity (newest first)
  const sortNodes = (nodes: AgentNode[]) => {
    nodes.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(rootNodes);
  return rootNodes;
}

/**
 * Format time ago
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}