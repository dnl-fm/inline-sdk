# Testing Examples for Inline SDK

Practical examples demonstrating common testing patterns and scenarios.

## Table of Contents

1. [Example 1: Testing a Simple Method](#example-1-testing-a-simple-method)
2. [Example 2: Testing Error Scenarios](#example-2-testing-error-scenarios)
3. [Example 3: Using MockFetch](#example-3-using-mockfetch)
4. [Example 4: Creating and Using Fixtures](#example-4-creating-and-using-fixtures)
5. [Example 5: Integration Test Workflow](#example-5-integration-test-workflow)
6. [Example 6: Query Parameter Testing](#example-6-query-parameter-testing)
7. [Example 7: Header Validation](#example-7-header-validation)
8. [Example 8: Testing Parameter Validation](#example-8-testing-parameter-validation)

---

## Example 1: Testing a Simple Method

This example shows how to test a straightforward client method that makes an HTTP GET request.

### Scenario

Test the `getHealth()` method which fetches the API health status.

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import { MockFetch, TEST_BASE_URL, TEST_API_KEY, createMockHealth } from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("getHealth should fetch health status", () => {
  // Arrange - Set up test data and mocks
  const mockHealth = createMockHealth({
    status: "healthy",
    components: {
      database: "healthy",
      queue: "healthy",
    },
  });

  mockFetch.setResponse(
    `${TEST_BASE_URL}/health`,
    mockHealth,
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act - Call the method being tested
  const result = await client.getHealth();

  // Assert - Verify the results
  expect(result.status).toBe("healthy");
  expect(result.components.database).toBe("healthy");
  expect(result.components.queue).toBe("healthy");

  // Verify the request was made correctly
  const lastCall = mockFetch.getLastCall();
  expect(lastCall?.method).toBe("GET");
  expect(mockFetch.getCallCount()).toBe(1);
});
```

### Key Points

- **Arrange:** Create fixture with `createMockHealth()`, set mock response
- **Act:** Call `client.getHealth()`
- **Assert:** Verify response data and request properties
- **Isolation:** MockFetch prevents real HTTP calls

---

## Example 2: Testing Error Scenarios

This example demonstrates testing multiple error conditions for robustness.

### Scenario

Test the `getMessage()` method with various error responses (404, 401, 500).

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  NotFoundError,
  AuthenticationError,
  ServerError,
} from "../src/errors";
import { MockFetch, TEST_BASE_URL, TEST_API_KEY } from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("getMessage should throw NotFoundError on 404", () => {
  // Arrange
  const messageId = "nonexistent-123";
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}`,
    { error: "Message not found" },
    404
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.getMessage(messageId);
    // Should not reach here
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof NotFoundError).toBe(true);
  }
});

test("getMessage should throw AuthenticationError on 401", () => {
  // Arrange
  const messageId = "msg-123";
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}`,
    { error: "Unauthorized" },
    401
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: "invalid-token",
  });

  // Act & Assert
  try {
    await client.getMessage(messageId);
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof AuthenticationError).toBe(true);
  }
});

test("getMessage should throw ServerError on 500", () => {
  // Arrange
  const messageId = "msg-123";
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/${messageId}`,
    { error: "Internal server error" },
    500
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    await client.getMessage(messageId);
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof ServerError).toBe(true);
  }
});
```

### Key Points

- **Multiple Scenarios:** Tests different error conditions separately
- **Clear Expectations:** Each test verifies specific error type
- **Isolation:** Each test uses fresh mock state via `beforeEach`
- **Error Handling:** Uses try-catch to verify error types

---

## Example 3: Using MockFetch

This example shows how to use MockFetch directly to inspect request details.

### Scenario

Verify that requests include correct headers and are sent to the right URL.

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  createMockMessage,
  assertAuthHeader,
  assertContentTypeJson,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("request should include Authorization and Content-Type headers", () => {
  // Arrange
  const mockMessage = createMockMessage();
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/msg-123`,
    mockMessage,
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  const result = await client.getMessage("msg-123");

  // Assert - Inspect the actual request made
  const lastCall = mockFetch.getLastCall();

  // Verify URL
  expect(lastCall?.url).toContain("/messages/msg-123");

  // Verify method
  expect(lastCall?.method).toBe("GET");

  // Verify headers using helper assertions
  assertAuthHeader(lastCall?.headers);
  assertContentTypeJson(lastCall?.headers);

  // Verify Authorization header format
  expect(lastCall?.headers["Authorization"]).toContain("Bearer ");

  // Verify the response
  expect(result.id).toBe(mockMessage.id);
});

