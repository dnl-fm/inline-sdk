/**
 * Possible states of a message in the queue
 * @typedef {string} MessageStatus
 * @const
 * @description
 * - `pending`: Message waiting to be processed
 * - `processing`: Message is being delivered to callback
 * - `completed`: Message successfully delivered
 * - `failed`: Message failed to deliver but still has retries
 * - `dead_letter`: Message permanently failed after all retries exhausted
 */
export type MessageStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "dead_letter";

/**
 * Error codes for failed message deliveries
 * Maps to callback endpoint failures and network issues
 *
 * - `HTTP_4XX`: Client error from callback endpoint (4xx status code)
 * - `HTTP_5XX`: Server error from callback endpoint (5xx status code)
 * - `TIMEOUT`: Request to callback endpoint timed out
 * - `ECONNREFUSED`: Connection refused when reaching callback endpoint
 * - `ECONNRESET`: Connection reset when reaching callback endpoint
 * - `ENOTFOUND`: DNS resolution failed for callback hostname
 * - `DNS_FAILURE`: DNS lookup error
 * - `NETWORK_ERROR`: Generic network error
 * - `UNKNOWN`: Unknown error during callback delivery
 */
export type ErrorCode =
  | "HTTP_4XX"
  | "HTTP_5XX"
  | "TIMEOUT"
  | "ECONNREFUSED"
  | "ECONNRESET"
  | "ENOTFOUND"
  | "DNS_FAILURE"
  | "NETWORK_ERROR"
  | "UNKNOWN";

/**
 * Timeline event types for message processing history
 * Tracks the complete lifecycle of a message through the system
 *
 * - `MESSAGE_RECEIVED`: Message was received by the API
 * - `MESSAGE_SCHEDULED`: Message was scheduled for delivery
 * - `DELIVERY_ATTEMPT`: Callback delivery attempt was made
 * - `MESSAGE_COMPLETED`: Message successfully delivered
 * - `MESSAGE_FAILED`: Message failed to deliver
 * - `MESSAGE_RETRIED`: Message was retried
 */
export type EventType =
  | "MESSAGE_RECEIVED"
  | "MESSAGE_SCHEDULED"
  | "DELIVERY_ATTEMPT"
  | "MESSAGE_COMPLETED"
  | "MESSAGE_FAILED"
  | "MESSAGE_RETRIED";

/**
 * Any JSON object used as message payload
 * @typedef {Object<string, any>} MessagePayload
 */
export type MessagePayload = Record<string, any>;

/**
 * HTTP headers for callback requests
 * @typedef {Object<string, string>} CallbackHeaders
 */
export type CallbackHeaders = Record<string, string>;

/**
 * Request/Response types for API operations
 */

/**
 * Complete message response from API
 * Contains all metadata about a queued message
 *
 * @property {string} id - ULID-based unique message identifier (format: message_[0-7][0-9A-HJKMNP-TV-Z]{25})
 * @property {string} callbackUrl - Target URL where message will be delivered via HTTP POST
 * @property {MessagePayload} payload - Message data (JSON serializable object)
 * @property {CallbackHeaders} callbackHeaders - HTTP headers to forward with callback request
 * @property {MessageStatus} status - Current message status in the lifecycle
 * @property {string} createdAt - ISO 8601 timestamp when message was created
 * @property {string} updatedAt - ISO 8601 timestamp of last status change
 * @property {string} [scheduledAt] - ISO 8601 timestamp when message is scheduled for processing
 * @property {number} retryCount - Number of delivery attempts made so far
 * @property {number} maxRetries - Maximum number of retries allowed before dead letter
 * @property {string} [nextRetryAt] - ISO 8601 timestamp of next scheduled retry attempt
 * @property {CallbackError} [lastError] - Details of the most recent callback error
 * @property {string} [timezone] - Timezone used for scheduled message processing
 * @property {number} [attemptNumber] - Current attempt number in the retry sequence
 */
export interface MessageResponse {
  id: string;
  callbackUrl: string;
  payload: MessagePayload;
  callbackHeaders: CallbackHeaders;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  lastError?: CallbackError;
  timezone?: string;
  attemptNumber?: number;
}

/**
 * Response from publishing a message
 * @property {string} id - ULID-based unique identifier of the created message
 * @property {string} createdAt - ISO 8601 timestamp of message creation
 * @property {string} timezone - IANA timezone used for scheduling (default: "UTC")
 */
export interface CreateMessageResponse {
  id: string;
  createdAt: string;
  timezone: string;
}

/**
 * Readiness probe response for Kubernetes-style orchestration
 * @property {string} status - Readiness status ("ready")
 * @property {number} timestamp - Unix timestamp in milliseconds
 */
