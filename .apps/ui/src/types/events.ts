/**
 * TypeScript type definitions for events API
 */

/**
 * Event data structure from the API
 */
export interface EventData {
  event_id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  aggregate_version: number;
  timestamp: string;
  user_id?: string;
  causation_id?: string;
  correlation_id?: string;
  name?: string;
  attributes?: Record<string, unknown>;
  trace_id?: string;
  span_id?: string;
  kind?: string;
  status?: {
    code: string;
  };
}

/**
 * Server-Sent Event message structure
 */
export interface SSEMessage {
  event: 'event_created' | 'heartbeat' | 'error';
  data: string;
  id?: string;
}

/**
 * Connection status for SSE
 */
export interface ConnectionStatus {
  connected: boolean;
  lastHeartbeat?: Date;
  error?: string;
}

/**
 * Event filters for querying
 */
export interface EventFilters {
  event_type?: string;
  limit?: number;
  offset?: number;
}