'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EventData, ConnectionStatus } from '@/types/events';

/**
 * Custom hook for managing Server-Sent Events connection to event stream
 * @param url - The SSE endpoint URL
 * @returns Object with events, connection status, and control functions
 */
export function useEventStream(url: string) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Connect to the SSE stream
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus({
          connected: true,
          lastHeartbeat: new Date(),
        });
      };

      eventSource.addEventListener('event_created', (event: MessageEvent) => {
        try {
          const eventData: EventData = JSON.parse(event.data);
          setEvents(prev => {
            // Add new event and keep last 1000 events
            const updated = [eventData, ...prev];
            return updated.slice(0, 1000);
          });
        } catch (error) {
          console.error('Error parsing event data:', error);
        }
      });

      eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
        try {
          const heartbeatData = JSON.parse(event.data);
          setConnectionStatus(prev => ({
            ...prev,
            connected: true,
            lastHeartbeat: new Date(heartbeatData.timestamp),
          }));
        } catch (error) {
          console.error('Error parsing heartbeat data:', error);
        }
      });

      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const errorData = JSON.parse(event.data);
          setConnectionStatus(prev => ({
            ...prev,
            error: errorData.error,
          }));
        } catch (error) {
          console.error('Error parsing error data:', error);
        }
      });

      eventSource.onerror = () => {
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: 'Connection lost',
        }));

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Error connecting to event stream:', error);
      setConnectionStatus({
        connected: false,
        error: 'Failed to connect',
      });
    }
  }, [url]);

  /**
   * Disconnect from the SSE stream
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus({
      connected: false,
    });
  }, []);

  /**
   * Clear all events from the list
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    events,
    connectionStatus,
    connect,
    disconnect,
    clearEvents,
  };
}