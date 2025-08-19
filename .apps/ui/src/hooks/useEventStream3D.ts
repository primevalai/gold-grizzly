'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Event interface for 3D visualization
 */
export interface Event3D {
  id: string;
  aggregate: string;
  eventName: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
  riverPosition?: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Connection status for the event stream
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Metrics for the event stream
 */
export interface EventStreamMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  lastEventTime?: string;
  connectionUptime: number;
  workflowCount: number;
  agentCount: number;
}

/**
 * Custom hook for managing EventSource connection with 3D positioning
 */
export function useEventStream3D(url: string) {
  const [events, setEvents] = useState<Event3D[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState<EventStreamMetrics>({
    totalEvents: 0,
    eventsPerSecond: 0,
    connectionUptime: 0,
    workflowCount: 0,
    agentCount: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const eventCounterRef = useRef<number>(0);
  const lastSecondEventsRef = useRef<number[]>([]);

  // Calculate river position for new events
  const calculateRiverPosition = useCallback((event: Event3D, existingEvents: Event3D[]) => {
    // Base position on the main river
    let baseY = 0;
    
    // If this is a workflow event, position it along the river
    if (event.aggregate.toLowerCase() === 'workflow') {
      baseY = (Math.random() - 0.5) * 8; // Random position along river height
      return {
        x: (Math.random() - 0.5) * 0.6, // Slight x variation for natural flow
        y: baseY,
        z: 0
      };
    }
    
    // If this is an agent event, try to position it near its workflow
    if (event.aggregate.toLowerCase() === 'agent' && event.attributes?.WORKFLOW_ID) {
      const workflowEvent = existingEvents.find(e => 
        e.aggregate.toLowerCase() === 'workflow' && 
        e.attributes?.WORKFLOW_ID === event.attributes?.WORKFLOW_ID
      );
      
      if (workflowEvent?.riverPosition) {
        return {
          x: workflowEvent.riverPosition.x + (Math.random() - 0.5) * 1.5,
          y: workflowEvent.riverPosition.y - (Math.random() * 0.5),
          z: 0
        };
      }
    }
    
    // Default positioning for system events or orphaned events
    return {
      x: (Math.random() - 0.5) * 0.8,
      y: (Math.random() - 0.5) * 8,
      z: 0
    };
  }, []);

  // Update metrics
  const updateMetrics = useCallback(() => {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    
    // Clean old event counts (keep only last 10 seconds)
    lastSecondEventsRef.current = lastSecondEventsRef.current.filter(
      timestamp => currentSecond - timestamp <= 10
    );
    
    // Calculate events per second (average over last 10 seconds)
    const eventsPerSecond = lastSecondEventsRef.current.length / Math.min(10, 
      connectionStartTimeRef.current > 0 ? (now - connectionStartTimeRef.current) / 1000 : 1
    );
    
    const connectionUptime = connectionStartTimeRef.current > 0 
      ? (now - connectionStartTimeRef.current) / 1000 
      : 0;

    setMetrics(prevMetrics => ({
      ...prevMetrics,
      totalEvents: eventCounterRef.current,
      eventsPerSecond: Math.round(eventsPerSecond * 100) / 100,
      connectionUptime: Math.round(connectionUptime),
    }));
  }, []);

  // Connect to EventSource
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    connectionStartTimeRef.current = Date.now();

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
      };

      // Handle named event types from the API
      eventSource.addEventListener('event_created', (event) => {
        try {
          const rawEvent = JSON.parse(event.data);
          
          // Map API event format to UI Event3D format
          const parsedEvent: Event3D = {
            id: rawEvent.event_id || rawEvent.id,
            aggregate: rawEvent.aggregate_type || rawEvent.aggregate,
            eventName: rawEvent.event_type || rawEvent.eventName || rawEvent.event_name,
            timestamp: rawEvent.timestamp,
            attributes: rawEvent.attributes || {}
          };
          
          
          setEvents(currentEvents => {
            // Add river position to the new event
            const eventWithPosition = {
              ...parsedEvent,
              riverPosition: calculateRiverPosition(parsedEvent, currentEvents)
            };
            
            const newEvents = [eventWithPosition, ...currentEvents];
            
            // Limit to last 1000 events for performance
            return newEvents.slice(0, 1000);
          });

          // Update counters
          eventCounterRef.current++;
          const currentSecond = Math.floor(Date.now() / 1000);
          lastSecondEventsRef.current.push(currentSecond);

          // Update metrics for workflow and agent counts
          setMetrics(prevMetrics => {
            let workflowCount = prevMetrics.workflowCount;
            let agentCount = prevMetrics.agentCount;
            
            if (parsedEvent.aggregate.toLowerCase().includes('workflow')) {
              workflowCount++;
            } else if (parsedEvent.aggregate.toLowerCase().includes('agent')) {
              agentCount++;
            }
            
            return {
              ...prevMetrics,
              workflowCount,
              agentCount,
              lastEventTime: parsedEvent.timestamp,
            };
          });

        } catch (error) {
          console.error('Error parsing event_created:', error);
        }
      });

      // Handle heartbeat events
      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const heartbeatData = JSON.parse(event.data);
          setLastHeartbeat(new Date());
        } catch (error) {
          console.error('Error parsing heartbeat:', error);
        }
      });

      // Fallback for unnamed messages (should not be needed but good to have)
      eventSource.onmessage = (event) => {
        try {
          const rawEvent = JSON.parse(event.data);
          
          // Skip heartbeat events but log them
          if (rawEvent.status === 'connected') {
            return;
          }
          
          // Map API event format to UI Event3D format
          const parsedEvent: Event3D = {
            id: rawEvent.event_id || rawEvent.id,
            aggregate: rawEvent.aggregate_type || rawEvent.aggregate,
            eventName: rawEvent.event_type || rawEvent.eventName || rawEvent.event_name,
            timestamp: rawEvent.timestamp,
            attributes: rawEvent.attributes || {}
          };
          
          
          setEvents(currentEvents => {
            // Add river position to the new event
            const eventWithPosition = {
              ...parsedEvent,
              riverPosition: calculateRiverPosition(parsedEvent, currentEvents)
            };
            
            const newEvents = [eventWithPosition, ...currentEvents];
            
            // Limit to last 1000 events for performance
            return newEvents.slice(0, 1000);
          });

          // Update counters
          eventCounterRef.current++;
          const currentSecond = Math.floor(Date.now() / 1000);
          lastSecondEventsRef.current.push(currentSecond);

          // Update metrics for workflow and agent counts
          setMetrics(prevMetrics => {
            let workflowCount = prevMetrics.workflowCount;
            let agentCount = prevMetrics.agentCount;
            
            if (parsedEvent.aggregate.toLowerCase().includes('workflow')) {
              workflowCount++;
            } else if (parsedEvent.aggregate.toLowerCase().includes('agent')) {
              agentCount++;
            }
            
            return {
              ...prevMetrics,
              workflowCount,
              agentCount,
              lastEventTime: parsedEvent.timestamp,
            };
          });

        } catch (error) {
          console.error('Error parsing event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('💥 UI EventSource: Error occurred', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Error creating EventSource:', error);
      setConnectionStatus('error');
    }
  }, [url, calculateRiverPosition]);

  // Disconnect from EventSource
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionStatus('disconnected');
    connectionStartTimeRef.current = 0;
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
    eventCounterRef.current = 0;
    lastSecondEventsRef.current = [];
    setMetrics(prevMetrics => ({
      ...prevMetrics,
      totalEvents: 0,
      workflowCount: 0,
      agentCount: 0,
      lastEventTime: undefined,
    }));
  }, []);

  // Update metrics periodically
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(updateMetrics, 1000);
      return () => clearInterval(interval);
    }
  }, [connectionStatus, updateMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (url && connectionStatus === 'disconnected') {
      connect();
    }
  }, [url, connect, connectionStatus]);

  return {
    events,
    connectionStatus,
    lastHeartbeat,
    metrics,
    connect,
    disconnect,
    clearEvents,
  };
}