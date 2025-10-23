# Changelog

All notable changes to the Inline SDK are documented in this file.

## [2.0.0] - 2025-10-23

### Breaking Changes

These changes require code updates from v1.x to v2.0.0:

#### Timestamp Format Changes

**All timestamps are now ISO 8601 strings instead of Unix milliseconds (number)**

Before (v1.x):
```typescript
const message = await client.getMessage(id);
const createdAt: number = message.createdAt; // 1698056400000
const updatedAt: number = message.updatedAt;
```

After (v2.0.0):
```typescript
const message = await client.getMessage(id);
const createdAt: string = message.createdAt; // "2025-10-23T10:30:00.000Z"
const updatedAt: string = message.updatedAt; // "2025-10-23T10:30:00.000Z"
```

Affected types:
- `MessageResponse`: createdAt, updatedAt, scheduledAt, nextRetryAt
- `CreateMessageResponse`: createdAt
- `HealthStatus`: timestamp
- `MessageEvent`: timestamp
- `CallbackError`: timestamp → createdAt
- `ErrorStatsResponse`: lastOccurred

#### MessageResponse Field Renames

Field renamed for alignment with API:

```typescript
// Before (v1.x)
const headers: CallbackHeaders = message.headers;

// After (v2.0.0)
const callbackHeaders: CallbackHeaders = message.callbackHeaders;
```

#### CallbackError Field Renames

All fields renamed to be more explicit about their meaning:

```typescript
// Before (v1.x)
const error: CallbackError = {
  code: "HTTP_5XX",        // ← called 'code'
  message: "Server error",  // ← called 'message'
  statusCode: 500,          // ← called 'statusCode'
  timestamp: 1698056400000, // ← called 'timestamp'
  // ...
};

// After (v2.0.0)
const error: CallbackError = {
  errorCode: "HTTP_5XX",                       // renamed
  errorMessage: "Server error",                // renamed
  httpStatusCode: 500,                         // renamed
  createdAt: "2025-10-23T10:30:00.000Z",      // renamed & string
  attemptNumber: 2,                            // NEW optional field
  durationMs: 5000,                            // NEW optional field
  // ...
};
```

#### RetryMessageResponse Structure Changed

Complete restructuring of retry response:

```typescript
// Before (v1.x)
const retry = await client.retryMessage(id);
interface RetryMessageResponse {
  id: string;
  status: MessageStatus;
  retryCount: number;
  nextRetryAt?: number;
}

// After (v2.0.0)
const retry = await client.retryMessage(id);
interface RetryMessageResponse {
  success: boolean;
  messageId: string;
  message: string;
}
```

#### HealthStatus Structure Changed

Added required uptime field and made components optional:

```typescript
// Before (v1.x)
interface HealthStatus {
  status: "healthy" | "unhealthy";
  components: {
    database: "healthy" | "unhealthy";
    queue: "healthy" | "unhealthy";
  };
  timestamp: number;
}

// After (v2.0.0)
interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;           // now ISO string
  uptime: number;              // NEW required field
  components?: {               // now optional
    database: "healthy" | "unhealthy";
    queue: "healthy" | "unhealthy";
  };
}
```

#### EventType Updated

Event type names changed to be more descriptive:

```typescript
// Before (v1.x): CREATED, ACTIVE, DELIVERED, FAILED, RETRY, DEAD_LETTER

// After (v2.0.0):
// MESSAGE_RECEIVED
// PROCESSING_STARTED
// PROCESSING_COMPLETED
// PROCESSING_FAILED
// CALLBACK_INITIATED
// CALLBACK_SUCCEEDED
// CALLBACK_FAILED
// CALLBACK_RETRYING
// MANUAL_RETRY_TRIGGERED
```

#### ErrorCode Updated

New error codes added for better network error classification:

```typescript
// Before (v1.x)
type ErrorCode =
  | "HTTP_4XX"
  | "HTTP_5XX"
  | "TIMEOUT"
  | "ECONNREFUSED"
  | "ECONNRESET"
  | "UNKNOWN";

// After (v2.0.0)
type ErrorCode =
  | "HTTP_4XX"
  | "HTTP_5XX"
  | "TIMEOUT"
  | "ECONNREFUSED"
  | "ECONNRESET"
  | "ENOTFOUND"      // NEW
  | "DNS_FAILURE"    // NEW
  | "NETWORK_ERROR"  // NEW
  | "UNKNOWN";
```

### New Features

#### Zod Schema Validation

Complete Zod schemas for type-safe response validation:

```typescript
import {
  MessageResponseSchema,
  validateMessageResponse
} from '@inline/sdk';

// Option 1: Using validator functions (recommended)
try {
  const message = validateMessageResponse(data);
  // message is now typed as MessageResponse
} catch (error) {
  console.error('Invalid message response:', error.message);
}

// Option 2: Using schemas directly
const result = MessageResponseSchema.safeParse(data);
if (result.success) {
  const message = result.data;
} else {
  console.error('Validation failed:', result.error);
}
```

