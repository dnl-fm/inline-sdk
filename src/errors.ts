import type { ErrorCode } from "./types";

/**
 * Base error class for all SDK errors
 * @class InlineError
 * @extends Error
 *
 * @example
 * try {
 *   // SDK operation
 * } catch (error) {
 *   if (error instanceof InlineError) {
 *     console.log(error.code); // Error code
 *     console.log(error.status); // HTTP status (if applicable)
 *   }
 * }
 */
export class InlineError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} code - Machine-readable error code for identifying the error type
   * @param {number} [status] - HTTP status code associated with the error
   */
  constructor(
    message: string,
    public code: string,
    public status?: number,
  ) {
    super(message);
    this.name = "InlineError";
  }
}

/**
 * Error thrown when the API returns an error response
 * @class ApiError
 * @extends InlineError
 *
 * @example
 * try {
 *   await client.publish(url, payload);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(`Status ${error.status}: ${error.message}`);
 *   }
 * }
 */
export class ApiError extends InlineError {
  /**
   * @param {string} message - Human-readable error message from the API
   * @param {number} status - HTTP status code
   * @param {any} [response] - Raw response data from the API
   */
  constructor(
    message: string,
    status: number,
    public response?: any,
  ) {
    super(message, "API_ERROR", status);
    this.name = "ApiError";
  }
}

/**
 * Error thrown when network issues occur (connection failures, timeouts, etc.)
 * @class NetworkError
 * @extends InlineError
 *
 * @example
 * try {
 *   await client.publish(url, payload);
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.log(`Network issue: ${error.message}`);
 *     console.log(error.originalError);
 *   }
 * }
 */