export interface HealthReadyResponse {
  status: "ready";
  timestamp: number;
}

/**
 * Single event in a message's processing timeline
 * Represents one event in the complete lifecycle history of a message
 *
 * @property {EventType} type - Type of event that occurred
 * @property {string} timestamp - ISO 8601 timestamp when event occurred
 * @property {Record<string, unknown>} [details] - Event-specific details and metadata
 */
export interface MessageEvent {
  type: EventType;
  timestamp: string;
  details?: Record<string, unknown> | null;
}

/**
 * Timeline history for a message
 * Contains the chronological list of events for a specific message
 *
 * @property {string} messageId - ID of the message
 * @property {number} eventCount - Total number of events in the timeline
 * @property {MessageEvent[]} events - Chronological list of events for the message
 */
export interface TimelineResponse {
  messageId: string;
  eventCount: number;
  events: MessageEvent[];
}

/**
 * Response from retrying a message
 * Confirmation that a message was successfully queued for retry
 *
 * @property {boolean} success - Whether the retry was successfully queued
 * @property {string} messageId - ULID of the retried message
 * @property {string} message - Confirmation or error message
 */
export interface RetryMessageResponse {
  success: boolean;
  messageId: string;
  message: string;
}

/**
 * Paginated list of messages
 * @typedef {Object} ListMessagesResponse
 * @property {MessageResponse[]} messages - Array of message objects
 * @property {Object} pagination - Pagination metadata
 * @property {number} pagination.limit - Number of results per page
 * @property {number} pagination.offset - Starting position in result set
 * @property {number} pagination.total - Total number of messages
 * @property {boolean} pagination.hasMore - Whether more results are available
 */
export interface ListMessagesResponse {
  messages: MessageResponse[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Options for listing messages
 * @typedef {Object} ListMessagesOptions
 * @property {number} [limit=10] - Number of results per page (max: 100)
 * @property {number} [offset=0] - Starting position in result set
 * @property {MessageStatus} [status] - Filter by message status
 */
export interface ListMessagesOptions {
  /** Number of results per page (default: 10, max: 100) */
  limit?: number;
  /** Starting position in result set (default: 0) */
  offset?: number;
  /** Filter by message status */
  status?: MessageStatus;
}

/**
 * Health status of the API and its components
 * Indicates overall system health and component status
 *
 * @property {string} status - Overall health status (healthy, degraded, or unhealthy)
 * @property {string} timestamp - ISO 8601 timestamp of health check
 * @property {number} uptime - System uptime in seconds
 * @property {Object} [components] - Optional health of individual components
 * @property {Object} [components.http] - HTTP component health status
 * @property {string} [components.http.status] - Component status (healthy, degraded, or unhealthy)
 * @property {number} [components.http.secondsSinceUpdate] - Seconds since component was last updated
 * @property {string} [components.http.info] - Additional component information
 */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  components?: {
    http?: {
      status: "healthy" | "degraded" | "unhealthy";
      secondsSinceUpdate: number;
      info: string;
    };
  };
}

/**
 * Error information for a failed callback delivery
 * Captures details about why a callback attempt failed
 *
 * @property {string} id - Unique error identifier
 * @property {string} messageId - ULID of the message that failed
 * @property {ErrorCode} errorCode - Machine-readable error classification
 * @property {string} errorMessage - Human-readable error description
 * @property {number} [httpStatusCode] - HTTP status code if response was received
 * @property {string} createdAt - ISO 8601 timestamp when error occurred
 * @property {number} [attemptNumber] - Which retry attempt this error occurred on
 * @property {number} [durationMs] - How long the failed request took in milliseconds
 */
export interface CallbackError {
  id: string;
  messageId: string;
  errorCode: ErrorCode;
  errorMessage: string;
  httpStatusCode?: number;
  createdAt: string;
  attemptNumber?: number;
  durationMs?: number;
}

/**
 * Statistics for errors by error code
 * Aggregated error metrics grouped by error classification
 *
 * @property {Object} summary - Summary statistics
 * @property {number} summary.totalErrors - Total number of errors
 * @property {number} summary.errorTypes - Number of unique error types
 * @property {string} summary.timestamp - ISO 8601 timestamp of the report
 * @property {Object[]} errors - Array of error statistics
 * @property {ErrorCode} errors[].errorCode - Error code classification
 * @property {number} errors[].count - Total count of this error type
 * @property {number} errors[].avgDurationMs - Average duration in milliseconds
 */
export interface ErrorStatsResponse {
  summary: {
    totalErrors: number;
    errorTypes: number;
    timestamp: string;
  };
  errors: Array<{
    errorCode: ErrorCode;
    count: number;
    avgDurationMs: number;
  }>;
}

/**
 * Dead letter queue errors
 * Contains errors for messages that failed all retry attempts
 *
 * @property {Object} summary - Summary statistics
 * @property {number} summary.totalMessages - Total number of messages in dead letter queue
 * @property {number} summary.totalErrors - Total number of errors
 * @property {string} summary.timestamp - ISO 8601 timestamp of the report
 * @property {Object<string, CallbackError[]>} messages - Errors grouped by message ID
 */
export interface DeadLetterResponse {
  summary: {
    totalMessages: number;
    totalErrors: number;
    timestamp: string;
  };
  messages: Record<string, CallbackError[]>;
}

/**
 * Debug endpoint response with messages grouped by status
 * @typedef {Object} DebugMessagesResponse
 * @property {Object} summary - Summary counts grouped by status
 * @property {number} summary.total - Total number of messages
 * @property {number} summary.pending - Count of pending messages
 * @property {number} summary.processing - Count of processing messages
 * @property {number} summary.completed - Count of completed messages
 * @property {number} summary.failed - Count of failed messages
 * @property {number} summary.dead_letter - Count of dead letter messages
 * @property {Object.<MessageStatus, MessageResponse[]>} messages - Messages grouped by status
 */
export interface DebugMessagesResponse {
  summary: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    dead_letter: number;
  };
  messages: {
    pending: MessageResponse[];
    processing: MessageResponse[];
    completed: MessageResponse[];
    failed: MessageResponse[];
    dead_letter: MessageResponse[];
  };
}