Available schemas:
- `ErrorCodeSchema` - validates error code enum
- `EventTypeSchema` - validates event type enum
- `MessageResponseSchema` - validates complete message objects
- `HealthStatusSchema` - validates health check responses
- `TimelineResponseSchema` - validates event timelines
- `TimelineEventSchema` - validates individual events
- `CallbackErrorSchema` - validates error objects
- `RetryMessageResponseSchema` - validates retry responses

#### Validator Functions

Helper functions for common validation scenarios:

```typescript
import {
  parseMessageId,
  validateTimestamp,
  validateMessageResponse,
  validateWithSchema
} from '@inline/sdk';

// Parse and validate message ID
const messageId = parseMessageId('message_000004QYYDCF9PHB9C6VWVHZEZ');

// Validate ISO 8601 timestamp
const timestamp = validateTimestamp('2025-10-23T10:30:00.000Z');

// Validate complete message response
const message = validateMessageResponse(apiResponse);

// Generic schema validation
const result = validateWithSchema(CustomSchema, data);
```

#### WebhookError Class

New dedicated error class for webhook callback failures:

```typescript
import { WebhookError } from '@inline/sdk';

// When handling callback errors
try {
  const errors = await client.getMessageErrors(messageId);
  for (const error of errors) {
    throw new WebhookError(
      error.errorMessage,
      error.errorCode,
      error.httpStatusCode,
      error.createdAt
    );
  }
} catch (error) {
  if (error instanceof WebhookError) {
    console.log(`Error code: ${error.errorCode}`);
    console.log(`Created at: ${error.createdAt}`);

    // Factory methods for common errors
    WebhookError.dnsFailure('DNS lookup failed');
    WebhookError.networkError('Network unreachable');
    WebhookError.notFound('Host not found');
  }
}
```

#### New MessageResponse Fields

Optional fields for enhanced error tracking:

```typescript
const message = await client.getMessage(id);

// NEW optional fields:
console.log(message.lastError?.errorCode);  // Last callback error details
console.log(message.timezone);              // Timezone for scheduled processing
console.log(message.attemptNumber);         // Current attempt in retry sequence
```

#### Enhanced Timestamp Validation

Strict ISO 8601 validation for all timestamp fields:

```typescript
// These are valid:
"2025-10-23T10:30:00.000Z"
"2025-10-23T10:30:00Z"
"2025-10-23T10:30:00.123Z"

// These are now invalid (proper error handling):
1698056400000           // Unix milliseconds - rejected
"2025-10-23"           // Date only - rejected
"10/23/2025"           // US format - rejected
```

### Deprecations

No deprecations in v2.0.0. All v1.x interfaces have been updated or replaced.

### Migration Guide

#### Step 1: Update Timestamp Usage

Identify all places using numeric timestamps:

```bash
# Search for these patterns in your code:
# - message.createdAt: number
# - message.updatedAt: number
# - error.timestamp: number
```

Update to parse ISO strings:

```typescript
// v1.x style
const dateMs = message.createdAt;
const date = new Date(dateMs);

// v2.0.0 style
const dateString = message.createdAt; // "2025-10-23T10:30:00.000Z"
const date = new Date(dateString);    // Direct ISO parsing
```

#### Step 2: Rename Field Accesses

```typescript
// Before
const headers = message.headers;
const code = error.code;
const message = error.message;
const status = error.statusCode;

// After
const callbackHeaders = message.callbackHeaders;
const code = error.errorCode;
const message = error.errorMessage;
const status = error.httpStatusCode;
```

#### Step 3: Update Error Handling

```typescript
// The new CallbackError structure means better error details
for (const error of errors) {
  console.log(`Error on attempt ${error.attemptNumber}`);
  console.log(`Duration: ${error.durationMs}ms`);
  console.log(`Code: ${error.errorCode}`);
}
```

#### Step 4: Add Validation

```typescript
// Recommended: Validate responses from API
import { validateMessageResponse } from '@inline/sdk';

try {
  const message = validateMessageResponse(await client.getMessage(id));
  // Now fully type-safe
} catch (error) {
  console.error('Response validation failed:', error.message);
}
```

### Performance

- Zod schema validation is lazy - schemas only validate when you call them
- No performance impact on SDK size (optional validation)
- TypeScript compilation unaffected by Zod additions

### Dependencies

- Added: `zod` ^3 for type-safe schema validation

### Documentation

- Updated all JSDoc comments for clarity
- Added comprehensive migration guide (this file)
- Added usage examples for validators
- Enhanced module documentation with examples

### Testing

- 28 test cases for schema validation
- 20 test cases for validator functions
- 28 test cases for error handling
- All tests passing with 100% coverage for schemas

## [1.0.0] - Previous Release

See git history for v1.0.0 changes.

---

## Upgrade Path from v1.x

1. **Backup your code** - This is a major version change
2. **Install new version**: `npm install @dnl-fm/inline-sdk@2.0.0`
3. **Follow Migration Guide** above
4. **Run type checker**: `tsc --noEmit` to find issues
5. **Update tests** for new timestamp format
6. **Test thoroughly** before deploying to production

## Support

For migration assistance, see the [README.md](./README.md) for detailed examples and the [API documentation](https://inline.example.com/docs) for reference.
