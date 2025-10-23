/**
 * Inline SDK - TypeScript client for the Inline message queue API
 *
 * A complete TypeScript SDK for interacting with the Inline message queue service.
 * Provides type-safe methods to publish messages, manage delivery, and query system status.
 *
 * Features:
 * - Type-safe client for all Inline API endpoints
 * - Zod schema validation for request/response data
 * - Comprehensive error handling with specific error types
 * - Full TypeScript type definitions aligned with API responses
 *
 * @module @inline/sdk
 *
 * @example
 * ```typescript
 * import {
 *   InlineClient,
 *   type InlineClientConfig,
 *   type MessageResponse,
 *   WebhookError
 * } from '@inline/sdk';
 *
 * // Initialize client
 * const client = new InlineClient({
 *   apiUrl: 'https://api.inline.example.com',
 *   token: 'your-api-token'
 * });
 *
 * // Publish a message
 * const response = await client.publish(
 *   'https://webhook.example.com/events',
 *   {
 *     event: 'order.created',
 *     orderId: 12345,
 *     amount: 99.99
 *   }
 * );
 *
 * console.log(`Message published: ${response.id}`);
 *
 * // Get message with timeline
 * const message = await client.getMessage(response.id);
 * const timeline = await client.getMessageTimeline(response.id);
 * ```
 *
 * @example
 * ```typescript
 * // Validating responses with Zod schemas
 * import { MessageResponseSchema, validateMessageResponse } from '@inline/sdk';
 *
 * try {
 *   const validated = validateMessageResponse(someData);
 *   console.log('Valid message:', validated.id);
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 * }
 * ```
 *
 * @exports InlineClient - Main client class for API interactions
 * @exports InlineError - Base error class for SDK errors
 * @exports ApiError - API response errors
 * @exports NetworkError - Network connectivity errors
 * @exports ValidationError - Input validation errors
 * @exports AuthenticationError - Authentication failures (HTTP 401)
 * @exports AuthorizationError - Permission errors (HTTP 403)
 * @exports NotFoundError - Resource not found errors (HTTP 404)
 * @exports RateLimitError - Rate limit exceeded errors (HTTP 429)
 * @exports ServerError - Server errors (HTTP 5xx)
 * @exports WebhookError - Webhook callback delivery errors
 *
 * @exports Zod Schemas - For response validation:
 * - ErrorCodeSchema, EventTypeSchema
 * - MessageResponseSchema, HealthStatusSchema
 * - TimelineResponseSchema, TimelineEventSchema
 * - CallbackErrorSchema, RetryMessageResponseSchema
 *
 * @exports Validators - Helper functions for validation:
 * - parseMessageId(), validateTimestamp()
 * - validateMessageResponse(), validateTimelineResponse()
 * - validateCallbackError(), validateWithSchema()
 *
 * All error classes extend InlineError and include:
 * - `message`: Human-readable error description
 * - `code`: Machine-readable error identifier
 * - `status`: HTTP status code (when applicable)
 *
 * ISO 8601 Timestamps:
 * All timestamps in responses are ISO 8601 formatted strings (e.g., 2025-10-23T10:30:00.000Z)
 * Message IDs use ULID format: message_[0-7][0-9A-HJKMNP-TV-Z]{25}
 */

export { InlineClient, type InlineClientConfig } from "./client";
export * from "./errors";
export type * from "./types";
export {
  ErrorCodeSchema,
  EventTypeSchema,
  CallbackErrorSchema,
  MessageResponseSchema,
  HealthStatusSchema,
  HealthReadyResponseSchema,
  CreateMessageResponseSchema,
  RetryMessageResponseSchema,
  TimelineEventSchema,
  TimelineResponseSchema,
  ErrorStatsResponseSchema,
  DeadLetterResponseSchema,
  DebugMessagesResponseSchema,
  DebugStatsResponseSchema,
  type ErrorCode,
  type EventType,
  type CallbackError,
  type MessageResponse,
  type HealthStatus,
  type HealthReadyResponse,
  type CreateMessageResponse,
  type RetryMessageResponse,
  type TimelineEvent,
  type TimelineResponse,
  type ErrorStatsResponse,
  type DeadLetterResponse,
  type DebugMessagesResponse,
  type DebugStatsResponse,
} from "./schemas";
export {
  parseMessageId,
  validateTimestamp,
  validateMessageResponse,
  validateTimelineResponse,
  validateCallbackError,
  validateWithSchema,
} from "./validators";
