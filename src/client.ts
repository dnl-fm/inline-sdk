import type {
  InlineClientConfig,
  PublishOptions,
  MessageResponse,
  CreateMessageResponse,
  ListMessagesResponse,
  ListMessagesOptions,
  TimelineResponse,
  RetryMessageResponse,
  HealthStatus,
  HealthReadyResponse,
  ErrorStatsResponse,
  DeadLetterResponse,
  DebugMessagesResponse,
  DebugStatsResponse,
  CallbackError,
  MessagePayload,
  CallbackHeaders,
} from "./types";
import {
  InlineError,
  ApiError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors";

/**
 * TypeScript client for the Inline message queue API
 *
 * Provides methods to publish messages, manage message delivery, and query system status.
 * All methods are async and may throw InlineError or its subclasses on failure.
 *
 * @class InlineClient
 *
 * @example
 * ```typescript
 * import { InlineClient } from '@inline/sdk';
 *
 * const client = new InlineClient({
 *   apiUrl: 'https://api.inline.example.com',
 *   token: 'your-api-token',
 *   timeout: 30000
 * });
 *
 * // Publish a message
 * const result = await client.publish(
 *   'https://webhook.example.com/receive',
 *   { userId: 123, action: 'purchase' }
 * );
 *
 * console.log(`Message ID: ${result.id}`);
 * ```
 */
export class InlineClient {
  private apiUrl: string;
  private token: string;
  private timeout: number;

  /**
   * Initialize a new InlineClient
   * @param {InlineClientConfig} config - Client configuration
   * @throws {ValidationError} If apiUrl or token is missing
   *
   * @example
   * const client = new InlineClient({
   *   apiUrl: 'https://api.inline.example.com',
   *   token: 'your-token'
   * });
   */
  constructor(config: InlineClientConfig) {
    if (!config.apiUrl) {
      throw new ValidationError("apiUrl is required");
    }
    if (!config.token) {
      throw new ValidationError("token is required");
    }

    this.apiUrl = config.apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.token = config.token;
    this.timeout = config.timeout || 30000; // 30s default
  }

  /**
   * Internal method to make HTTP requests to the API with authentication
   * @private
   * @template T - Expected response type
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - API endpoint path
   * @param {Object} [options] - Request options
   * @param {any} [options.body] - Request body (will be JSON stringified)
   * @param {Object<string, any>} [options.query] - Query parameters to append to URL
   * @returns {Promise<T>} Parsed API response
   * @throws {AuthenticationError} On 401 Unauthorized
   * @throws {AuthorizationError} On 403 Forbidden
   * @throws {NotFoundError} On 404 Not Found
   * @throws {RateLimitError} On 429 Rate Limited
   * @throws {ServerError} On 5xx Server Error
   * @throws {ApiError} On other API errors
   * @throws {NetworkError} On network connectivity issues
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
    },
  ): Promise<T> {
    const url = new URL(path, this.apiUrl);

    // Add query parameters
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: CallbackHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different status codes
      if (response.status === 401) {
        throw new AuthenticationError("Invalid or expired token");
      }

      if (response.status === 403) {
        throw new AuthorizationError("Not authorized to access this resource");
      }

      if (response.status === 404) {
        throw new NotFoundError("Resource not found");
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        throw new RateLimitError(
          "Rate limited",
          retryAfter ? parseInt(retryAfter, 10) : undefined,
        );
      }

      if (response.status >= 500) {
        const text = await response.text();
        throw new ServerError(
          `Server error: ${text || response.statusText}`,
          response.status,
        );
      }

      if (!response.ok) {
        const text = await response.text();
        throw new ApiError(
          `API error: ${text || response.statusText}`,
          response.status,
          text,
        );
      }

      // Parse response
      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof InlineError) {
        throw error;
      }

      if (error instanceof TypeError) {
        throw new NetworkError("Network error", error as Error);
      }

      throw error;
    }
  }

  /**
   * Publish a message to the queue for delivery to a callback URL
   *
   * @async
   * @param {string} callbackUrl - Target URL where the message will be delivered via HTTP
   * @param {MessagePayload} payload - Message data (must be JSON-serializable)
   * @param {PublishOptions} [options] - Optional configuration for message delivery
   * @returns {Promise<CreateMessageResponse>} Response with message ID, creation timestamp, and timezone
   * @throws {ValidationError} If callbackUrl or payload is missing
   * @throws {NetworkError} If unable to reach API
   * @throws {InlineError} On other errors
   *
   * @example
   * // Simple publish (immediate delivery)
   * const response = await client.publish(
   *   'https://webhook.example.com/receive',
   *   { user_id: 123, action: 'order_placed' }
   * );
   * console.log('Message ID:', response.id);
   *
   * @example
   * // Schedule with relative delay
   * const response = await client.publish(
   *   'https://webhook.example.com/receive',
   *   { user_id: 123, action: 'order_placed' },
   *   {
   *     delay: '5m' // 5 minute delay
   *   }
   * );
   *
   * @example
   * // Schedule with absolute time
   * const response = await client.publish(
   *   'https://webhook.example.com/receive',
   *   { user_id: 123, action: 'order_placed' },
   *   {
   *     notBefore: '2024-10-21T14:30:00Z', // ISO 8601 absolute time
   *     headers: { 'X-API-Key': 'secret' }
   *   }
   * );
   *
   * @example
   * // Schedule with local time + timezone
   * const response = await client.publish(
   *   'https://webhook.example.com/receive',
   *   { user_id: 123, action: 'order_placed' },
   *   {
   *     notBefore: '2024-10-21T14:30:00', // Naive ISO time
   *     timezone: 'America/New_York', // IANA timezone identifier
   *     headers: { 'X-API-Key': 'secret' }
   *   }
   * );
   *
   * @example
   * // Specify callback HTTP method
   * const response = await client.publish(
   *   'https://webhook.example.com/receive',
   *   { user_id: 123, action: 'order_placed' },
   *   {
   *     method: 'PUT' // Use PUT for callback instead of POST
   *   }
   * );
   */
  async publish(
    callbackUrl: string,
    payload: MessagePayload,
    options?: PublishOptions,
  ): Promise<CreateMessageResponse> {
    if (!callbackUrl) {
      throw new ValidationError("callbackUrl is required");
    }

    // URL encode the callback URL for the path
    const encodedUrl = encodeURIComponent(callbackUrl);

    // Determine request method (default: POST unless method is specified)
    const httpMethod = options?.method ? options.method.toUpperCase() : "POST";

    // For GET requests, pass scheduling parameters as query params in URL
    if (httpMethod === "GET") {
      const query: Record<string, string> = {};

      if (options?.delay) {
        query["Queue-Delay"] = options.delay;
      }
      if (options?.notBefore) {
        query["Queue-notBefore"] = options.notBefore;
      }
      if (options?.timezone) {
        query["Queue-timezone"] = options.timezone;
      }
      if (options?.method) {
        query["Queue-Method"] = httpMethod;
      }

      // Add Queue-Forward-* query params for custom headers
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          query[`Queue-Forward-${key}`] = value;
        });
      }

      return this.request<CreateMessageResponse>(
        "GET",
        `/publish/${encodedUrl}`,
        Object.keys(query).length > 0 ? { query } : undefined,
      );
    }

    // For non-GET requests, build request body with payload and Queue-* fields
    const requestBody: Record<string, any> = { ...payload };

    // Add Queue-Forward-* fields for webhook headers
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        requestBody[`Queue-Forward-${key}`] = value;
      });
    }

    // Add Queue-Delay field for relative scheduling
    if (options?.delay) {
      requestBody["Queue-Delay"] = options.delay;
    }

    // Add Queue-notBefore field for absolute scheduling
    if (options?.notBefore) {
      requestBody["Queue-notBefore"] = options.notBefore;
    }

    // Add Queue-timezone field for timezone context
    if (options?.timezone) {
      requestBody["Queue-timezone"] = options.timezone;
    }

    // Add Queue-Method if method is specified
    if (options?.method) {
      requestBody["Queue-Method"] = httpMethod;
    }

    return this.request<CreateMessageResponse>(
      httpMethod,
      `/publish/${encodedUrl}`,
      { body: requestBody },
    );
  }

  /**
   * Retrieve a specific message by ID
   *
   * @async
   * @param {string} messageId - ID of the message to retrieve
   * @returns {Promise<MessageResponse>} Complete message data including status and retry info
   * @throws {ValidationError} If messageId is empty
   * @throws {NotFoundError} If message does not exist
   * @throws {InlineError} On other errors
   *
   * @example
   * const message = await client.getMessage('msg_123abc');
   * console.log(message.status);
   * console.log(message.retryCount);
   */
  async getMessage(messageId: string): Promise<MessageResponse> {
    if (!messageId) {
      throw new ValidationError("messageId is required");
    }

    return this.request<MessageResponse>("GET", `/messages/${messageId}`);
  }

  /**
   * Get a paginated list of all messages
   *
   * @async
   * @param {ListMessagesOptions} [options] - Pagination and filtering options
   * @returns {Promise<ListMessagesResponse>} Paginated list of messages and metadata
   * @throws {InlineError} On API errors
   *
   * @example
   * // Get first 10 messages (default)
   * const result = await client.listMessages();
   *
   * @example
   * // Get completed messages with pagination
   * const result = await client.listMessages({
   *   limit: 50,
   *   offset: 100,
   *   status: 'completed'
   * });
   * console.log(`Total messages: ${result.pagination.total}`);
   * console.log(`Has more: ${result.pagination.hasMore}`);
   */
  async listMessages(
    options?: ListMessagesOptions,
  ): Promise<ListMessagesResponse> {
    const query: Record<string, any> = {
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
    };

    if (options?.status) {
      query.status = options.status;
    }

    return this.request<ListMessagesResponse>("GET", "/messages", { query });
  }

  /**
   * @deprecated Use listMessages() instead
   */
  async getMessages(
    options?: ListMessagesOptions,
  ): Promise<ListMessagesResponse> {
    return this.listMessages(options);
  }

  /**
   * Get the timeline of events for a specific message
   *
   * Shows the complete history of state changes and events as the message is processed.
   *
   * @async
   * @param {string} messageId - ID of the message
   * @returns {Promise<TimelineResponse>} Chronological list of events
   * @throws {ValidationError} If messageId is empty
   * @throws {NotFoundError} If message does not exist
   * @throws {InlineError} On other errors
   *
   * @example
   * const timeline = await client.getMessageTimeline('msg_123abc');
   * for (const event of timeline.events) {
   *   console.log(`${event.type} at ${new Date(event.timestamp)}`);
   * }
   */
  async getMessageTimeline(messageId: string): Promise<TimelineResponse> {
    if (!messageId) {
      throw new ValidationError("messageId is required");
    }

    return this.request<TimelineResponse>(
      "GET",
      `/messages/${messageId}/timeline`,
    );
  }

  /**
   * Retry delivery of a failed or dead-letter message
   *
   * Resets the message status and attempts delivery again.
   *
   * @async
   * @param {string} messageId - ID of the message to retry
   * @returns {Promise<RetryMessageResponse>} Updated message with new retry info
   * @throws {ValidationError} If messageId is empty
   * @throws {NotFoundError} If message does not exist
   * @throws {InlineError} On other errors
   *
   * @example
   * const result = await client.retryMessage('msg_123abc');
   * console.log(`Retry count: ${result.retryCount}`);
   * console.log(`Next retry: ${new Date(result.nextRetryAt)}`);
   */
  async retryMessage(messageId: string): Promise<RetryMessageResponse> {
    if (!messageId) {
      throw new ValidationError("messageId is required");
    }

    return this.request<RetryMessageResponse>(
      "POST",
      `/messages/${messageId}/retry`,
    );
  }

  /**
   * Check the health status of the API and its components
   *
   * @async
   * @returns {Promise<HealthStatus>} Health status of API and components
   * @throws {InlineError} On errors
   *
   * @example
   * const health = await client.getHealth();
   * if (health.status === 'healthy') {
   *   console.log('All systems operational');
   * }
   */
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>("GET", "/health");
  }

  /**
   * Check if the API is ready to serve requests
   *
   * Readiness check is stricter than health check and ensures all dependencies are initialized.
   *
   * @async
   * @returns {Promise<HealthReadyResponse>} Readiness status
   * @throws {InlineError} On errors
   *
   * @example
   * const ready = await client.getHealthReady();
   * if (ready.status === 'ready') {
   *   console.log('API is ready to serve requests');
   * }
   */
  async getHealthReady(): Promise<HealthReadyResponse> {
    return this.request<HealthReadyResponse>("GET", "/health/ready");
  }

  /**
   * Get all messages grouped by their current status (debug endpoint)
   *
   * Useful for debugging and monitoring message distribution across states.
   *
   * @async
   * @returns {Promise<DebugMessagesResponse>} Messages grouped by status with summary counts
   * @throws {InlineError} On errors
   *
   * @example
   * const debug = await client.getDebugMessages();
   * console.log(`Total messages: ${debug.summary.total}`);
   * console.log(`Pending: ${debug.summary.pending}`);
   * console.log(`Failed: ${debug.summary.failed}`);
   * for (const message of debug.messages.pending) {
   *   console.log(`Message ${message.id}: ${message.status}`);
   * }
   */
  async getDebugMessages(): Promise<DebugMessagesResponse> {
    return this.request<DebugMessagesResponse>("GET", "/debug/messages");
  }

  /**
   * Get database and storage configuration information (debug endpoint)
   *
   * @async
   * @returns {Promise<DebugStatsResponse>} Database and storage configuration
   * @throws {InlineError} On errors
   *
   * @example
   * const stats = await client.getDebugStats();
   * console.log(`Database: ${stats.database}`);
   * console.log(`Storage: ${stats.storage}`);
   * console.log(`Location: ${stats.location}`);
   */
  async getDebugStats(): Promise<DebugStatsResponse> {
    return this.request<DebugStatsResponse>("GET", "/debug/stats");
  }

  /**
   * Get aggregated error statistics by error code
   *
   * @async
   * @returns {Promise<ErrorStatsResponse>} Error statistics grouped by code with summary
   * @throws {InlineError} On errors
   *
   * @example
   * const stats = await client.getErrorStats();
   * console.log(`Total errors: ${stats.summary.totalErrors}`);
   * for (const error of stats.errors) {
   *   console.log(`${error.errorCode}: ${error.count} occurrences`);
   * }
   */
  async getErrorStats(): Promise<ErrorStatsResponse> {
    return this.request<ErrorStatsResponse>("GET", "/errors/stats");
  }

  /**
   * Get all errors from the dead letter queue
   *
   * Dead letter contains messages that failed all retry attempts.
   *
   * @async
   * @returns {Promise<DeadLetterResponse>} Dead letter errors grouped by message
   * @throws {InlineError} On errors
   *
   * @example
   * const deadLetter = await client.getDeadLetterErrors();
   * console.log(`Total messages in DLQ: ${deadLetter.summary.totalMessages}`);
   * for (const [messageId, errors] of Object.entries(deadLetter.messages)) {
   *   console.log(`Message ${messageId}: ${errors.length} errors`);
   * }
   */
  async getDeadLetterErrors(): Promise<DeadLetterResponse> {
    return this.request<DeadLetterResponse>("GET", "/errors/deadletter");
  }

  /**
   * Get all errors for a specific error code
   *
   * @async
   * @param {string} code - Error code to filter by (e.g., 'TIMEOUT', 'HTTP_5XX')
   * @returns {Promise<CallbackError[]>} Array of errors matching the code
   * @throws {ValidationError} If code is empty
   * @throws {InlineError} On other errors
   *
   * @example
   * const timeoutErrors = await client.getErrorsByCode('TIMEOUT');
   * console.log(`Timeout errors: ${timeoutErrors.length}`);
   * for (const error of timeoutErrors) {
   *   console.log(`Message ${error.messageId}: ${error.errorMessage}`);
   * }
   */
  async getErrorsByCode(code: string): Promise<CallbackError[]> {
    if (!code) {
      throw new ValidationError("code is required");
    }

    const response = await this.request<{
      summary: { errorCode: string; count: number; timestamp: string };
      errors: CallbackError[];
    }>("GET", `/errors/by-code/${code}`);
    return response.errors;
  }

  /**
   * Get all errors that occurred while attempting to deliver a specific message
   *
   * @async
   * @param {string} messageId - ID of the message to get errors for
   * @returns {Promise<CallbackError[]>} Array of errors for the message
   * @throws {ValidationError} If messageId is empty
   * @throws {NotFoundError} If message does not exist
   * @throws {InlineError} On other errors
   *
   * @example
   * const errors = await client.getMessageErrors('message_123abc');
   * for (const error of errors) {
   *   console.log(`Attempt ${error.attemptNumber}: ${error.errorCode}`);
   * }
   */
  async getMessageErrors(messageId: string): Promise<CallbackError[]> {
    if (!messageId) {
      throw new ValidationError("messageId is required");
    }

    const response = await this.request<{
      summary: { messageId: string; errorCount: number; errorCodes: string[]; timestamp: string };
      errors: CallbackError[];
    }>("GET", `/errors/message/${messageId}`);
    return response.errors;
  }
}

// For backwards compatibility
export type { InlineClientConfig } from "./types";

// Re-export error classes
export * from "./errors";
