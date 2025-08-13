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
        </div>
      </CardContent>
    </Card>
  );
}