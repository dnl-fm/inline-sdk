import { z } from "zod";

/**
 * Error codes that can occur during message delivery
 * Maps to callback endpoint failures and network issues
 */
const errorCodes = [
  "HTTP_4XX",
  "HTTP_5XX",
  "TIMEOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "DNS_FAILURE",
  "NETWORK_ERROR",
  "UNKNOWN",
] as const;

export const ErrorCodeSchema: z.ZodType<typeof errorCodes[number]> = z.enum(
  errorCodes as any,
);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Event types that occur during message processing lifecycle
 * Tracks the complete journey of a message through the system
 */
const eventTypes = [
  "MESSAGE_RECEIVED",
  "PROCESSING_STARTED",
  "PROCESSING_COMPLETED",
  "PROCESSING_FAILED",
  "CALLBACK_INITIATED",
  "CALLBACK_SUCCEEDED",
  "CALLBACK_FAILED",
  "CALLBACK_RETRYING",
  "MANUAL_RETRY_TRIGGERED",
] as const;

export const EventTypeSchema: z.ZodType<typeof eventTypes[number]> = z.enum(
  eventTypes as any,
);
export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * ISO 8601 datetime validator
 * Ensures all timestamps are in strict ISO format
 */
const ISODateTime = z
  .string()
  .datetime()
  .describe("ISO 8601 formatted datetime string");

/**
 * Message ID validator
 * Format: message_ prefix + 26 character ULID (characters [0-7][0-9A-HJKMNP-TV-Z])
 */
const MessageId = z
  .string()
  .regex(/^message_[0-7][0-9A-HJKMNP-TV-Z]{25}$/, "Invalid message ID format")
  .describe("ULID-based message identifier");

/**
 * Callback error response schema
 * Describes errors that occurred during callback delivery
 */
export const CallbackErrorSchema: z.ZodObject<any> = z.object({
  id: z.string().describe("Unique error identifier"),
  message_id: MessageId.describe("ID of the message that failed"),
  error_code: ErrorCodeSchema.describe("Machine-readable error code"),
  error_message: z.string().describe("Human-readable error message"),
  http_status_code: z
    .number()
    .int()
    .optional()
    .describe("HTTP status code if applicable"),
  created_at: ISODateTime.describe("Timestamp when error occurred"),
  attempt_number: z
    .number()
    .int()
    .optional()
    .describe("Which retry attempt this error occurred on"),
  duration_ms: z
    .number()
    .int()
    .optional()
    .describe("Duration of failed callback request in milliseconds"),
});

export type CallbackError = z.infer<typeof CallbackErrorSchema>;

/**
 * Complete message response schema
 * Contains all metadata about a queued message
 */
export const MessageResponseSchema: z.ZodObject<any> = z.object({
  id: MessageId.describe("Unique message identifier"),
  callback_url: z.string().url().describe("Target URL for message delivery"),
  payload: z
    .record(z.unknown())
    .describe("Message payload (JSON serializable)"),
  callback_headers: z
    .record(z.string())
    .describe("HTTP headers to forward with callback"),
  status: z
    .enum(["pending", "processing", "completed", "failed", "dead_letter"])
    .describe("Current message status"),
  created_at: ISODateTime.describe("Timestamp when message was created"),
  updated_at: ISODateTime.describe("Timestamp of last status change"),
  scheduled_at: ISODateTime.optional().describe(
    "Timestamp when message is scheduled to process"
  ),
  retry_count: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of delivery attempts made"),
  max_retries: z
    .number()
    .int()
    .nonnegative()
    .describe("Maximum number of retries allowed"),
  next_retry_at: ISODateTime.optional().describe(
    "Timestamp of next scheduled retry"
  ),
  last_error: CallbackErrorSchema.optional().describe(
    "Details of the last callback error"
  ),
  timezone: z.string().optional().describe("Timezone for scheduled processing"),
  attempt_number: z
    .number()
    .int()
    .optional()
    .describe("Current attempt number"),
  event_count: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Number of timeline events"),
});

export type MessageResponse = z.infer<typeof MessageResponseSchema>;

/**
 * Health status response schema
 * Indicates overall system and component health
 */
