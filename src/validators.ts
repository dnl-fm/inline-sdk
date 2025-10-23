import { z } from "zod";
import {
  MessageResponseSchema,
  CallbackErrorSchema,
  TimelineResponseSchema,
  type MessageResponse,
  type TimelineResponse,
  type CallbackError,
} from "./schemas";

/**
 * Parses and validates a message ID in ULID format
 *
 * Expected format: message_[0-7][0-9A-HJKMNP-TV-Z]{25}
 * This is a "message_" prefix followed by 26 characters representing a ULID timestamp and random component.
 *
 * @param id - The message ID string to validate
 * @returns The valid message ID string
 * @throws {Error} If the message ID format is invalid
 *
 * @example
 * const messageId = parseMessageId('message_000004QYYDCF9PHB9C6VWVHZEZ');
 * console.log(messageId); // 'message_000004QYYDCF9PHB9C6VWVHZEZ'
 */
export function parseMessageId(id: string): string {
  const messageIdSchema = z
    .string()
    .regex(
      /^message_[0-7][0-9A-HJKMNP-TV-Z]{25}$/,
      "Invalid message ID format. Expected: message_[0-7][0-9A-HJKMNP-TV-Z]{25}"
    );

  const result = messageIdSchema.safeParse(id);
  if (!result.success) {
    throw new Error(result.error.errors[0]?.message || "Invalid message ID");
  }

  return result.data;
}

/**
 * Validates an ISO 8601 datetime string
 *
 * Ensures the timestamp is a valid ISO 8601 formatted string.
 * Zod's datetime() validator checks for proper ISO format.
 *
 * @param timestamp - The timestamp string to validate
 * @returns The valid ISO 8601 timestamp string
 * @throws {Error} If the timestamp format is invalid
 *
 * @example
 * const ts = validateTimestamp('2025-10-23T10:30:00.000Z');
 * console.log(ts); // '2025-10-23T10:30:00.000Z'
 */
export function validateTimestamp(timestamp: string): string {
  const datetimeSchema = z
    .string()
    .datetime()
    .describe("ISO 8601 formatted datetime string");

  const result = datetimeSchema.safeParse(timestamp);
  if (!result.success) {
    throw new Error(
      result.error.errors[0]?.message ||
        "Invalid timestamp format. Expected ISO 8601 format (e.g., 2025-10-23T10:30:00.000Z)"
    );
  }

  return result.data;
}

/**
 * Validates a complete message response object
 *
 * Ensures all required fields are present and have correct types,
 * and that all timestamps are in ISO 8601 format.
 *
 * @param data - The data to validate as a MessageResponse
 * @returns The validated MessageResponse object
 * @throws {Error} If validation fails, includes all validation errors
 *
 * @example
 * const messageResponse = validateMessageResponse({
 *   id: 'message_000004QYYDCF9PHB9C6VWVHZEZ',
 *   callbackUrl: 'https://example.com/webhook',
 *   payload: { event: 'test' },
 *   callbackHeaders: {},
 *   status: 'pending',
 *   createdAt: '2025-10-23T10:30:00.000Z',
 *   updatedAt: '2025-10-23T10:30:00.000Z',
 *   retryCount: 0,
 *   maxRetries: 3
 * });
 */
export function validateMessageResponse(data: unknown): MessageResponse {
  const result = MessageResponseSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`Invalid message response: ${errors}`);
  }

  return result.data;
}

/**
 * Validates a timeline response object
 *
 * Ensures the response contains a valid array of timeline events,
 * each with proper event type and ISO 8601 timestamps.
 *
 * @param data - The data to validate as a TimelineResponse
 * @returns The validated TimelineResponse object
 * @throws {Error} If validation fails
 *
 * @example
 * const timeline = validateTimelineResponse({
 *   events: [
 *     {
 *       type: 'MESSAGE_RECEIVED',
 *       timestamp: '2025-10-23T10:30:00.000Z'
 *     },
 *     {
 *       type: 'CALLBACK_INITIATED',
 *       timestamp: '2025-10-23T10:30:05.000Z'
 *     }
 *   ]
 * });
 */
export function validateTimelineResponse(data: unknown): TimelineResponse {
  const result = TimelineResponseSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`Invalid timeline response: ${errors}`);
  }

  return result.data;
}

/**
 * Validates a callback error object
 *
 * Ensures all required error fields are present and properly formatted.
 *
 * @param data - The data to validate as a CallbackError
 * @throws {Error} If validation fails
 *
 * @example
 * const error = validateCallbackError({
 *   id: 'err_123',
 *   messageId: 'message_000004QYYDCF9PHB9C6VWVHZEZ',
 *   errorCode: 'HTTP_5XX',
 *   errorMessage: 'Internal server error',
 *   createdAt: '2025-10-23T10:30:00.000Z'
 * });
 */
export function validateCallbackError(data: unknown): CallbackError {
  const result = CallbackErrorSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new Error(`Invalid callback error: ${errors}`);
  }

  return result.data;
}

/**
 * Creates a safe validation wrapper for any Zod schema
 *
 * Returns both the validated data (if successful) and error information.
 * Useful for error handling without exceptions.
 *
 * @param schema - The Zod schema to validate with
 * @param data - The data to validate
 * @returns Object with either data or error
 *
 * @example
 * const result = validateWithSchema(MessageResponseSchema, someData);
 * if ('error' in result) {
 *   console.error('Validation failed:', result.error);
 * } else {
 *   console.log('Valid message:', result.data);
 * }
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T } | { error: z.ZodError } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { error: result.error };
  }
  return { data: result.data };
}
