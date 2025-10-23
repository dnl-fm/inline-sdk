import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import { NetworkError } from "../src/errors";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  createMockMessage,
  createMockMessagePublic,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

// ============================================================================
// PHASE 9: Integration Tests
// ============================================================================

// Pagination workflows (3 tests)
test("should handle pagination workflow: fetch multiple pages of messages", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const page1Response = {
    messages: [
      createMockMessage({ id: "msg-1" }),
      createMockMessage({ id: "msg-2" }),
    ],
    pagination: {
      limit: 2,
      offset: 0,
      total: 5,
      hasMore: true,
    },
  };

  const page2Response = {
    messages: [
      createMockMessage({ id: "msg-3" }),
      createMockMessage({ id: "msg-4" }),
    ],
    pagination: {
      limit: 2,
      offset: 2,
      total: 5,
      hasMore: true,
    },
  };

  const page3Response = {
    messages: [createMockMessage({ id: "msg-5" })],
    pagination: {
      limit: 2,
      offset: 4,
      total: 5,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=2&offset=0`,
    page1Response,
  );
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=2&offset=2`,
    page2Response,
  );
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=2&offset=4`,
    page3Response,
  );

  // Act - Simulate pagination workflow
  const results = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const response = await client.getMessages({ limit: 2, offset });
    results.push(...response.messages);
    hasMore = response.pagination.hasMore;
    offset = response.pagination.offset + response.pagination.limit;
  }

  // Assert
  expect(results).toHaveLength(5);
  expect(results[0].id).toBe("msg-1");
  expect(results[4].id).toBe("msg-5");
  expect(mockFetch.getCallCount()).toBe(3);
});

test("should handle status filtering with pagination", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const pendingMessages = {
    messages: [
      createMockMessage({ id: "msg-1", status: "pending" }),
      createMockMessage({ id: "msg-2", status: "pending" }),
    ],
    pagination: {
      limit: 10,
      offset: 0,
      total: 2,
      hasMore: false,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=10&offset=0&status=pending`,
    pendingMessages,
  );

  // Act
  const result = await client.getMessages({ status: "pending", limit: 10 });

  // Assert
  expect(result.messages).toHaveLength(2);
  expect(result.messages.every((m) => m.status === "pending")).toBe(true);
  expect(result.pagination.hasMore).toBe(false);
});