export const HealthStatusSchema: z.ZodObject<any> = z.object({
  status: z
    .enum(["healthy", "degraded", "unhealthy"])
    .describe("Overall health status"),
  timestamp: ISODateTime.describe("Timestamp of health check"),
  uptime: z.number().describe("System uptime in seconds"),
  components: z
    .object({
      http: z
        .object({
          status: z
            .enum(["healthy", "degraded", "unhealthy"])
            .describe("HTTP component status"),
          secondsSinceUpdate: z
            .number()
            .describe("Seconds since component was last updated"),
          info: z.string().describe("Additional component information"),
        })
        .optional()
        .describe("HTTP component health status"),
    })
    .optional()
    .describe("Individual component health statuses"),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/**
 * Health ready response schema
 * Kubernetes-style readiness probe response
 */
export const HealthReadyResponseSchema: z.ZodObject<any> = z.object({
  status: z.literal("ready").describe("Readiness status"),
  timestamp: z.number().describe("Unix timestamp in milliseconds"),
});

export type HealthReadyResponse = z.infer<typeof HealthReadyResponseSchema>;

/**
 * Retry message response schema
 * Confirms message was queued for retry
 */
export const RetryMessageResponseSchema: z.ZodObject<any> = z.object({
  success: z.boolean().describe("Whether retry was successfully queued"),
  message_id: MessageId.describe("ID of the retried message"),
  message: z.string().describe("Confirmation message"),
});

export type RetryMessageResponse = z.infer<
  typeof RetryMessageResponseSchema
>;

/**
 * Timeline event schema
 * Single event in a message's processing history
 */
export const TimelineEventSchema: z.ZodObject<any> = z.object({
  type: EventTypeSchema.describe("Type of event"),
  timestamp: ISODateTime.describe("ISO 8601 timestamp when event occurred"),
  details: z
    .record(z.unknown())
    .nullable()
    .optional()
    .describe("Event-specific details and metadata"),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/**
 * Timeline response schema
 * Complete event history for a message
 */
export const TimelineResponseSchema: z.ZodObject<any> = z.object({
  message_id: z
    .string()
    .regex(/^message_[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
    .describe("ID of the message"),
  event_count: z.number().int().nonnegative().describe("Total number of events"),
  events: z
    .array(TimelineEventSchema)
    .describe("Chronological list of events"),
});

export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;

/**
 * Create message response schema
 * Returned when publishing a new message
 */
export const CreateMessageResponseSchema: z.ZodObject<any> = z.object({
  id: MessageId.describe("Unique message identifier"),
  created_at: ISODateTime.describe("Timestamp when message was created"),
  timezone: z.string().describe("IANA timezone used for scheduling"),
});

export type CreateMessageResponse = z.infer<
  typeof CreateMessageResponseSchema
>;

/**
 * Error statistics response schema
 * Aggregated error metrics grouped by error code
 */
export const ErrorStatsResponseSchema: z.ZodObject<any> = z.object({
  summary: z.object({
    total_errors: z.number().int().nonnegative().describe("Total number of errors"),
    error_types: z.number().int().nonnegative().describe("Number of unique error types"),
    timestamp: ISODateTime.describe("Timestamp of the report"),
  }),
  errors: z
    .array(
      z.object({
        error_code: ErrorCodeSchema.describe("Error code classification"),
        count: z.number().int().positive().describe("Total count of this error type"),
        avg_duration_ms: z.number().nonnegative().describe("Average duration in milliseconds"),
      })
    )
    .describe("Array of error statistics"),
});

export type ErrorStatsResponse = z.infer<typeof ErrorStatsResponseSchema>;

/**
 * Dead letter queue response schema
 * Errors for messages that failed all retry attempts
 */
export const DeadLetterResponseSchema: z.ZodObject<any> = z.object({
  summary: z.object({
    total_messages: z.number().int().nonnegative().describe("Total number of messages in DLQ"),
    total_errors: z.number().int().nonnegative().describe("Total number of errors"),
    timestamp: ISODateTime.describe("Timestamp of the report"),
  }),
  messages: z
    .record(z.array(CallbackErrorSchema))
    .describe("Errors grouped by message ID"),
});

export type DeadLetterResponse = z.infer<typeof DeadLetterResponseSchema>;

/**
 * Debug messages response schema
 * Messages grouped by status with summary counts
 */
export const DebugMessagesResponseSchema: z.ZodObject<any> = z.object({
  summary: z.object({
    total: z.number().int().nonnegative().describe("Total number of messages"),
    pending: z.number().int().nonnegative().describe("Count of pending messages"),
    processing: z.number().int().nonnegative().describe("Count of processing messages"),
    completed: z.number().int().nonnegative().describe("Count of completed messages"),
    failed: z.number().int().nonnegative().describe("Count of failed messages"),
    dead_letter: z.number().int().nonnegative().describe("Count of dead letter messages"),
  }),
  messages: z.object({
    pending: z.array(MessageResponseSchema),
    processing: z.array(MessageResponseSchema),
    completed: z.array(MessageResponseSchema),
    failed: z.array(MessageResponseSchema),
    dead_letter: z.array(MessageResponseSchema),
  }),
});

export type DebugMessagesResponse = z.infer<typeof DebugMessagesResponseSchema>;

/**
 * Debug stats response schema
 * Database and storage configuration information
 */
export const DebugStatsResponseSchema: z.ZodObject<any> = z.object({
  timestamp: ISODateTime.describe("Timestamp of the report"),
  database: z.string().describe("Database type"),
  storage: z.string().describe("Storage configuration"),
  location: z.string().describe("Database file location"),
  note: z.string().describe("Additional notes about storage"),
});

export type DebugStatsResponse = z.infer<typeof DebugStatsResponseSchema>;
