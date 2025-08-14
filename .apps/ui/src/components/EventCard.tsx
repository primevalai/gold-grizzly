import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EventData } from '@/types/events';

/**
 * Props for EventCard component
 */
interface EventCardProps {
  event: EventData;
}

/**
 * Format timestamp for display
 * @param timestamp - ISO timestamp string
 * @returns Formatted time string
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

/**
 * Get badge variant based on event type
 * @param eventType - The event type
 * @returns Badge variant
 */
function getBadgeVariant(eventType: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (eventType.toLowerCase()) {
    case 'error':
    case 'failure':
      return 'destructive';
    case 'warning':
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * Individual event card component displaying event details
 */
export function EventCard({ event }: EventCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{event.name || event.event_type}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {formatTimestamp(event.timestamp)}
            </CardDescription>
          </div>
          <Badge variant={getBadgeVariant(event.event_type)}>
            {event.event_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Event metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Event ID:</span>{' '}
              <span className="font-mono text-xs">{event.event_id}</span>
            </div>
            <div>
              <span className="font-medium">Aggregate:</span>{' '}
              <span className="font-mono text-xs">{event.aggregate_id}</span>
            </div>
            <div>
              <span className="font-medium">Version:</span>{' '}
              <span>{event.aggregate_version}</span>
            </div>
            {event.user_id && (
              <div>
                <span className="font-medium">User:</span>{' '}
                <span>{event.user_id}</span>
              </div>
            )}
          </div>

          {/* Agent-specific fields */}
          {(event.agent_name || event.agent_id || event.parent_agent_id || event.event_name) && (
            <div>
              <h4 className="font-medium text-sm mb-2">Agent Details:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {event.agent_name && (
                  <div>
                    <span className="font-medium">Agent Type:</span>{' '}
                    <span className="font-mono text-xs">{event.agent_name}</span>
                  </div>
                )}
                {event.agent_id && (
                  <div>
                    <span className="font-medium">Agent ID:</span>{' '}
                    <span className="font-mono text-xs">{event.agent_id}</span>
                  </div>
                )}
                {event.parent_agent_id && (
                  <div>
                    <span className="font-medium">Parent Agent:</span>{' '}
                    <span className="font-mono text-xs">{event.parent_agent_id}</span>
                  </div>
                )}
                {event.event_name && (
                  <div>
                    <span className="font-medium">Event Name:</span>{' '}
                    <span className="font-mono text-xs">{event.event_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workflow-specific fields */}
          {(event.workflow_id || event.user_prompt) && (
            <div>
              <h4 className="font-medium text-sm mb-2">Workflow Details:</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {event.workflow_id && (
                  <div>
                    <span className="font-medium">Workflow ID:</span>{' '}
                    <span className="font-mono text-xs">{event.workflow_id}</span>
                  </div>
                )}
                {event.user_prompt && (
                  <div>
                    <span className="font-medium">User Prompt:</span>{' '}
                    <span className="text-xs bg-muted p-2 rounded mt-1 block">{event.user_prompt}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System-specific fields */}
          {event.session_id && (
            <div>
              <h4 className="font-medium text-sm mb-2">System Details:</h4>
              <div className="text-sm">
                <div>
                  <span className="font-medium">Session ID:</span>{' '}
                  <span className="font-mono text-xs">{event.session_id}</span>
                </div>
              </div>
            </div>
          )}

          {/* Event attributes */}
          {event.attributes && Object.keys(event.attributes).length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Attributes:</h4>
              <div className="bg-muted rounded p-3">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(event.attributes, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Correlation and causation IDs */}
          {(event.correlation_id || event.causation_id) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              {event.correlation_id && (
                <div>
                  <span className="font-medium">Correlation:</span>{' '}
                  <span className="font-mono">{event.correlation_id}</span>
                </div>
              )}
              {event.causation_id && (
                <div>
                  <span className="font-medium">Causation:</span>{' '}
                  <span className="font-mono">{event.causation_id}</span>
                </div>
              )}
            </div>
          )}

          {/* Full internal event */}
          <div>
            <h4 className="font-medium text-sm mb-2">Full Internal Event:</h4>
            <div className="bg-muted rounded p-3">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}