import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConnectionStatus } from '@/types/events';

/**
 * Props for ConnectionStatus component
 */
interface ConnectionStatusProps {
  status: ConnectionStatus;
  onReconnect: () => void;
  onDisconnect: () => void;
}

/**
 * Format last heartbeat time
 * @param date - Last heartbeat date
 * @returns Formatted time string
 */
function formatLastSeen(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Component displaying connection status and controls
 */
export function ConnectionStatus({ 
  status, 
  onReconnect, 
  onDisconnect 
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Badge variant={status.connected ? 'default' : 'destructive'}>
          {status.connected ? 'Connected' : 'Disconnected'}
        </Badge>
        
        <div className="text-sm text-muted-foreground">
          {status.connected && status.lastHeartbeat && (
            <span>Last heartbeat: {formatLastSeen(status.lastHeartbeat)}</span>
          )}
          {status.error && (
            <span className="text-destructive">Error: {status.error}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status.connected ? (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={onReconnect}>
            Reconnect
          </Button>
        )}
      </div>
    </div>
  );
}