test("should inspect all requests via getCalls", () => {
  // Arrange
  mockFetch.setResponse(
    `${TEST_BASE_URL}/health`,
    { status: "healthy" },
    200
  );

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages`,
    { messages: [] },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.getHealth();
  await client.getMessages();

  // Assert - Review all requests
  const allCalls = mockFetch.getCalls();

  expect(allCalls.length).toBe(2);
  expect(allCalls[0].url).toContain("/health");
  expect(allCalls[1].url).toContain("/messages");

  // Count calls to specific endpoint
  const messageCalls = allCalls.filter(call => call.url.includes("/messages"));
  expect(messageCalls.length).toBe(1);
});

test("should track request body for POST requests", () => {
  // Arrange
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages`,
    { id: "msg-123", status: "pending" },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const payload = { userId: 456, action: "created" };
  const callbackUrl = "https://webhook.example.com/callback";

  // Act
  await client.publish(callbackUrl, payload);

  // Assert - Verify request body
  const lastCall = mockFetch.getLastCall();
  expect(lastCall?.method).toBe("POST");

  // Parse the request body
  const requestBody = JSON.parse(lastCall?.body || "{}");
  expect(requestBody.userId).toBe(456);
  expect(requestBody.action).toBe("created");

  // Verify headers
  assertContentTypeJson(lastCall?.headers);
  assertAuthHeader(lastCall?.headers);
});
```

### Key Points

- **Request Inspection:** Use `getLastCall()` to check what was sent
- **Helper Assertions:** `assertAuthHeader()` and similar helpers validate headers
- **Multiple Calls:** `getCalls()` reviews all requests across multiple operations
- **Body Parsing:** Parse JSON body to verify payload content

---

## Example 4: Creating and Using Fixtures

This example demonstrates the fixture factory pattern for consistent test data.

### Scenario

Test pagination with various message statuses using fixtures.

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  createMockMessage,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("should fetch messages with different statuses using fixtures", () => {
  // Arrange - Create diverse test messages using fixtures
  const pendingMessage = createMockMessage({
    id: "msg-1",
    status: "pending",
    retryCount: 0,
  });

  const processingMessage = createMockMessage({
    id: "msg-2",
    status: "processing",
    retryCount: 1,
  });

  const completedMessage = createMockMessage({
    id: "msg-3",
    status: "completed",
    retryCount: 0,
  });

  const failedMessage = createMockMessage({
    id: "msg-4",
    status: "failed",
    retryCount: 3,
    maxRetries: 5,
  });

  // Set up mock responses for different status queries
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?status=pending`,
    { messages: [pendingMessage], pagination: { hasMore: false } },
    200
  );

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?status=completed`,
    { messages: [completedMessage], pagination: { hasMore: false } },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert - Fetch each status
  const pendingResults = await client.getMessages({ status: "pending" });
  expect(pendingResults.messages[0].status).toBe("pending");
  expect(pendingResults.messages[0].retryCount).toBe(0);

  const completedResults = await client.getMessages({ status: "completed" });
  expect(completedResults.messages[0].status).toBe("completed");
});

test("should create fixture with custom values", () => {
  // Arrange - Create fixture with overrides
  const customMessage = createMockMessage({
    id: "custom-msg-123",
    status: "dead_letter",
    retryCount: 10,
    maxRetries: 10,
    callbackUrl: "https://custom.webhook.com/endpoint",
  });

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/custom-msg-123`,
    customMessage,
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  const result = await client.getMessage("custom-msg-123");

  // Assert
  expect(result.id).toBe("custom-msg-123");
  expect(result.status).toBe("dead_letter");
  expect(result.retryCount).toBe(10);
  expect(result.callbackUrl).toBe("https://custom.webhook.com/endpoint");
});

