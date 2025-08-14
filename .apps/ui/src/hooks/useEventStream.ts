'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EventData, ConnectionStatus } from '@/types/events';

/**
 * Enhanced event metrics for real-time monitoring
 */
export interface EventMetrics {
  eventsPerSecond: number;
  totalEvents: number;
  latencyMs: number;
  lastEventTime: Date | null;
  eventVelocityHistory: number[];
}

/**
 * Enhanced connection status with metrics
 */
export interface EnhancedConnectionStatus extends ConnectionStatus {
  latencyMs?: number;
  reconnectAttempts?: number;
}

/**
 * Custom hook for managing Server-Sent Events connection to event stream with enhanced metrics
 * @param url - The SSE endpoint URL
 * @returns Object with events, connection status, metrics, and control functions
 */
export function useEventStream(url: string) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<EnhancedConnectionStatus>({
    connected: false,
    reconnectAttempts: 0,
  });
  const [metrics, setMetrics] = useState<EventMetrics>({
    eventsPerSecond: 0,
    totalEvents: 0,
    latencyMs: 0,
    lastEventTime: null,
    eventVelocityHistory: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventTimestampsRef = useRef<number[]>([]);
  const connectTimeRef = useRef<number>(0);
  const velocityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate events per second based on recent event timestamps
   */
  const calculateEventsPerSecond = useCallback(() => {
    const now = Date.now();
    const recentEvents = eventTimestampsRef.current.filter(
      timestamp => now - timestamp < 1000 // Last 1 second
    );
    return recentEvents.length;
  }, []);

  /**
   * Update velocity metrics
   */
  const updateVelocityMetrics = useCallback(() => {
    const eventsPerSecond = calculateEventsPerSecond();
    setMetrics(prev => ({
      ...prev,
      eventsPerSecond,
      eventVelocityHistory: [
        ...prev.eventVelocityHistory.slice(-29), // Keep last 30 measurements
        eventsPerSecond
      ],
    }));
  }, [calculateEventsPerSecond]);

  /**
   * Connect to the SSE stream
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear velocity interval if exists
    if (velocityIntervalRef.current) {
      clearInterval(velocityIntervalRef.current);
    }

    try {
      connectTimeRef.current = Date.now();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        const latency = Date.now() - connectTimeRef.current;
        setConnectionStatus(prev => ({
          ...prev,
          connected: true,
          lastHeartbeat: new Date(),
          latencyMs: latency,
          reconnectAttempts: 0,
        }));

        // Start velocity tracking
        velocityIntervalRef.current = setInterval(updateVelocityMetrics, 1000);
      };

      eventSource.addEventListener('event_created', (event: MessageEvent) => {
        try {
          const receiveTime = Date.now();
          const rawEventData = JSON.parse(event.data);
          
          // Map fields for UI components
          const eventData: EventData = {
            ...rawEventData,
            // Add computed fields for UI components
            aggregate: rawEventData.aggregate_type?.replace('_aggregate', ''),
            id: rawEventData.event_id,
            eventName: rawEventData.event_name || rawEventData.event_type
          };
          
          // Calculate latency from event timestamp
          const eventTime = new Date(eventData.timestamp).getTime();
          const latency = receiveTime - eventTime;

          // Track event timestamp for velocity calculation
          eventTimestampsRef.current.push(receiveTime);
          // Keep only last 100 timestamps
          if (eventTimestampsRef.current.length > 100) {
            eventTimestampsRef.current = eventTimestampsRef.current.slice(-100);
          }

          setEvents(prev => {
            // Add new event and keep last 1000 events
            const updated = [eventData, ...prev];
            return updated.slice(0, 1000);
          });

          setMetrics(prev => ({
            ...prev,
            totalEvents: prev.totalEvents + 1,
            latencyMs: latency,
            lastEventTime: new Date(eventData.timestamp),
          }));
        } catch (error) {
          console.error('Error parsing event data:', error);
        }
      });

      eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
        try {
          const receiveTime = Date.now();
          const heartbeatData = JSON.parse(event.data);
          const heartbeatTime = new Date(heartbeatData.timestamp).getTime();
          const latency = receiveTime - heartbeatTime;

          setConnectionStatus(prev => ({
            ...prev,
            connected: true,
            lastHeartbeat: new Date(heartbeatData.timestamp),
            latencyMs: latency,
          }));
        } catch (error) {
          console.error('Error parsing heartbeat data:', error);
        }
      });

      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          if (event.data && event.data !== 'undefined') {
            const errorData = JSON.parse(event.data);
            setConnectionStatus(prev => ({
              ...prev,
              error: errorData.error,
            }));
          }
        } catch (error) {
          console.error('Error parsing error data:', error);
        }
      });

      eventSource.onerror = () => {
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: 'Connection lost',
          reconnectAttempts: (prev.reconnectAttempts || 0) + 1,
        }));

        // Clear velocity tracking
        if (velocityIntervalRef.current) {
          clearInterval(velocityIntervalRef.current);
          velocityIntervalRef.current = null;
        }

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error('Error connecting to event stream:', error);
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        error: 'Failed to connect',
        reconnectAttempts: (prev.reconnectAttempts || 0) + 1,
      }));
    }
  }, [url, updateVelocityMetrics]);

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

    if (velocityIntervalRef.current) {
      clearInterval(velocityIntervalRef.current);
      velocityIntervalRef.current = null;
    }

    setConnectionStatus({
      connected: false,
      reconnectAttempts: 0,
    });
  }, []);

  /**
   * Clear all events from the list and reset metrics
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
    eventTimestampsRef.current = [];
    setMetrics(prev => ({
      ...prev,
      totalEvents: 0,
      eventsPerSecond: 0,
      eventVelocityHistory: [],
      lastEventTime: null,
    }));
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
    metrics,
    connect,
    disconnect,
    clearEvents,
  };
}