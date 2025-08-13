import { EventCard } from './EventCard';
import type { EventData } from '@/types/events';

/**
 * Props for EventList component
 */
interface EventListProps {
  events: EventData[];
  loading?: boolean;
  emptyMessage?: string;
}

/**
 * List component that displays multiple events using EventCard
 */
export function EventList({ 
  events, 
  loading = false, 
  emptyMessage = 'No events found' 
}: EventListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          Loading events...
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <div className="text-muted-foreground">{emptyMessage}</div>
          <div className="text-xs text-muted-foreground">
            Events will appear here as they are created
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard key={event.event_id} event={event} />
      ))}
    </div>
  );
}