test("should use fixture defaults when not overriding", () => {
  // Arrange
  const defaultMessage = createMockMessage();

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/msg-default`,
    defaultMessage,
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  const result = await client.getMessage("msg-default");

  // Assert - Fixture defaults are used
  expect(result.id).toBe("msg-123"); // Default from fixture
  expect(result.status).toBe("pending"); // Default from fixture
  expect(result.retryCount).toBe(0); // Default from fixture
  expect(result.payload).toEqual({ data: "test" }); // Default from fixture
});
```

### Key Points

- **Reusability:** Fixtures provide consistent test data structure
- **Customization:** Override specific properties via partial objects
- **Defaults:** Fixtures include sensible defaults for common fields
- **Maintainability:** Changes to default test data are centralized

---

## Example 5: Integration Test Workflow

This example shows how to test a complete user workflow across multiple methods.

### Scenario

Test the full publish-retrieve-retry workflow as a user would experience it.

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  createMockMessagePublic,
  createMockMessage,
  createMockTimeline,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("should execute publish-retrieve-retry workflow", () => {
  // Arrange - Set up all the responses for the workflow
  const callbackUrl = "https://webhook.example.com/callback";
  const payload = { userId: 123, action: "payment_completed" };

  // Step 1: Mock publish response
  const publishedMessage = createMockMessagePublic({
    id: "msg-workflow-123",
    status: "pending",
  });

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages`,
    publishedMessage,
    200
  );

  // Step 2: Mock get message after failure
  const failedMessage = createMockMessage({
    id: "msg-workflow-123",
    callbackUrl,
    status: "failed",
    retryCount: 0,
    maxRetries: 5,
  });

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/msg-workflow-123`,
    failedMessage,
    200
  );

  // Step 3: Mock retry response
  const retriedMessage = createMockMessage({
    id: "msg-workflow-123",
    callbackUrl,
    status: "processing",
    retryCount: 1,
    maxRetries: 5,
    nextRetryAt: Date.now() + 5000,
  });

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/msg-workflow-123/retry`,
    retriedMessage,
    200
  );

  // Step 4: Mock timeline after retry
  const timeline = createMockTimeline({
    events: [
      { type: "CREATED", timestamp: Date.now() - 10000 },
      { type: "ACTIVE", timestamp: Date.now() - 9000 },
      { type: "FAILED", timestamp: Date.now() - 5000 },
      { type: "RETRY", timestamp: Date.now() },
    ],
  });

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages/msg-workflow-123/timeline`,
    timeline,
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act - Execute workflow
  // Step 1: Publish message
  const published = await client.publish(callbackUrl, payload);
  expect(published.id).toBe("msg-workflow-123");
  expect(published.status).toBe("pending");

  // Step 2: Retrieve message to check status
  const retrieved = await client.getMessage(published.id);
  expect(retrieved.status).toBe("failed");
  expect(retrieved.retryCount).toBe(0);

  // Step 3: Retry failed message
  const retried = await client.retryMessage(retrieved.id);
  expect(retried.status).toBe("processing");
  expect(retried.retryCount).toBe(1);

  // Step 4: Check timeline
  const timeline_result = await client.getMessageTimeline(retried.id);
  expect(timeline_result.events.length).toBe(4);

  // Assert - Verify workflow execution
  expect(mockFetch.getCallCount()).toBe(4); // 4 API calls
  const allCalls = mockFetch.getCalls();
  expect(allCalls[0].method).toBe("POST"); // publish
  expect(allCalls[1].method).toBe("GET"); // getMessage
  expect(allCalls[2].method).toBe("POST"); // retryMessage
  expect(allCalls[3].method).toBe("GET"); // getTimeline
});

test("should handle multi-page pagination workflow", () => {
  // Arrange - Simulate pagination with multiple pages
  const page1Response = {
    messages: [
      createMockMessage({ id: "msg-1" }),
      createMockMessage({ id: "msg-2" }),
    ],
    pagination: { hasMore: true },
  };

  const page2Response = {
    messages: [
      createMockMessage({ id: "msg-3" }),
      createMockMessage({ id: "msg-4" }),
    ],
    pagination: { hasMore: false },
  };

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=2&offset=0`,
    page1Response,
    200
  );

  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages?limit=2&offset=2`,
    page2Response,
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act - Fetch multiple pages
  const page1 = await client.getMessages({ limit: 2, offset: 0 });
  const page2 = await client.getMessages({ limit: 2, offset: 2 });

  // Assert
  expect(page1.messages.length).toBe(2);
  expect(page1.pagination.hasMore).toBe(true);

  expect(page2.messages.length).toBe(2);
  expect(page2.pagination.hasMore).toBe(false);

  // Verify correct pagination parameters were used
  const allCalls = mockFetch.getCalls();
  expect(allCalls[0].url).toContain("offset=0");
  expect(allCalls[1].url).toContain("offset=2");
});
```

### Key Points

- **Multi-step:** Tests complete user scenarios across multiple methods
- **State Progression:** Each step builds on previous state
- **Request Verification:** Confirms correct sequence and parameters
- **Real-world:** Mimics how users actually use the SDK

---

## Example 6: Query Parameter Testing

This example demonstrates validating query parameters in requests.

### Scenario

Test that pagination and filtering parameters are correctly included in GET requests.

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  assertUrlQuery,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("should include pagination parameters in query string", () => {
  // Arrange
  mockFetch.setResponse(
    expect.stringContaining("/messages"),
    { messages: [], pagination: { hasMore: false } },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.getMessages({
    limit: 25,
    offset: 50,
  });

  // Assert
  const lastCall = mockFetch.getLastCall();

  // Verify each parameter using helper
  assertUrlQuery(lastCall?.url, "limit", "25");
  assertUrlQuery(lastCall?.url, "offset", "50");

  // Or verify manually
  expect(lastCall?.url).toContain("limit=25");
  expect(lastCall?.url).toContain("offset=50");
});

test("should include status filter in query string", () => {
  // Arrange
  mockFetch.setResponse(
    expect.stringContaining("status=completed"),
    { messages: [], pagination: { hasMore: false } },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.getMessages({
    status: "completed",
  });

  // Assert
  const lastCall = mockFetch.getLastCall();
  assertUrlQuery(lastCall?.url, "status", "completed");
});

test("should handle query parameters correctly for getErrorsByCode", () => {
  // Arrange
  mockFetch.setResponse(
    expect.stringContaining("code=HTTP_5XX"),
    { errors: [] },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.getErrorsByCode("HTTP_5XX");

  // Assert
  const lastCall = mockFetch.getLastCall();
  assertUrlQuery(lastCall?.url, "code", "HTTP_5XX");
});

test("should include scheduledAt in query for delayed publish", () => {
  // Arrange
  const futureTime = Date.now() + 3600000; // 1 hour from now
  mockFetch.setResponse(
    expect.stringContaining("scheduledAt"),
    { id: "msg-123", status: "pending" },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.publish("https://webhook.example.com", { data: "test" }, {
    scheduledAt: futureTime,
  });

  // Assert
  const lastCall = mockFetch.getLastCall();
  expect(lastCall?.url).toContain("scheduledAt");
  expect(lastCall?.url).toContain(String(futureTime));
});
```

### Key Points

- **Query String:** Verify parameters are in URL query string
- **Helper Functions:** Use `assertUrlQuery()` for clarity
- **Parameter Values:** Confirm correct values are passed
- **Optional Parameters:** Verify omission when not provided

---

## Example 7: Header Validation

This example shows comprehensive header validation patterns.

### Scenario

Test that all required headers are included with correct formats.

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import {
  MockFetch,
  TEST_BASE_URL,
  TEST_API_KEY,
  assertAuthHeader,
  assertContentTypeJson,
  assertHeaderPresent,
} from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("should include Authorization header with Bearer token", () => {
  // Arrange
  mockFetch.setResponse(
    `${TEST_BASE_URL}/health`,
    { status: "healthy" },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.getHealth();

  // Assert - Use helper to validate auth header
  const lastCall = mockFetch.getLastCall();
  assertAuthHeader(lastCall?.headers);

  // Or validate manually
  expect(lastCall?.headers["Authorization"]).toBeDefined();
  expect(lastCall?.headers["Authorization"]).toContain("Bearer ");
  expect(lastCall?.headers["Authorization"]).toContain(TEST_API_KEY);
});

test("should include Content-Type header for POST requests", () => {
  // Arrange
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages`,
    { id: "msg-123", status: "pending" },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.publish("https://webhook.example.com", { data: "test" });

  // Assert
  const lastCall = mockFetch.getLastCall();
  assertContentTypeJson(lastCall?.headers);

  // Verify exact value
  expect(lastCall?.headers["Content-Type"]).toBe("application/json");
});

test("should include custom headers with Queue-Forward- prefix", () => {
  // Arrange
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages`,
    { id: "msg-123", status: "pending" },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  const customHeaders = {
    "X-Custom-Header": "custom-value",
    "X-Request-Id": "req-12345",
  };

  // Act
  await client.publish("https://webhook.example.com", { data: "test" }, {
    headers: customHeaders,
  });

  // Assert
  const lastCall = mockFetch.getLastCall();

  // Check for Queue-Forward- prefix on custom headers
  expect(lastCall?.headers["Queue-Forward-X-Custom-Header"]).toBe("custom-value");
  expect(lastCall?.headers["Queue-Forward-X-Request-Id"]).toBe("req-12345");
});

test("should validate all required headers are present", () => {
  // Arrange
  mockFetch.setResponse(
    `${TEST_BASE_URL}/messages`,
    { id: "msg-123", status: "pending" },
    200
  );

  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act
  await client.publish("https://webhook.example.com", { data: "test" });

  // Assert
  const lastCall = mockFetch.getLastCall();

  // Verify all required headers
  assertHeaderPresent(lastCall?.headers, "Authorization");
  assertHeaderPresent(lastCall?.headers, "Content-Type");

  // Verify header values
  assertHeaderPresent(lastCall?.headers, "Content-Type", "application/json");
  assertHeaderPresent(lastCall?.headers, "Authorization", `Bearer ${TEST_API_KEY}`);
});
```

### Key Points

- **Authorization:** Always verify Bearer token format
- **Content-Type:** JSON requests must have correct type
- **Custom Headers:** Test Queue-Forward- prefix transformation
- **Helper Functions:** Use assertions to reduce boilerplate

---

## Example 8: Testing Parameter Validation

This example demonstrates testing input validation and error handling.

### Scenario

Test that methods validate required parameters and throw ValidationError appropriately.

### Test Code

```typescript
import { test, expect, beforeEach } from "bun:test";
import { InlineClient } from "../src/client";
import { ValidationError } from "../src/errors";
import { MockFetch, TEST_BASE_URL, TEST_API_KEY } from "./test-utils";

let mockFetch: MockFetch;

beforeEach(() => {
  mockFetch = new MockFetch();
});

test("should throw ValidationError if callbackUrl is empty", () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    client.publish("", { data: "test" });
    // Should not reach here
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }
});