test("should handle combining limit, offset, and status filters", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const filteredMessages = {
    messages: [
      createMockMessage({ id: "msg-5", status: "completed" }),
      createMockMessage({ id: "msg-6", status: "completed" }),
    ],
    pagination: {
      limit: 2,
      offset: 4,
      total: 10,
      hasMore: true,
    },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=2&offset=4&status=completed`,
    filteredMessages,
  );

  // Act
  const result = await client.getMessages({
    status: "completed",
    limit: 2,
    offset: 4,
  });

  // Assert
  expect(result.messages).toHaveLength(2);
  expect(result.pagination.offset).toBe(4);
  expect(result.pagination.limit).toBe(2);
  expect(result.pagination.hasMore).toBe(true);
});

// Retry workflows (2 tests)
test("should handle retry workflow: publish, retrieve, and retry message", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const callbackUrl = "https://example.com/webhook";
  const payload = { data: "test" };

  // Step 1: Publish message
  const publishResponse = createMockMessagePublic({ id: "msg-123" });
  mockFetch.setResponse(
    `${TEST_BASE_URL}/publish/${encodeURIComponent(callbackUrl)}`,
    publishResponse,
  );

  const publishedId = (await client.publish(callbackUrl, payload)).id;

  // Step 2: Get message details
  const messageDetails = createMockMessage({
    id: publishedId,
    status: "failed",
    retryCount: 0,
  });
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${publishedId}`,
    messageDetails,
  );

  const message = await client.getMessage(publishedId);

  // Step 3: Retry message
  const retryResponse = {
    id: publishedId,
    status: "pending",
    retryCount: 1,
    nextRetryAt: 3000,
  };
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${publishedId}/retry`,
    retryResponse,
  );

  const retried = await client.retryMessage(publishedId);

  // Assert
  expect(publishedId).toBe("msg-123");
  expect(message.status).toBe("failed");
  expect(retried.status).toBe("pending");
  expect(retried.retryCount).toBe(1);
  expect(mockFetch.getCallCount()).toBe(3);
});

test("should handle retry workflow with timeline inspection", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-456";

  // Step 1: Get message timeline to inspect retry history
  const timelineResponse = {
    events: [
      { type: "CREATED", timestamp: 1000 },
      { type: "ACTIVE", timestamp: 1100 },
      {
        type: "FAILED",
        timestamp: 2000,
        details: { error: "Connection timeout" },
      },
      { type: "RETRY", timestamp: 2500 },
      {
        type: "FAILED",
        timestamp: 3000,
        details: { error: "Connection timeout" },
      },
    ],
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/timeline`,
    timelineResponse,
  );

  const timeline = await client.getMessageTimeline(messageId);

  // Step 2: Retry message
  const retryResponse = {
    id: messageId,
    status: "pending",
    retryCount: 2,
    nextRetryAt: 5000,
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/retry`,
    retryResponse,
  );

  const retried = await client.retryMessage(messageId);

  // Assert
  expect(timeline.events).toHaveLength(5);
  expect(timeline.events.filter((e) => e.type === "FAILED")).toHaveLength(2);
  expect(retried.retryCount).toBe(2);
  expect(mockFetch.getCallCount()).toBe(2);
});

// Error recovery (2 tests)
test("should handle error recovery: inspect errors and retry", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const messageId = "msg-789";

  // Step 1: Get errors for a specific message
  const messageErrorsResponse = {
    errors: [
      {
        id: "err-1",
        messageId,
        code: "TIMEOUT",
        message: "Request timeout",
        timestamp: 1000,
      },
      {
        id: "err-2",
        messageId,
        code: "HTTP_5XX",
        message: "Server error",
        statusCode: 500,
        timestamp: 2000,
      },
    ],
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/errors/message/${messageId}`,
    messageErrorsResponse,
  );

  const errors = await client.getMessageErrors(messageId);

  // Step 2: Retry after analyzing errors
  const retryResponse = {
    id: messageId,
    status: "pending",
    retryCount: 1,
    nextRetryAt: 3000,
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}/retry`,
    retryResponse,
  );

  const retried = await client.retryMessage(messageId);

  // Assert
  expect(errors).toHaveLength(2);
  expect(errors[0].code).toBe("TIMEOUT");
  expect(errors[1].code).toBe("HTTP_5XX");
  expect(retried.status).toBe("pending");
  expect(mockFetch.getCallCount()).toBe(2);
});

test("should handle recovery workflow: check error stats and dead letters", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Step 1: Get error statistics to understand error distribution
  const errorStatsResponse = {
    stats: [
      {
        code: "HTTP_5XX",
        count: 15,
        lastOccurred: 5000,
      },
      {
        code: "TIMEOUT",
        count: 8,
        lastOccurred: 4500,
      },
      {
        code: "HTTP_4XX",
        count: 2,
        lastOccurred: 3000,
      },
    ],
  };

  mockFetch.setResponse(`${TEST_BASE_URL}/errors/stats`, errorStatsResponse);

  const stats = await client.getErrorStats();

  // Step 2: Get dead letter errors
  const deadLetterResponse = {
    errors: [
      {
        id: "err-dl-1",
        messageId: "msg-dl-1",
        code: "HTTP_5XX",
        message: "Persistent server error",
        statusCode: 500,
        timestamp: 5000,
      },
    ],
    count: 1,
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/errors/deadletter`,
    deadLetterResponse,
  );

  const deadLetters = await client.getDeadLetterErrors();

  // Assert
  expect(stats.stats).toHaveLength(3);
  expect(stats.stats[0].count).toBe(15);
  expect(deadLetters.count).toBe(1);
  expect(deadLetters.errors[0].code).toBe("HTTP_5XX");
  expect(mockFetch.getCallCount()).toBe(2);
});

// Timeout handling (2 tests)
test("should handle timeout gracefully and throw NetworkError", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
    timeout: 100, // Very short timeout
  });

  // Simulate timeout by setting status to 408
  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 408);

  // Act & Assert
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(NetworkError);
  }
});

test("should recover from timeout with subsequent request", async () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
    timeout: 5000, // Reasonable timeout
  });

  const healthResponse = {
    status: "healthy",
    components: {
      database: "healthy",
      queue: "healthy",
    },
    timestamp: 5000,
  };

  // First request times out
  mockFetch.setResponse(`${TEST_BASE_URL}/health`, {}, 408);

  // Act - First request should fail
  try {
    await client.getHealth();
    expect.unreachable();
  } catch (error) {
    expect(error).toBeDefined();
  }

  // Reset mock and retry
  mockFetch.reset();
  mockFetch.setResponse(`${TEST_BASE_URL}/health`, healthResponse);

  // Act - Second request should succeed
  const result = await client.getHealth();

  // Assert
  expect(result).toEqual(healthResponse);
  expect(mockFetch.getCallCount()).toBe(1); // Only counts calls after reset
});
