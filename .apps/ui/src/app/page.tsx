import { EventStream } from '@/components/EventStream';

/**
 * Home page component displaying the event dashboard
 */
export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        {/* Page header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Event Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor real-time events from the API using Server-Sent Events
          </p>
        </div>

        {/* Event stream component */}
        <EventStream />
      </div>
    </div>
  );
}