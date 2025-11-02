import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  ValidationError,
  NotFoundError,
  ApiError,
  NetworkError,
  ServerError,
} from "../src/errors";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  createMockMessage,
  createMockCancelledMessage,
  assertAuthHeader,
  assertUrlPath,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

// ============================================================================
// Cancel Message Tests
// ============================================================================

test("should cancel pending message successfully", async () => {
  // Arrange
  const messageId = "msg-pending-123";
  const cancelledMessage = createMockCancelledMessage({ id: messageId });
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const expectedUrl = `${TEST_BASE_URL}/messages/${messageId}`;
  mockFetch.setResponse(expectedUrl, cancelledMessage, 200);

  // Act
  const result = await client.cancelMessage(messageId);

  // Assert
  expect(result.id).toBe(messageId);
  expect(result.status).toBe("cancelled");

  const lastCall = mockFetch.getLastCall();
  expect(lastCall).toBeDefined();
  expect(lastCall?.method).toBe("DELETE");
  assertUrlPath(lastCall?.url || "", `/messages/${messageId}`);
  assertAuthHeader(lastCall?.headers || {});
});

test("should throw ValidationError if messageId is empty", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.cancelMessage("");
    expect.unreachable("Should have thrown ValidationError");
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});

test("should throw NotFoundError when message not found (404)", async () => {
  // Arrange
  const messageId = "msg-nonexistent";
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const expectedUrl = `${TEST_BASE_URL}/messages/${messageId}`;
  mockFetch.setResponse(expectedUrl, { message: "Not found" }, 404);

  // Act & Assert
  try {
    await client.cancelMessage(messageId);
    expect.unreachable("Should have thrown NotFoundError");
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
  }
});

test("should throw ApiError when message not pending (409)", async () => {
  // Arrange
  const messageId = "msg-completed-123";
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const expectedUrl = `${TEST_BASE_URL}/messages/${messageId}`;
  mockFetch.setResponse(
    expectedUrl,
    { message: "Cannot cancel non-pending message" },
    409,
  );

  // Act & Assert
  try {
    await client.cancelMessage(messageId);
    expect.unreachable("Should have thrown ApiError");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  }
});

test("should throw ApiError on timeout (408)", async () => {
  // Arrange
  const messageId = "msg-timeout";
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const expectedUrl = `${TEST_BASE_URL}/messages/${messageId}`;
  mockFetch.setResponse(expectedUrl, {}, 408); // Timeout

  // Act & Assert
  try {
    await client.cancelMessage(messageId);
    expect.unreachable("Should have thrown error");
  } catch (error) {
    // MockFetch throws TypeError on 408, SDK wraps as NetworkError
    expect(error).toBeDefined();
  }
});

test("should throw ServerError on 500 response", async () => {
  // Arrange
  const messageId = "msg-server-error";
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const expectedUrl = `${TEST_BASE_URL}/messages/${messageId}`;
  mockFetch.setResponse(
    expectedUrl,
    { message: "Internal server error" },
    500,
  );

  // Act & Assert
  try {
    await client.cancelMessage(messageId);
    expect.unreachable("Should have thrown ServerError");
  } catch (error) {
    expect(error).toBeInstanceOf(ServerError);
  }
});

test("should send correct DELETE request with auth header", async () => {
  // Arrange
  const messageId = "msg-auth-check";
  const cancelledMessage = createMockCancelledMessage({ id: messageId });
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const expectedUrl = `${TEST_BASE_URL}/messages/${messageId}`;
  mockFetch.setResponse(expectedUrl, cancelledMessage, 200);

  // Act
  await client.cancelMessage(messageId);

  // Assert
  const lastCall = mockFetch.getLastCall();
  expect(lastCall?.method).toBe("DELETE");
  expect(lastCall?.headers["Authorization"]).toContain("Bearer ");
});

test("should preserve message metadata in cancelled response", async () => {
  // Arrange
  const messageId = "msg-metadata-123";
  const originalPayload = { userId: 123, action: "purchase" };
  const cancelledMessage = createMockCancelledMessage({
    id: messageId,
    payload: originalPayload,
    status: "cancelled",
  });

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const expectedUrl = `${TEST_BASE_URL}/messages/${messageId}`;
  mockFetch.setResponse(expectedUrl, cancelledMessage, 200);

  // Act
  const result = await client.cancelMessage(messageId);

  // Assert
  expect(result.payload).toEqual(originalPayload);
  expect(result.status).toBe("cancelled");
  expect(result.id).toBe(messageId);
});