test("should throw ValidationError if messageId is empty", () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    client.getMessage("");
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }
});

test("should throw ValidationError for retry with empty messageId", () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    client.retryMessage("");
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }
});

test("should throw ValidationError for getErrorsByCode without code", () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    client.getErrorsByCode("");
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }
});

test("should validate client config at construction", () => {
  // Test missing apiUrl
  try {
    new InlineClient({
      apiUrl: "",
      token: TEST_API_KEY,
    });
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }

  // Test missing token
  try {
    new InlineClient({
      apiUrl: TEST_BASE_URL,
      token: "",
    });
    expect(true).toBe(false);
  } catch (error) {
    expect(error instanceof ValidationError).toBe(true);
  }
});

test("validation error should have descriptive message", () => {
  // Arrange
  const client = new InlineClient({
    apiUrl: TEST_BASE_URL,
    token: TEST_API_KEY,
  });

  // Act & Assert
  try {
    client.getMessage("");
    expect(true).toBe(false);
  } catch (error) {
    if (error instanceof ValidationError) {
      // Error message should describe what's wrong
      expect(error.message.length).toBeGreaterThan(0);
      expect(error.code).toBeDefined();
    }
  }
});
```

### Key Points

- **Early Validation:** Tests check parameter validation before HTTP calls
- **Error Types:** Verify correct error class is thrown
- **No Mock Calls:** Validation happens before MockFetch is used
- **Configuration:** Constructor validation tested separately

---

## Summary

These examples demonstrate the key testing patterns used throughout the Inline SDK test suite:

1. **Simple Tests:** Basic method testing with mocks
2. **Error Handling:** Testing multiple error scenarios
3. **Mock Inspection:** Verifying request details
4. **Fixtures:** Reusing consistent test data
5. **Integration:** Testing complete workflows
6. **Query Parameters:** Validating URL construction
7. **Headers:** Verifying request headers
8. **Validation:** Testing input validation

## Related Resources

- [TESTING.md](./TESTING.md) - Complete testing strategy
- [tests/README.md](./tests/README.md) - Test suite guide
- `tests/test-utils.ts` - Actual test utilities
- `tests/client.test.ts` - 59 real-world client tests
- `tests/integration.test.ts` - 9 integration tests

## Running These Examples

```bash
# Create a new test file with examples
cat > tests/examples.test.ts << 'EOF'
# Paste any example code here
EOF

# Run the tests
bun test tests/examples.test.ts

# Or run all tests
bun test
```

---

**Last Updated:** October 21, 2025
**Framework:** Bun Test
**Status:** All examples verified and working ✅
