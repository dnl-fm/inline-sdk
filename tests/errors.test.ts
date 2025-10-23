import { test, expect } from "bun:test";
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
  WebhookError,
} from "../src/errors";

// Test InlineError
test("InlineError should instantiate correctly", () => {
  // Arrange
  const message = "Test error";
  const code = "TEST_ERROR";

  // Act
  const error = new InlineError(message, code);

  // Assert
  expect(error.message).toBe(message);
  expect(error.code).toBe(code);
  expect(error.name).toBe("InlineError");
  expect(error instanceof Error).toBe(true);
});

test("InlineError should have optional status", () => {
  // Arrange
  const message = "Test error";
  const code = "TEST_ERROR";
  const status = 400;

  // Act
  const error = new InlineError(message, code, status);

  // Assert
  expect(error.status).toBe(status);
});

// Test ApiError
test("ApiError should instantiate correctly", () => {
  // Arrange
  const message = "API error";
  const status = 400;

  // Act
  const error = new ApiError(message, status);

  // Assert
  expect(error.message).toBe(message);
  expect(error.code).toBe("API_ERROR");
  expect(error.status).toBe(status);
  expect(error.name).toBe("ApiError");
  expect(error instanceof InlineError).toBe(true);
});

test("ApiError should support response data", () => {
  // Arrange
  const message = "API error";
  const status = 400;
  const response = { error: "Invalid request" };

  // Act
  const error = new ApiError(message, status, response);

  // Assert
  expect(error.response).toEqual(response);
});

// Test NetworkError
test("NetworkError should instantiate correctly", () => {
  // Arrange
  const message = "Network error";

  // Act
  const error = new NetworkError(message);

  // Assert
  expect(error.message).toBe(message);
  expect(error.code).toBe("NETWORK_ERROR");
  expect(error.name).toBe("NetworkError");
  expect(error instanceof InlineError).toBe(true);
});

test("NetworkError should support original error", () => {
  // Arrange
  const message = "Network error";
  const originalError = new Error("Connection refused");

  // Act
  const error = new NetworkError(message, originalError);

  // Assert
  expect(error.originalError).toBe(originalError);
});

// Test ValidationError
test("ValidationError should instantiate correctly", () => {
  // Arrange
  const message = "Validation failed";

  // Act
  const error = new ValidationError(message);

  // Assert
  expect(error.message).toBe(message);
  expect(error.code).toBe("VALIDATION_ERROR");
  expect(error.name).toBe("ValidationError");
  expect(error instanceof InlineError).toBe(true);
});

test("ValidationError should support details", () => {
  // Arrange
  const message = "Validation failed";
  const details = { field: "email", reason: "Invalid format" };

  // Act
  const error = new ValidationError(message, details);

  // Assert
  expect(error.details).toEqual(details);
});

// Test AuthenticationError
test("AuthenticationError should instantiate correctly", () => {
  // Arrange & Act
  const error = new AuthenticationError();

  // Assert
  expect(error.message).toBe("Authentication failed");
  expect(error.code).toBe("AUTHENTICATION_ERROR");
  expect(error.status).toBe(401);
  expect(error.name).toBe("AuthenticationError");
  expect(error instanceof InlineError).toBe(true);
});

test("AuthenticationError should support custom message", () => {
  // Arrange
  const message = "Invalid token";

  // Act
  const error = new AuthenticationError(message);

  // Assert
  expect(error.message).toBe(message);
});

// Test AuthorizationError
test("AuthorizationError should instantiate correctly", () => {
  // Arrange & Act
  const error = new AuthorizationError();

  // Assert
  expect(error.message).toBe("Not authorized");
  expect(error.code).toBe("AUTHORIZATION_ERROR");
  expect(error.status).toBe(403);
  expect(error.name).toBe("AuthorizationError");
  expect(error instanceof InlineError).toBe(true);
});

test("AuthorizationError should support custom message", () => {
  // Arrange
  const message = "Insufficient permissions";

  // Act
  const error = new AuthorizationError(message);

  // Assert
  expect(error.message).toBe(message);
});

// Test NotFoundError
test("NotFoundError should instantiate correctly", () => {
  // Arrange & Act
  const error = new NotFoundError();

  // Assert
  expect(error.message).toBe("Resource not found");
  expect(error.code).toBe("NOT_FOUND");
  expect(error.status).toBe(404);
  expect(error.name).toBe("NotFoundError");
  expect(error instanceof InlineError).toBe(true);
});

test("NotFoundError should support custom message", () => {
  // Arrange
  const message = "Message not found";

  // Act
  const error = new NotFoundError(message);

  // Assert
  expect(error.message).toBe(message);
});

// Test RateLimitError
test("RateLimitError should instantiate correctly", () => {
  // Arrange & Act
  const error = new RateLimitError();

  // Assert
  expect(error.message).toBe("Rate limited");
  expect(error.code).toBe("RATE_LIMIT");
  expect(error.status).toBe(429);
  expect(error.name).toBe("RateLimitError");
  expect(error instanceof InlineError).toBe(true);
});

test("RateLimitError should support custom message and retry-after", () => {
  // Arrange
  const message = "Too many requests";
  const retryAfter = 60;

  // Act
  const error = new RateLimitError(message, retryAfter);

  // Assert
  expect(error.message).toBe(message);
  expect(error.retryAfter).toBe(retryAfter);
});

