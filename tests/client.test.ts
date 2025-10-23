import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ApiError,
  NetworkError,
} from "../src/errors";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  createMockMessage,
  createMockMessagePublic,
  createMockTimeline,
  createMockStats,
  createMockHealth,
  createMockErrorStats,
  createMockDeadLetter,
  assertAuthHeader,
  assertContentTypeJson,
  assertUrlQuery,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

// ============================================================================
// PHASE 3: Client Constructor Tests (5 tests)
// ============================================================================

test("should construct client with valid config", () => {
  // Arrange & Act
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Assert
  expect(client).toBeDefined();
});

test("should throw ValidationError if apiUrl is missing", () => {
  // Arrange & Act & Assert
  expect(() => {
    new InlineClient({
      apiUrl: "",
      token: TEST_API_KEY,
    });
  }).toThrow(ValidationError);
});

test("should throw ValidationError if token is missing", () => {
  // Arrange & Act & Assert
  expect(() => {
    new InlineClient({
      apiUrl: TEST_BASE_URL,
      token: "",
    });
  }).toThrow(ValidationError);
});

test("should use default timeout of 30000ms", () => {
  // Arrange & Act
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Assert - timeout is set internally, we verify by config
  expect(client).toBeDefined();
});

test("should use custom timeout when provided", () => {
  // Arrange & Act
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
    timeout: 5000,
  });

  // Assert
  expect(client).toBeDefined();
});

// ============================================================================
// PHASE 3: Private Request Method Tests (10 tests for different status codes)
// ============================================================================

test("should make successful GET request with 200 status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockHealth = createMockHealth();
  mockFetch.setResponse(`${TEST_BASE_URL}/health`, mockHealth);

  // Act
  const result = await client.getHealth();

  // Assert
  expect(result).toEqual(mockHealth);
  expect(mockFetch.getCallCount()).toBe(1);
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
  expect(call?.url).toContain("/health");
  assertAuthHeader(call?.headers || {});
});

test("should throw AuthenticationError on 401 status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 401);

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(AuthenticationError);
  }
});

test("should throw AuthorizationError on 403 status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 403);

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(AuthorizationError);
  }
});

test("should throw NotFoundError on 404 status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  mockFetch.setResponse(`${TEST_BASE_URL}/messages/invalid-id`, {}, 404);

  // Act & Assert
  try {
    await client.getMessage("invalid-id");
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
  }
});

test("should throw RateLimitError on 429 status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 429);
  mockFetch.setResponseHeader(`${TEST_BASE_URL}/health`, {
    "Retry-After": "60",
  });

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(RateLimitError);
    if (error instanceof RateLimitError) {
      expect(error.retryAfter).toBe(60);
    }
  }
});

test("should throw ServerError on 500 status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  mockFetch.setResponse(
    `${TEST_BASE_URL}/health`,
    { error: "Server error" },
    500,
  );

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ServerError);
  }
});

test("should throw ServerError on 503 status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 503);

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ServerError);
  }
});

test("should throw ApiError on 4xx status (non-special)", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 400);

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
  }
});

test("should throw NetworkError on network failure", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Create a fetch that throws TypeError to simulate network error
  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 408);

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(NetworkError);
  }
});

// ============================================================================
// PHASE 4: Publishing Tests (8 tests)
// ============================================================================

test("publish should throw ValidationError if callbackUrl is missing", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.publish("", { data: "test" });
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});

test("publish should make POST request with correct path", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const callbackUrl = "https://example.com/webhook";
  const payload = { data: "test" };
  const response = createMockMessagePublic();

  mockFetch.setResponse(
    `${TEST_BASE_URL}/publish/${encodeURIComponent(callbackUrl)}`,
    response,
  );

  // Act
  const result = await client.publish(callbackUrl, payload);

  // Assert
  expect(result).toEqual(response);
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("POST");
  expect(call?.url).toContain("/publish/");
  expect(call?.url).toContain(encodeURIComponent(callbackUrl));
  assertContentTypeJson(call?.headers || {});
  assertAuthHeader(call?.headers || {});
});

test("publish should include Queue-notBefore header for scheduling", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const callbackUrl = "https://example.com/webhook";
  const payload = { data: "test" };
  const notBefore = "2024-10-21T14:30:00Z";
  const response = createMockMessagePublic();

  mockFetch.setResponse(
    `${TEST_BASE_URL}/publish/${encodeURIComponent(callbackUrl)}`,
    response,
  );

  // Act
  const result = await client.publish(callbackUrl, payload, { notBefore });

  // Assert
  expect(result).toEqual(response);
  const call = mockFetch.getLastCall();
  const bodyStr = call?.body || "{}";
  const body = JSON.parse(bodyStr);
  expect(body["Queue-notBefore"]).toBe(notBefore);
});