/**
 * Debug statistics for database and storage configuration
 * @typedef {Object} DebugStatsResponse
 * @property {string} timestamp - ISO 8601 timestamp of the report
 * @property {string} database - Database type (e.g., "SQLite (persistent)")
 * @property {string} storage - Storage configuration (e.g., "bun:sqlite with WAL mode")
 * @property {string} location - Database file location
 * @property {string} note - Additional notes about storage
 */
export interface DebugStatsResponse {
  timestamp: string;
  database: string;
  storage: string;
  location: string;
  note: string;
}

/**
 * Configuration for initializing InlineClient
 * @typedef {Object} InlineClientConfig
 * @property {string} apiUrl - Base URL of the Inline API (e.g., 'https://api.inline.example.com')
 * @property {string} token - Authentication token for API requests
 * @property {number} [timeout] - Request timeout in milliseconds (default: 30000)
 */
export interface InlineClientConfig {
  apiUrl: string;
  token: string;
  timeout?: number;
}

/**
 * Options for publishing a message
 * @typedef {Object} PublishOptions
 * @property {CallbackHeaders} [headers] - Custom HTTP headers to forward with callback (sent as Queue-Forward-* headers)
 * @property {string} [delay] - Relative delay before delivery (e.g., "5m", "1h", "30s", "2d")
 *   - Units: `ms`, `s`, `sec`, `m`, `min`, `h`, `hour`, `d`, `day`
 *   - Cannot be combined with `notBefore`
 * @property {string} [notBefore] - ISO 8601 absolute scheduling datetime for message delivery
 *   - Full format with timezone: `2024-10-21T14:30:00Z` or `2024-10-21T14:30:00-05:00`
 *   - Naive format (requires timezone property): `2024-10-21T14:30:00`
 *   - Cannot be combined with `delay`
 * @property {string} [timezone] - IANA timezone identifier for scheduling context (e.g., 'America/New_York', 'Europe/London')
 *   - Used with naive notBefore timestamps to interpret local time
 *   - Also provides context in responses for display purposes
 *   - See: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 *
 * @example
 * // Simple publish (immediate delivery)
 * await client.publish(url, payload);
 *
 * @example
 * // Schedule with relative delay
 * await client.publish(url, payload, {
 *   delay: '5m'  // 5 minute delay
 * });
 *
 * @example
 * // Schedule with absolute UTC time
 * await client.publish(url, payload, {
 *   notBefore: '2024-10-21T14:30:00Z'
 * });
 *
 * @example
 * // Schedule with local time and timezone
 * await client.publish(url, payload, {
 *   notBefore: '2024-10-21T14:30:00',
 *   timezone: 'America/New_York'
 * });
 *
 * @example
 * // Add custom headers to callback request
 * await client.publish(url, payload, {
 *   headers: { 'X-Custom-Header': 'value' }
 * });
 */
export interface PublishOptions {
  headers?: CallbackHeaders;
  delay?: string; // Relative delay (e.g., "5m", "1h")
  notBefore?: string; // ISO 8601 absolute scheduling datetime
  timezone?: string; // IANA timezone identifier
}
