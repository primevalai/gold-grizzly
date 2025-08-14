'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { EventMetrics, EnhancedConnectionStatus } from '@/hooks/useEventStream';

/**
 * Props for LiveEventPulse component
 */
interface LiveEventPulseProps {
  connectionStatus: EnhancedConnectionStatus;
  metrics: EventMetrics;
}

/**
 * Live event pulse indicator showing real-time connection status and metrics
 */
export function LiveEventPulse({ connectionStatus, metrics }: LiveEventPulseProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-lg">
      {/* Connection Status with Pulse Animation */}
      <div className="flex items-center gap-2">
        <motion.div
          className={`w-3 h-3 rounded-full ${
            connectionStatus.connected 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}
          animate={connectionStatus.connected ? {
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <span className="text-sm font-medium">
          {connectionStatus.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Event Velocity */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Velocity:</span>
        <Badge variant="outline" className="font-mono">
          {metrics.eventsPerSecond}/s
        </Badge>
      </div>

      {/* Total Events */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Total:</span>
        <Badge variant="outline" className="font-mono">
          {metrics.totalEvents.toLocaleString()}
        </Badge>
      </div>

      {/* Latency */}
      {connectionStatus.latencyMs !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Latency:</span>
          <Badge 
            variant={connectionStatus.latencyMs > 1000 ? "destructive" : "outline"}
            className="font-mono"
          >
            {connectionStatus.latencyMs}ms
          </Badge>
        </div>
      )}

      {/* Reconnection Attempts */}
      {connectionStatus.reconnectAttempts > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Reconnects:</span>
          <Badge variant="secondary" className="font-mono">
            {connectionStatus.reconnectAttempts}
          </Badge>
        </div>
      )}

      {/* Last Event Time */}
      {metrics.lastEventTime && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Last Event:</span>
          <span className="text-xs font-mono">
            {formatTimeSince(metrics.lastEventTime)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Format time since last event
 */
function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  } else {
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}