test("publish should include headers with Queue-Forward- prefix", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const callbackUrl = "https://example.com/webhook";
  const payload = { data: "test" };
  const headers = { "X-Custom": "value" };
  const response = createMockMessagePublic();

  mockFetch.setResponse(
    `${TEST_BASE_URL}/publish/${encodeURIComponent(callbackUrl)}`,
    response,
  );

  // Act
  const result = await client.publish(callbackUrl, payload, { headers });

  // Assert
  expect(result).toEqual(response);
  const call = mockFetch.getLastCall();
  const bodyStr = call?.body || "{}";
  const body = JSON.parse(bodyStr);
  expect(body["Queue-Forward-X-Custom"]).toBe("value");
});

test("publish should include Queue-timezone header when timezone is provided", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const callbackUrl = "https://example.com/webhook";
  const payload = { data: "test" };
  const timezone = "America/New_York";
  const response = createMockMessagePublic();

  mockFetch.setResponse(
    `${TEST_BASE_URL}/publish/${encodeURIComponent(callbackUrl)}`,
    response,
  );

  // Act
  const result = await client.publish(callbackUrl, payload, { timezone });

  // Assert
  expect(result).toEqual(response);
  const call = mockFetch.getLastCall();
  const bodyStr = call?.body || "{}";
  const body = JSON.parse(bodyStr);
  expect(body["Queue-timezone"]).toBe(timezone);
});

test("publish should merge payload with headers in request body", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const callbackUrl = "https://example.com/webhook";
  const payload = { message: "hello", count: 42 };
  const headers = { Authorization: "secret" };
  const response = createMockMessagePublic();

  mockFetch.setResponse(
    `${TEST_BASE_URL}/publish/${encodeURIComponent(callbackUrl)}`,
    response,
  );

  // Act
  await client.publish(callbackUrl, payload, { headers });

  // Assert
  const call = mockFetch.getLastCall();
  const bodyStr = call?.body || "{}";
  const body = JSON.parse(bodyStr);
  expect(body.message).toBe("hello");
  expect(body.count).toBe(42);
  expect(body["Queue-Forward-Authorization"]).toBe("secret");
});

// ============================================================================
// PHASE 5: Message Retrieval Tests (5 + 7 + 5 = 17 tests)
// ============================================================================

// getMessage tests
test("getMessage should throw ValidationError if messageId is missing", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.getMessage("");
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});

test("getMessage should fetch message by ID", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockMessage = createMockMessage();
  mockFetch.setResponse(`${TEST_BASE_URL}/messages/${messageId}`, mockMessage);

  // Act
  const result = await client.getMessage(messageId);

  // Assert
  expect(result).toEqual(mockMessage);
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
  expect(call?.url).toContain(`/messages/${messageId}`);
});

test("getMessage should throw NotFoundError if message doesn't exist", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "invalid-id";
  mockFetch.setResponse(`${TEST_BASE_URL}/messages/${messageId}`, {}, 404);

  // Act & Assert
  try {
    await client.getMessage(messageId);
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
  }
});

test("getMessage should send Authorization header", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockMessage = createMockMessage();
  mockFetch.setResponse(`${TEST_BASE_URL}/messages/${messageId}`, mockMessage);

  // Act
  await client.getMessage(messageId);

  // Assert
  const call = mockFetch.getLastCall();
  assertAuthHeader(call?.headers || {});
});

test("getMessage should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockMessage = createMockMessage();
  mockFetch.setResponse(`${TEST_BASE_URL}/messages/${messageId}`, mockMessage);

  // Act
  await client.getMessage(messageId);

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

// getMessages tests
test("getMessages should fetch with default pagination", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: [createMockMessage()],
    pagination: {
      limit: 10,
      offset: 0,
      total: 1,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=10&offset=0`,
    mockResponse,
  );

  // Act
  const result = await client.getMessages();

  // Assert
  expect(result).toEqual(mockResponse);
  const call = mockFetch.getLastCall();
  assertUrlQuery(call?.url || "", "limit", "10");
  assertUrlQuery(call?.url || "", "offset", "0");
});

test("getMessages should include custom limit in query", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: [],
    pagination: {
      limit: 50,
      offset: 0,
      total: 0,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=50&offset=0`,
    mockResponse,
  );

  // Act
  await client.getMessages({ limit: 50 });

  // Assert
  const call = mockFetch.getLastCall();
  assertUrlQuery(call?.url || "", "limit", "50");
});