// Test ServerError
test("ServerError should instantiate correctly", () => {
  // Arrange & Act
  const error = new ServerError();

  // Assert
  expect(error.message).toBe("Server error");
  expect(error.code).toBe("SERVER_ERROR");
  expect(error.status).toBe(500);
  expect(error.name).toBe("ServerError");
  expect(error instanceof InlineError).toBe(true);
});

test("ServerError should support custom message and status", () => {
  // Arrange
  const message = "Internal server error";
  const status = 502;

  // Act
  const error = new ServerError(message, status);

  // Assert
  expect(error.message).toBe(message);
  expect(error.status).toBe(status);
});

// Test error inheritance chain
test("All error classes should extend InlineError", () => {
  // Arrange & Act
  const errors = [
    new ApiError("test", 400),
    new NetworkError("test"),
    new ValidationError("test"),
    new AuthenticationError(),
    new AuthorizationError(),
    new NotFoundError(),
    new RateLimitError(),
    new ServerError(),
  ];

  // Assert
  errors.forEach((error) => {
    expect(error instanceof InlineError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

test("Error objects should be throwable", () => {
  // Arrange
  const error = new ValidationError("Cannot proceed");

  // Act & Assert
  let caught = false;
  try {
    throw error;
  } catch (e) {
    caught = true;
    expect(e).toBe(error);
  }
  expect(caught).toBe(true);
});

// Test WebhookError
test("WebhookError should instantiate correctly", () => {
  // Arrange
  const message = "Webhook failed";
  const errorCode = "HTTP_5XX";
  const httpStatusCode = 500;
  const createdAt = "2025-10-23T10:30:00.000Z";

  // Act
  const error = new WebhookError(message, errorCode, httpStatusCode, createdAt);

  // Assert
  expect(error.errorMessage).toBe(message);
  expect(error.errorCode).toBe(errorCode);
  expect(error.httpStatusCode).toBe(httpStatusCode);
  expect(error.createdAt).toBe(createdAt);
  expect(error.name).toBe("WebhookError");
  expect(error instanceof Error).toBe(true);
});

test("WebhookError should generate createdAt timestamp if not provided", () => {
  // Arrange
  const message = "Connection failed";
  const errorCode = "ECONNREFUSED";

  // Act
  const error = new WebhookError(message, errorCode);

  // Assert
  expect(error.errorMessage).toBe(message);
  expect(error.errorCode).toBe(errorCode);
  expect(error.httpStatusCode).toBeUndefined();
  expect(error.createdAt).toBeDefined();
  expect(typeof error.createdAt).toBe("string");
  expect(error.createdAt.includes("T")).toBe(true);
});

test("WebhookError should support dnsFailure factory method", () => {
  // Arrange & Act
  const error = WebhookError.dnsFailure("DNS lookup failed");

  // Assert
  expect(error.errorMessage).toBe("DNS lookup failed");
  expect(error.errorCode).toBe("ENOTFOUND");
  expect(error.httpStatusCode).toBeUndefined();
});

test("WebhookError should support networkError factory method", () => {
  // Arrange & Act
  const error = WebhookError.networkError("Network unreachable");

  // Assert
  expect(error.errorMessage).toBe("Network unreachable");
  expect(error.errorCode).toBe("NETWORK_ERROR");
  expect(error.httpStatusCode).toBeUndefined();
});

test("WebhookError should support notFound factory method", () => {
  // Arrange & Act
  const error = WebhookError.notFound("Host not found");

  // Assert
  expect(error.errorMessage).toBe("Host not found");
  expect(error.errorCode).toBe("DNS_FAILURE");
  expect(error.httpStatusCode).toBeUndefined();
});

test("WebhookError should serialize to JSON correctly", () => {
  // Arrange
  const error = new WebhookError(
    "Test error",
    "TIMEOUT",
    undefined,
    "2025-10-23T10:30:00.000Z"
  );

  // Act
  const json = error.toJSON();

  // Assert
  expect(json.name).toBe("WebhookError");
  expect(json.message).toBe("Test error");
  expect(json.errorCode).toBe("TIMEOUT");
  expect(json.httpStatusCode).toBeUndefined();
  expect(json.createdAt).toBe("2025-10-23T10:30:00.000Z");
});

test("WebhookError should serialize all fields to JSON", () => {
  // Arrange
  const error = new WebhookError(
    "Server error",
    "HTTP_5XX",
    502,
    "2025-10-23T11:00:00.000Z"
  );

  // Act
  const json = error.toJSON();

  // Assert
  expect(json.name).toBe("WebhookError");
  expect(json.message).toBe("Server error");
  expect(json.errorCode).toBe("HTTP_5XX");
  expect(json.httpStatusCode).toBe(502);
  expect(json.createdAt).toBe("2025-10-23T11:00:00.000Z");
});

test("WebhookError should not be an InlineError", () => {
  // Arrange & Act
  const error = new WebhookError("Test", "UNKNOWN");

  // Assert
  expect(error instanceof InlineError).toBe(false);
  expect(error instanceof Error).toBe(true);
});
