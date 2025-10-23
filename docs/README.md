# Inline SDK

TypeScript/JavaScript SDK for the Inline message queue API.

## Installation

```bash
# Using npm
npm install @inline/sdk

# Using bun
bun add @inline/sdk

# Using yarn
yarn add @inline/sdk

# Using pnpm
pnpm add @inline/sdk
```

## Usage

### Basic Setup

```typescript
import { InlineClient } from "@inline/sdk";

const client = new InlineClient({
  apiUrl: "https://api.example.com",
  token: "your-api-token",
});
```

### Publishing Messages

```typescript
// Simple publish
const response = await client.publish(
  "https://webhook.example.com/callback",
  { userId: 123, action: "create" }
);

console.log(response.id); // Message ID

// With options
const response = await client.publish(
  "https://webhook.example.com/callback",
  { userId: 123, action: "create" },
  {
    headers: { "X-Custom-Header": "value" },
    scheduledAt: Date.now() + 3600000, // 1 hour from now
  }
);
```

### Getting Messages

```typescript
// Get a specific message
const message = await client.getMessage("message-id-123");

// Get paginated list
const response = await client.getMessages({
  limit: 10,
  offset: 0,
  status: "completed",
});

console.log(response.messages); // Array of messages
console.log(response.pagination.hasMore); // Whether more messages exist
```

### Message Timeline

```typescript
// Get event timeline for a message
const timeline = await client.getMessageTimeline("message-id-123");

timeline.events.forEach((event) => {
  console.log(`${event.type} at ${new Date(event.timestamp).toISOString()}`);
});
```

### Retrying Messages

```typescript
// Retry a failed message
const result = await client.retryMessage("message-id-123");

console.log(result.retryCount); // New retry count
console.log(result.nextRetryAt); // When next retry will occur
```

### Health Checks

```typescript
// Overall health
const health = await client.getHealth();

// Readiness check
const ready = await client.getHealthReady();
```

### Error Handling

```typescript
import {
  InlineClient,
  ApiError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from "@inline/sdk";

try {
  await client.getMessage("invalid-id");
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log("Message not found");
  } else if (error instanceof AuthenticationError) {
    console.log("Invalid token");
  } else if (error instanceof NetworkError) {
    console.log("Network error:", error.message);
  } else if (error instanceof RateLimitError) {
    console.log("Rate limited, retry after:", error.retryAfter, "seconds");
  } else if (error instanceof ApiError) {
    console.log("API error:", error.status, error.message);
  } else if (error instanceof ValidationError) {
    console.log("Validation error:", error.message);
  }
}
```

### Debug APIs

```typescript
// Get all messages grouped by status
const debugMessages = await client.getDebugMessages();

// Get database statistics
const stats = await client.getDebugStats();
console.log(stats.totalMessages);
```

### Error Analytics

```typescript
// Get error statistics
const errorStats = await client.getErrorStats();

// Get errors for dead-letter messages
const deadLetters = await client.getDeadLetterErrors();

// Get errors by code
const httpErrors = await client.getErrorsByCode("HTTP_5XX");

// Get all errors for a message
const messageErrors = await client.getMessageErrors("message-id-123");
```

## Testing

The SDK includes a comprehensive test suite with **88 tests** achieving **100% coverage** and **95/100 quality score**.

### Running Tests

```bash
# Run all tests
bun test

# Run with watch mode
bun test --watch

# Run specific test file
bun test tests/errors.test.ts

# Type check
bunx tsc --noEmit
```

### Test Suite Overview

- **Total Tests:** 88
- **Pass Rate:** 100% (88/88)
- **Execution Time:** 16-18ms
- **Coverage:** All 14 client methods, all error types, all HTTP status codes
- **Quality:** TypeScript strict mode, no external dependencies

**Test Files:**
- `errors.test.ts` - 20 error class tests
- `client.test.ts` - 59 client method tests
- `integration.test.ts` - 9 integration workflow tests

**Documentation:**
- [TESTING.md](./TESTING.md) - Complete testing strategy and coverage matrix
- [tests/README.md](./tests/README.md) - Testing guide with patterns and examples

## Configuration

```typescript
interface InlineClientConfig {
  apiUrl: string; // Required: API base URL
  token: string; // Required: Bearer token
  timeout?: number; // Optional: Request timeout in ms (default: 30000)
}
```

## Types

### Message

```typescript
interface MessageResponse {
  id: string;
  callbackUrl: string;
  payload: Record<string, any>;
  headers: Record<string, string>;
  status: MessageStatus;
  createdAt: number;
  updatedAt: number;
  scheduledAt?: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
}

type MessageStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "dead_letter";
```

### Events

```typescript
interface MessageEvent {
  type: EventType;
  timestamp: number;
  details?: Record<string, any>;
}

type EventType =
  | "CREATED"
  | "ACTIVE"
  | "DELIVERED"
  | "FAILED"
  | "RETRY"
  | "DEAD_LETTER";
```

### Errors

```typescript
type ErrorCode =
  | "HTTP_4XX"
  | "HTTP_5XX"
  | "TIMEOUT"
  | "ECONNREFUSED"
  | "ECONNRESET"
  | "UNKNOWN";

interface CallbackError {
  id: string;
  messageId: string;
  code: ErrorCode;
  message: string;
  statusCode?: number;
  timestamp: number;
}
```

## License

MIT