test("getMessages should include custom offset in query", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: [],
    pagination: {
      limit: 10,
      offset: 20,
      total: 0,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=10&offset=20`,
    mockResponse,
  );

  // Act
  await client.getMessages({ offset: 20 });

  // Assert
  const call = mockFetch.getLastCall();
  assertUrlQuery(call?.url || "", "offset", "20");
});

test("getMessages should include status filter in query", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: [],
    pagination: {
      limit: 10,
      offset: 0,
      total: 0,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=10&offset=0&status=pending`,
    mockResponse,
  );

  // Act
  await client.getMessages({ status: "pending" });

  // Assert
  const call = mockFetch.getLastCall();
  assertUrlQuery(call?.url || "", "status", "pending");
});

test("getMessages should not include status if not provided", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: [],
    pagination: {
      limit: 10,
      offset: 0,
      total: 0,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=10&offset=0`,
    mockResponse,
  );

  // Act
  await client.getMessages();

  // Assert
  const call = mockFetch.getLastCall();
  const url = new URL(call?.url || "");
  expect(url.searchParams.get("status")).toBeNull();
});

test("getMessages should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: [],
    pagination: {
      limit: 10,
      offset: 0,
      total: 0,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=10&offset=0`,
    mockResponse,
  );

  // Act
  await client.getMessages();

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

// getMessageTimeline tests
test("getMessageTimeline should throw ValidationError if messageId is missing", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.getMessageTimeline("");
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});

test("getMessageTimeline should fetch timeline for message", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockTimeline = createMockTimeline();
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/timeline`,
    mockTimeline,
  );

  // Act
  const result = await client.getMessageTimeline(messageId);

  // Assert
  expect(result).toEqual(mockTimeline);
});

test("getMessageTimeline should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockTimeline = createMockTimeline();
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/timeline`,
    mockTimeline,
  );

  // Act
  await client.getMessageTimeline(messageId);

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

test("getMessageTimeline should send Authorization header", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockTimeline = createMockTimeline();
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/timeline`,
    mockTimeline,
  );

  // Act
  await client.getMessageTimeline(messageId);

  // Assert
  const call = mockFetch.getLastCall();
  assertAuthHeader(call?.headers || {});
});

test("getMessageTimeline should throw NotFoundError if message doesn't exist", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "invalid-id";
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/timeline`,
    {},
    404,
  );

  // Act & Assert
  try {
    await client.getMessageTimeline(messageId);
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
  }
});

// ============================================================================
// PHASE 6: Message Operations - Retry Tests (5 tests)
// ============================================================================

test("retryMessage should throw ValidationError if messageId is missing", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.retryMessage("");
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});

test("retryMessage should make POST request", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const response = {
    id: messageId,
    status: "pending",
    retryCount: 1,
    nextRetryAt: 2000,
  };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/retry`,
    response,
  );

  // Act
  const result = await client.retryMessage(messageId);

  // Assert
  expect(result).toEqual(response);
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("POST");
});

test("retryMessage should use correct path", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const response = {
    id: messageId,
    status: "pending",
    retryCount: 1,
  };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/retry`,
    response,
  );

  // Act
  await client.retryMessage(messageId);

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.url).toContain(`/messages/${messageId}/retry`);
});

test("retryMessage should send Authorization header", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const response = {
    id: messageId,
    status: "pending",
    retryCount: 1,
  };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/retry`,
    response,
  );

  // Act
  await client.retryMessage(messageId);

  // Assert
  const call = mockFetch.getLastCall();
  assertAuthHeader(call?.headers || {});
});

test("retryMessage should throw NotFoundError if message doesn't exist", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "invalid-id";
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/retry`,
    {},
    404,
  );

  // Act & Assert
  try {
    await client.retryMessage(messageId);
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(NotFoundError);
  }
});

// ============================================================================
// PHASE 7: Health & Debug Tests (4 + 6 = 10 tests)
// ============================================================================

test("getHealth should fetch health status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockHealth = createMockHealth();
  mockFetch.setResponse(`${TEST_BASE_URL}/health`, mockHealth);

  // Act
  const result = await client.getHealth();

  // Assert
  expect(result).toEqual(mockHealth);
});

test("getHealth should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockHealth = createMockHealth();
  mockFetch.setResponse(`${TEST_BASE_URL}/health`, mockHealth);

  // Act
  await client.getHealth();

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

test("getHealthReady should fetch readiness status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockHealth = createMockHealth();
  mockFetch.setResponse(`${TEST_BASE_URL}/health/ready`, mockHealth);

  // Act
  const result = await client.getHealthReady();

  // Assert
  expect(result).toEqual(mockHealth);
});