export class NetworkError extends InlineError {
  /**
   * @param {string} message - Description of the network error
   * @param {Error} [originalError] - The underlying Error object (e.g., from fetch)
   */
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

/**
 * Error thrown when input validation fails
 * @class ValidationError
 * @extends InlineError
 *
 * @example
 * try {
 *   await client.publish("", payload); // Missing callback URL
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.log(`Validation failed: ${error.message}`);
 *     console.log(error.details);
 *   }
 * }
 */
export class ValidationError extends InlineError {
  /**
   * @param {string} message - Description of the validation failure
   * @param {any} [details] - Additional validation details
   */
  constructor(
    message: string,
    public details?: any,
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when authentication fails (HTTP 401)
 * @class AuthenticationError
 * @extends InlineError
 *
 * @example
 * try {
 *   const client = new InlineClient({ apiUrl: 'https://api.example.com', token: 'invalid' });
 *   await client.getHealth();
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     console.log('Invalid or expired token');
 *   }
 * }
 */
export class AuthenticationError extends InlineError {
  /**
   * @param {string} [message="Authentication failed"] - Error message
   */
  constructor(message: string = "Authentication failed") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Error thrown when user lacks required permissions (HTTP 403)
 * @class AuthorizationError
 * @extends InlineError
 *
 * @example
 * try {
 *   await client.getHealth();
 * } catch (error) {
 *   if (error instanceof AuthorizationError) {
 *     console.log('Insufficient permissions for this operation');
 *   }
 * }
 */
export class AuthorizationError extends InlineError {
  /**
   * @param {string} [message="Not authorized"] - Error message
   */
  constructor(message: string = "Not authorized") {
    super(message, "AUTHORIZATION_ERROR", 403);
    this.name = "AuthorizationError";
  }
}

/**
 * Error thrown when a requested resource is not found (HTTP 404)
 * @class NotFoundError
 * @extends InlineError
 *
 * @example
 * try {
 *   await client.getMessage('non-existent-id');
 * } catch (error) {
 *   if (error instanceof NotFoundError) {
 *     console.log('Message ID does not exist');
 *   }
 * }
 */
export class NotFoundError extends InlineError {
  /**
   * @param {string} [message="Resource not found"] - Error message
   */
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error thrown when rate limit is exceeded (HTTP 429)
 * @class RateLimitError
 * @extends InlineError
 *
 * @example
 * try {
 *   await client.publish(url, payload);
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     console.log(`Rate limited. Retry after: ${error.retryAfter}ms`);
 *     await sleep(error.retryAfter || 60000);
 *   }
 * }
 */
export class RateLimitError extends InlineError {
  /**
   * @param {string} [message="Rate limited"] - Error message
   * @param {number} [retryAfter] - Milliseconds to wait before retrying (from Retry-After header)
   */
  constructor(
    message: string = "Rate limited",
    public retryAfter?: number,
  ) {
    super(message, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
  }
}

/**
 * Error thrown when server returns an error (HTTP 5xx)
 * @class ServerError
 * @extends InlineError
 *
 * @example
 * try {
 *   await client.getHealth();
 * } catch (error) {
 *   if (error instanceof ServerError) {
 *     console.log(`Server error (${error.status}): ${error.message}`);
 *   }
 * }
 */
export class ServerError extends InlineError {
  /**
   * @param {string} [message="Server error"] - Error message
   * @param {number} [status=500] - HTTP status code (5xx)
   */
  constructor(message: string = "Server error", status: number = 500) {
    super(message, "SERVER_ERROR", status);
    this.name = "ServerError";
  }
}

/**
 * Webhook callback error
 * Represents an error that occurred during webhook callback delivery
 *
 * Maps to the CallbackError type returned by the API with enhanced type safety.
 *
 * @class WebhookError
 * @extends Error
 *
 * @example
 * try {
 *   const errors = await client.getMessageErrors('message_123');
 *   for (const error of errors) {
 *     const webhookError = new WebhookError(
 *       error.errorMessage,
 *       error.errorCode,
 *       error.httpStatusCode,
 *       error.createdAt
 *     );
 *     console.log(`Webhook failed: ${webhookError.message}`);
 *   }
 * } catch (error) {
 *   if (error instanceof WebhookError) {
 *     console.log(`Error code: ${error.errorCode}`);
 *     console.log(`Created at: ${error.createdAt}`);
 *   }
 * }
 */
export class WebhookError extends Error {
  /**
   * Creates a new WebhookError
   *
   * @param {string} errorMessage - Human-readable description of what went wrong
   * @param {ErrorCode} errorCode - Machine-readable error classification
   * @param {number} [httpStatusCode] - HTTP status code if a response was received
   * @param {string} [createdAt] - ISO 8601 timestamp when error occurred (defaults to now)
   */
  constructor(
    public errorMessage: string,
    public errorCode: ErrorCode,
    public httpStatusCode?: number,
    public createdAt: string = new Date().toISOString(),
  ) {
    super(errorMessage);
    this.name = "WebhookError";
  }

  /**
   * Create a DNS failure error
   *
   * @param {string} message - Error message
   * @returns {WebhookError} WebhookError with ENOTFOUND code
   */
  static dnsFailure(message: string): WebhookError {
    return new WebhookError(message, "ENOTFOUND");
  }

  /**
   * Create a network error
   *
   * @param {string} message - Error message
   * @returns {WebhookError} WebhookError with NETWORK_ERROR code
   */
  static networkError(message: string): WebhookError {
    return new WebhookError(message, "NETWORK_ERROR");
  }

  /**
   * Create a not found error
   *
   * @param {string} message - Error message
   * @returns {WebhookError} WebhookError with DNS_FAILURE code
   */
  static notFound(message: string): WebhookError {
    return new WebhookError(message, "DNS_FAILURE");
  }

  /**
   * Serialize error to JSON-compatible object
   *
   * @returns {Object} Plain object representation of the error
   */
  toJSON(): {
    name: string;
    message: string;
    errorCode: ErrorCode;
    httpStatusCode: number | undefined;
    createdAt: string;
  } {
    return {
      name: this.name,
      message: this.errorMessage,
      errorCode: this.errorCode,
      httpStatusCode: this.httpStatusCode,
      createdAt: this.createdAt,
    };
  }
}