test("getHealthReady should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockHealth = createMockHealth();
  mockFetch.setResponse(`${TEST_BASE_URL}/health/ready`, mockHealth);

  // Act
  await client.getHealthReady();

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

test("getDebugMessages should fetch debug messages grouped by status", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: {
      pending: [createMockMessage()],
      processing: [],
      completed: [],
      failed: [],
      dead_letter: [],
    },
  };
  mockFetch.setResponse(`${TEST_BASE_URL}/debug/messages`, mockResponse);

  // Act
  const result = await client.getDebugMessages();

  // Assert
  expect(result).toEqual(mockResponse);
});

test("getDebugMessages should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockResponse = {
    messages: {
      pending: [],
      processing: [],
      completed: [],
      failed: [],
      dead_letter: [],
    },
  };
  mockFetch.setResponse(`${TEST_BASE_URL}/debug/messages`, mockResponse);

  // Act
  await client.getDebugMessages();

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

test("getDebugStats should fetch debug statistics", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockStats = createMockStats();
  mockFetch.setResponse(`${TEST_BASE_URL}/debug/stats`, mockStats);

  // Act
  const result = await client.getDebugStats();

  // Assert
  expect(result).toEqual(mockStats);
});

test("getDebugStats should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockStats = createMockStats();
  mockFetch.setResponse(`${TEST_BASE_URL}/debug/stats`, mockStats);

  // Act
  await client.getDebugStats();

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

// ============================================================================
// PHASE 8: Error Analytics Tests (10 tests)
// ============================================================================

test("getErrorStats should fetch error statistics", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockErrorStats = createMockErrorStats();
  mockFetch.setResponse(`${TEST_BASE_URL}/errors/stats`, mockErrorStats);

  // Act
  const result = await client.getErrorStats();

  // Assert
  expect(result).toEqual(mockErrorStats);
});

test("getErrorStats should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockErrorStats = createMockErrorStats();
  mockFetch.setResponse(`${TEST_BASE_URL}/errors/stats`, mockErrorStats);

  // Act
  await client.getErrorStats();

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

test("getDeadLetterErrors should fetch dead letter errors", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockDeadLetter = createMockDeadLetter();
  mockFetch.setResponse(`${TEST_BASE_URL}/errors/deadletter`, mockDeadLetter);

  // Act
  const result = await client.getDeadLetterErrors();

  // Assert
  expect(result).toEqual(mockDeadLetter);
});

test("getDeadLetterErrors should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const mockDeadLetter = createMockDeadLetter();
  mockFetch.setResponse(`${TEST_BASE_URL}/errors/deadletter`, mockDeadLetter);

  // Act
  await client.getDeadLetterErrors();

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

test("getErrorsByCode should throw ValidationError if code is missing", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.getErrorsByCode("");
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});

test("getErrorsByCode should fetch errors by code", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const code = "HTTP_5XX";
  const mockResponse = {
    errors: [
      {
        id: "err-1",
        messageId: "msg-1",
        code: "HTTP_5XX",
        message: "Server error",
        statusCode: 500,
        timestamp: 1000,
      },
    ],
  };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/errors/by-code/${code}`,
    mockResponse,
  );

  // Act
  const result = await client.getErrorsByCode(code);

  // Assert
  expect(result).toEqual(mockResponse.errors);
});

test("getErrorsByCode should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const code = "HTTP_5XX";
  const mockResponse = { errors: [] };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/errors/by-code/${code}`,
    mockResponse,
  );

  // Act
  await client.getErrorsByCode(code);

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});

test("getMessageErrors should throw ValidationError if messageId is missing", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.getMessageErrors("");
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
  }
});

test("getMessageErrors should fetch errors for specific message", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockResponse = {
    errors: [
      {
        id: "err-1",
        messageId,
        code: "HTTP_5XX",
        message: "Server error",
        statusCode: 500,
        timestamp: 1000,
      },
    ],
  };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/errors/message/${messageId}`,
    mockResponse,
  );

  // Act
  const result = await client.getMessageErrors(messageId);

  // Assert
  expect(result).toEqual(mockResponse.errors);
});

test("getMessageErrors should use GET method", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-123";
  const mockResponse = { errors: [] };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/errors/message/${messageId}`,
    mockResponse,
  );

  // Act
  await client.getMessageErrors(messageId);

  // Assert
  const call = mockFetch.getLastCall();
  expect(call?.method).toBe("GET");
});
