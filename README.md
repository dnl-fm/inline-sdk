# Inline SDK - TypeScript Client for Message Queue API

> A complete, type-safe TypeScript SDK for the Inline message queue service. Publish messages, manage delivery, and query system status with full TypeScript support.

**Version:** 0.2.1 | **License:** MIT

## Table of Contents

- [Overview](#overview)
- [Why Inline SDK Exists](#why-inline-sdk-exists)
- [What It Does](#what-it-does)
- [Installation](#installation)
- [Setup](#setup)
  - [Configuration](#configuration)
  - [Authentication](#authentication)
  - [Error Handling](#error-handling)
- [Quickstart](#quickstart)
  - [Basic Message Publishing](#basic-message-publishing)
  - [Scheduled Delivery](#scheduled-delivery)
  - [Retrieving Messages](#retrieving-messages)
  - [Timeline and History](#timeline-and-history)
  - [Monitoring and Health](#monitoring-and-health)
- [API Reference](#api-reference)
  - [InlineClient](#inlineclient)
  - [Message Publishing](#message-publishing)
  - [Message Retrieval](#message-retrieval)
  - [Timeline and History](#timeline-and-history-api)
  - [Message Retry](#message-retry)
  - [Health and Status](#health-and-status)
  - [Error Monitoring](#error-monitoring)
  - [Debug Endpoints](#debug-endpoints)
- [Types and Interfaces](#types-and-interfaces)
- [Error Handling](#error-handling-guide)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

The **Inline SDK** is a lightweight, type-safe TypeScript client for interacting with the Inline message queue API. It provides a clean, intuitive API for publishing messages to webhook endpoints with automatic retry logic, scheduling, and comprehensive error tracking.

### Key Features

- ✅ **Type-Safe** – Full TypeScript with complete type definitions
- ✅ **Zero Dependencies** – Native Bun/Node.js fetch API
- ✅ **Validation** – Built-in Zod schema validation
- ✅ **Error Handling** – Specific error types for each failure scenario
- ✅ **Scheduling** – Relative delays and absolute time scheduling
- ✅ **Timezone Support** – IANA timezone-aware scheduling
- ✅ **Comprehensive API** – Methods for publishing, tracking, monitoring, and debugging

## Why Inline SDK Exists

The Inline SDK solves the problem of reliably delivering webhooks and asynchronous messages with:

1. **Reliable Delivery** - Automatic retries with exponential backoff for failed callbacks
2. **Message Tracking** - Complete audit trail with event timeline for each message
3. **Flexible Scheduling** - Schedule messages for future delivery with timezone support
4. **Error Visibility** - Detailed error tracking and dead-letter queue for failed messages
5. **Developer Experience** - Type-safe API prevents runtime errors and provides IDE autocomplete

### Use Cases

- 📧 **Webhook Delivery** - Reliably deliver webhooks to external systems
- 🔔 **Event Notifications** - Send event notifications with guaranteed delivery
- ⏰ **Scheduled Tasks** - Queue messages for delivery at specific times
- 📊 **Audit Logs** - Track complete history of message processing
- 🚨 **Error Monitoring** - Identify and debug delivery failures
- 🔄 **Retry Management** - Automatic and manual retry of failed deliveries

## What It Does

The Inline SDK provides:

### Message Publishing
- Publish messages to callback URLs with JSON payload
- Immediate or scheduled delivery (relative delay or absolute time)
- Custom HTTP headers forwarded to callback endpoints
- Timezone-aware scheduling with IANA timezone support

### Message Management
- Retrieve individual messages with full metadata
- List messages with pagination and status filtering
- View complete event timeline for any message
- Manually retry failed or dead-letter messages

### System Monitoring
- Check API health status
- Get readiness status for orchestration systems
- Monitor message distribution by status
- View aggregated error statistics

### Error Tracking
- Track errors for specific messages
- Get errors grouped by error code
- Access dead-letter queue for failed messages
- Review database and storage configuration

## Installation

### npm / pnpm / yarn

```bash
npm install @dnl-fm/inline-sdk
# or
pnpm add @dnl-fm/inline-sdk
# or
yarn add @dnl-fm/inline-sdk
```

### JSR (JavaScript Registry)

```bash
npx jsr add @dnl-fm/inline-sdk
# or
bunx jsr add @dnl-fm/inline-sdk
```

### Bun

```bash
bun add @dnl-fm/inline-sdk
```

## Setup

### Configuration

Create an `InlineClient` instance with your API URL and authentication token:

```typescript
import { InlineClient } from '@dnl-fm/inline-sdk';

const client = new InlineClient({
  apiUrl: 'https://api.inline.example.com',
  token: 'your-api-token',
  timeout: 30000 // Optional: request timeout in milliseconds (default: 30000)
});
```

### Authentication

The SDK uses Bearer token authentication. Provide your API token when initializing:

```typescript
const client = new InlineClient({
  apiUrl: process.env.INLINE_API_URL,
  token: process.env.INLINE_API_TOKEN
});
```

### Error Handling

All SDK methods are async and throw specific error types. Always wrap calls in try-catch:

```typescript
import {
  InlineClient,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  NetworkError
} from '@dnl-fm/inline-sdk';

const client = new InlineClient({ apiUrl: '...', token: '...' });

try {
  const response = await client.publish(url, payload);
  console.log(`Published: ${response.id}`);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found:', error.message);
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication failed - check your token');
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Quickstart

### Basic Message Publishing

Publish a message for immediate delivery:

```typescript
const response = await client.publish(
  'https://webhook.example.com/events',
  {
    event: 'user.created',
    userId: 123,
    email: 'user@example.com'
  }
);

console.log(`Message published: ${response.id}`);
console.log(`Created at: ${response.created_at}`);
console.log(`Timezone: ${response.timezone}`);
```

### Scheduled Delivery

#### Schedule with relative delay

Deliver the message 5 minutes from now:

```typescript
const response = await client.publish(
  'https://webhook.example.com/events',
  { event: 'order.shipped', orderId: 456 },
  {
    delay: '5m' // Can use: ms, s, m, h, d
  }
);
```

#### Schedule with absolute time (UTC)

```typescript
const response = await client.publish(
  'https://webhook.example.com/events',
  { event: 'order.shipped', orderId: 456 },
  {
    notBefore: '2024-10-28T14:30:00Z' // ISO 8601 UTC format
  }
);
```

#### Schedule with local time and timezone

```typescript
const response = await client.publish(
  'https://webhook.example.com/events',
  { event: 'daily.digest', userId: 123 },
  {
    notBefore: '2024-10-28T09:00:00', // Naive ISO time (no timezone)
    timezone: 'America/New_York'      // IANA timezone identifier
  }
);
```

#### Add custom headers

Forward custom headers to the callback endpoint:

```typescript
const response = await client.publish(
  'https://webhook.example.com/events',
  { event: 'payment.completed', amount: 99.99 },
  {
    headers: {
      'X-API-Key': 'webhook-secret-key',
      'X-Request-ID': crypto.randomUUID()
    }
  }
);
```

#### Specify HTTP method for callback

Choose which HTTP method to use when delivering to the callback endpoint:

```typescript
// Use PUT for callback instead of default POST
const response = await client.publish(
  'https://webhook.example.com/events',
  { event: 'resource.updated', resourceId: 789 },
  {
    method: 'PUT'  // GET, POST, PUT, PATCH, DELETE
  }
);

// GET callback (no payload, webhook-style)
const response = await client.publish(
  'https://webhook.example.com/ping',
  { },  // Empty payload for GET
  {
    method: 'GET'
  }
);

// DELETE callback
const response = await client.publish(
  'https://webhook.example.com/resources/123',
  { reason: 'cleanup' },
  {
    method: 'DELETE'
  }
);
```

### Retrieving Messages

Get a specific message with full metadata:

```typescript
const message = await client.getMessage('message_01234567890abcdefghijklmn');

console.log(`Status: ${message.status}`);           // pending, processing, completed, failed, dead_letter
console.log(`Retry count: ${message.retry_count}`);
console.log(`Max retries: ${message.max_retries}`);
console.log(`Callback URL: ${message.callback_url}`);
console.log(`Payload:`, message.payload);

if (message.last_error) {
  console.log(`Last error: ${message.last_error.error_code} - ${message.last_error.error_message}`);
}
```

### List Messages

Get paginated list of messages with optional filtering:

```typescript
// Get first 10 messages
const result = await client.listMessages();

// Get completed messages with pagination
const result = await client.listMessages({
  limit: 50,
  offset: 100,
  status: 'completed'
});

console.log(`Total: ${result.pagination.total}`);
console.log(`Has more: ${result.pagination.hasMore}`);

for (const message of result.messages) {
  console.log(`${message.id}: ${message.status}`);
}
```

### Timeline and History

View the complete event history for a message:

```typescript
const timeline = await client.getMessageTimeline('message_01234567890abcdefghijklmn');

console.log(`Total events: ${timeline.event_count}`);

for (const event of timeline.events) {
  const timestamp = new Date(event.timestamp);
  console.log(`[${timestamp.toISOString()}] ${event.type}`);

  if (event.details) {
    console.log(`  Details:`, event.details);
  }
}

// Example output:
// Total events: 5
// [2024-10-21T10:00:00.000Z] MESSAGE_RECEIVED
// [2024-10-21T10:00:05.000Z] MESSAGE_SCHEDULED
// [2024-10-21T10:05:00.000Z] DELIVERY_ATTEMPT
// [2024-10-21T10:05:02.000Z] MESSAGE_COMPLETED
```

### Monitoring and Health

Check API health and readiness:

```typescript
// Get detailed health status
const health = await client.getHealth();
console.log(`Health status: ${health.status}`); // healthy, degraded, unhealthy
console.log(`Uptime (seconds): ${health.uptime}`);

if (health.components?.http) {
  console.log(`HTTP component: ${health.components.http.status}`);
}

// Get readiness status (for Kubernetes/orchestration)
const ready = await client.getHealthReady();
console.log(`Ready: ${ready.status === 'ready'}`);
```

## API Reference

### InlineClient

The main class for interacting with the Inline API.

#### Constructor

```typescript
constructor(config: InlineClientConfig)
```

**Parameters:**
- `config.apiUrl` (string, required) - Base URL of the Inline API
- `config.token` (string, required) - Bearer token for authentication
- `config.timeout` (number, optional) - Request timeout in milliseconds (default: 30000)

**Throws:** `ValidationError` if apiUrl or token is missing

**Example:**
```typescript
const client = new InlineClient({
  apiUrl: 'https://api.inline.example.com',
  token: 'sk_live_abcd1234',
  timeout: 45000
});
```

---

### Message Publishing

#### publish()

Publish a message to the queue for delivery to a callback URL.

```typescript
publish(
  callbackUrl: string,
  payload: MessagePayload,
  options?: PublishOptions
): Promise<CreateMessageResponse>
```

**Parameters:**
- `callbackUrl` (string, required) - Target URL for HTTP POST delivery
- `payload` (Record<string, any>, required) - JSON-serializable message data
- `options` (PublishOptions, optional) - Publishing configuration

**Options:**
- `delay` (string) - Relative delay: "5m", "1h", "30s", "2d", etc.
- `notBefore` (string) - ISO 8601 absolute scheduling datetime
- `timezone` (string) - IANA timezone identifier for context
- `headers` (Record<string, string>) - Custom HTTP headers to forward
- `method` ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') - HTTP method for callback (default: POST)

**Returns:** `CreateMessageResponse` with:
- `id` - ULID-based message identifier
- `created_at` - ISO 8601 creation timestamp
- `timezone` - Timezone used for scheduling

**Throws:**
- `ValidationError` - If callbackUrl or payload is missing
- `AuthenticationError` - If token is invalid
- `NetworkError` - If unable to reach API
- `RateLimitError` - If rate limit exceeded

**Examples:**

```typescript
// Immediate delivery
const msg = await client.publish('https://webhook.example.com/events', {
  event: 'test',
  timestamp: new Date()
});

// Scheduled delivery (5 minutes from now)
const msg = await client.publish(
  'https://webhook.example.com/events',
  { event: 'digest' },
  { delay: '5m' }
);

// Scheduled with timezone
const msg = await client.publish(
  'https://webhook.example.com/events',
  { event: 'daily_summary' },
  {
    notBefore: '2024-10-28T09:00:00',
    timezone: 'America/New_York'
  }
);

// With custom headers
const msg = await client.publish(
  'https://webhook.example.com/events',
  { event: 'payment' },
  {
    headers: { 'X-Webhook-Secret': 'abc123' }
  }
);
```

---

### Message Retrieval

#### getMessage()

Retrieve a specific message by ID.

```typescript
getMessage(messageId: string): Promise<MessageResponse>
```

**Parameters:**
- `messageId` (string, required) - ULID of the message

**Returns:** `MessageResponse` with complete metadata:
- `id` - Message identifier
- `callback_url` - Target endpoint
- `payload` - Message data
- `status` - Current status
- `retry_count` - Number of delivery attempts
- `next_retry_at` - Timestamp of next retry
- `last_error` - Most recent error details

**Throws:**
- `ValidationError` - If messageId is empty
- `NotFoundError` - If message doesn't exist
- `AuthenticationError` - If token is invalid

**Example:**
```typescript
const msg = await client.getMessage('message_01234567890abcdefghijklmn');
console.log(`Status: ${msg.status}`);
console.log(`Attempts: ${msg.retry_count}/${msg.max_retries}`);
```

#### listMessages()

Get a paginated list of messages.

```typescript
listMessages(options?: ListMessagesOptions): Promise<ListMessagesResponse>
```

**Parameters:**
- `limit` (number, optional) - Results per page (default: 10, max: 100)
- `offset` (number, optional) - Starting position (default: 0)
- `status` (MessageStatus, optional) - Filter by status

**Returns:** `ListMessagesResponse` with:
- `messages[]` - Array of MessageResponse objects
- `pagination.total` - Total number of messages
- `pagination.hasMore` - Whether more results available

**Example:**
```typescript
const result = await client.listMessages({
  limit: 50,
  status: 'failed'
});

console.log(`Found ${result.pagination.total} failed messages`);
```

---

### Timeline and History API

#### getMessageTimeline()

Get the complete event timeline for a message.

```typescript
getMessageTimeline(messageId: string): Promise<TimelineResponse>
```

**Parameters:**
- `messageId` (string, required) - ULID of the message

**Returns:** `TimelineResponse` with:
- `message_id` - The message ID
- `event_count` - Total number of events
- `events[]` - Array of TimelineEvent objects

**Event Types:**
- `MESSAGE_RECEIVED` - Message received by API
- `MESSAGE_SCHEDULED` - Message scheduled for delivery
- `DELIVERY_ATTEMPT` - Callback delivery attempted
- `MESSAGE_COMPLETED` - Message successfully delivered
- `MESSAGE_FAILED` - Message failed to deliver
- `MESSAGE_RETRIED` - Message was retried

**Example:**
```typescript
const timeline = await client.getMessageTimeline('message_123');

for (const event of timeline.events) {
  console.log(`${event.type} at ${event.timestamp}`);
}
```

---

### Message Retry

#### retryMessage()

Manually trigger delivery retry for a failed or dead-letter message.

```typescript
retryMessage(messageId: string): Promise<RetryMessageResponse>
```

**Parameters:**
- `messageId` (string, required) - ULID of the message to retry

**Returns:** `RetryMessageResponse` with:
- `success` - Whether retry was queued
- `message_id` - The retried message ID
- `message` - Confirmation message

**Throws:**
- `ValidationError` - If messageId is empty
- `NotFoundError` - If message doesn't exist

**Example:**
```typescript
const result = await client.retryMessage('message_123');
if (result.success) {
  console.log(`Retry queued for ${result.messageId}`);
}
```

---

### Health and Status

#### getHealth()

Get the health status of the API and its components.

```typescript
getHealth(): Promise<HealthStatus>
```

**Returns:** `HealthStatus` with:
- `status` - "healthy" | "degraded" | "unhealthy"
- `timestamp` - ISO 8601 check timestamp
- `uptime` - Uptime in seconds
- `components.http` - HTTP component status (optional)

**Example:**
```typescript
const health = await client.getHealth();
if (health.status === 'healthy') {
  console.log('API is fully operational');
}
```

#### getHealthReady()

Get readiness status for Kubernetes/orchestration systems.

```typescript
getHealthReady(): Promise<HealthReadyResponse>
```

**Returns:** `HealthReadyResponse` with:
- `status` - "ready" if all dependencies initialized
- `timestamp` - Unix timestamp in milliseconds

**Example:**
```typescript
const ready = await client.getHealthReady();
if (ready.status === 'ready') {
  console.log('API is ready to serve requests');
}
```

---

### Error Monitoring

#### getErrorStats()

Get aggregated error statistics grouped by error code.

```typescript
getErrorStats(): Promise<ErrorStatsResponse>
```

**Returns:** `ErrorStatsResponse` with:
- `summary.total_errors` - Total error count
- `summary.error_types` - Number of unique error types
- `errors[]` - Array of errors with count and average duration

**Example:**
```typescript
const stats = await client.getErrorStats();
console.log(`Total errors: ${stats.summary.total_errors}`);
for (const err of stats.errors) {
  console.log(`${err.error_code}: ${err.count} times`);
}
```

#### getErrorsByCode()

Get all errors of a specific error code.

```typescript
getErrorsByCode(code: string): Promise<CallbackError[]>
```

**Parameters:**
- `code` (string, required) - Error code to filter by (e.g., 'TIMEOUT', 'HTTP_5XX')

**Returns:** Array of `CallbackError` objects with:
- `id` - Error identifier
- `message_id` - Associated message ID
- `error_code` - Error classification
- `error_message` - Human-readable description
- `http_status_code` - HTTP status code (if applicable)
- `attempt_number` - Which retry attempt
- `duration_ms` - Request duration

**Error Codes:**
- `HTTP_4XX` - Client error from callback (4xx)
- `HTTP_5XX` - Server error from callback (5xx)
- `TIMEOUT` - Request timeout
- `ECONNREFUSED` - Connection refused
- `ECONNRESET` - Connection reset
- `ENOTFOUND` - DNS resolution failed
- `DNS_FAILURE` - DNS lookup error
- `NETWORK_ERROR` - Generic network error
- `UNKNOWN` - Unknown error

**Example:**
```typescript
const timeouts = await client.getErrorsByCode('TIMEOUT');
console.log(`Found ${timeouts.length} timeout errors`);
```

#### getMessageErrors()

Get all errors for a specific message.

```typescript
getMessageErrors(messageId: string): Promise<CallbackError[]>
```

**Parameters:**
- `messageId` (string, required) - ULID of the message

**Returns:** Array of `CallbackError` objects for that message

**Example:**
```typescript
const errors = await client.getMessageErrors('message_123');
for (const err of errors) {
  console.log(`Attempt ${err.attempt_number}: ${err.error_code}`);
}
```

#### getDeadLetterErrors()

Get all messages in the dead-letter queue (failed all retries).

```typescript
getDeadLetterErrors(): Promise<DeadLetterResponse>
```

**Returns:** `DeadLetterResponse` with:
- `summary.total_messages` - Count of DLQ messages
- `summary.total_errors` - Count of errors in DLQ
- `messages` - Errors grouped by message ID

**Example:**
```typescript
const dlq = await client.getDeadLetterErrors();
console.log(`${dlq.summary.total_messages} messages in DLQ`);
for (const [msgId, errors] of Object.entries(dlq.messages)) {
  console.log(`Message ${msgId}: ${errors.length} errors`);
}
```

---

### Debug Endpoints

#### getDebugMessages()

Get all messages grouped by their current status (debug endpoint).

```typescript
getDebugMessages(): Promise<DebugMessagesResponse>
```

**Returns:** `DebugMessagesResponse` with messages grouped by status:
- `pending` - Waiting to be processed
- `processing` - Currently being delivered
- `completed` - Successfully delivered
- `failed` - Failed but has retries left
- `dead_letter` - Failed all retries

**Example:**
```typescript
const debug = await client.getDebugMessages();
console.log(`Pending: ${debug.summary.pending}`);
console.log(`Failed: ${debug.summary.failed}`);
console.log(`Completed: ${debug.summary.completed}`);
```

#### getDebugStats()

Get database and storage configuration (debug endpoint).

```typescript
getDebugStats(): Promise<DebugStatsResponse>
```

**Returns:** `DebugStatsResponse` with:
- `database` - Database type
- `storage` - Storage configuration
- `location` - Database file path
- `note` - Additional notes

**Example:**
```typescript
const stats = await client.getDebugStats();
console.log(`Database: ${stats.database}`);
console.log(`Location: ${stats.location}`);
```

---

## Types and Interfaces

### Core Types

```typescript
// Message status in the queue
type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

// Event types in timeline
type EventType = 'MESSAGE_RECEIVED' | 'MESSAGE_SCHEDULED' | 'DELIVERY_ATTEMPT'
               | 'MESSAGE_COMPLETED' | 'MESSAGE_FAILED' | 'MESSAGE_RETRIED';

// Error codes for callback failures
type ErrorCode = 'HTTP_4XX' | 'HTTP_5XX' | 'TIMEOUT' | 'ECONNREFUSED'
               | 'ECONNRESET' | 'ENOTFOUND' | 'DNS_FAILURE' | 'NETWORK_ERROR' | 'UNKNOWN';

// Message payload
type MessagePayload = Record<string, any>;

// HTTP headers
type CallbackHeaders = Record<string, string>;
```

### Configuration

```typescript
interface InlineClientConfig {
  apiUrl: string;      // API base URL
  token: string;       // Bearer token
  timeout?: number;    // Request timeout (ms)
}

interface PublishOptions {
  headers?: CallbackHeaders;  // Custom headers to forward
  delay?: string;             // Relative delay (e.g., "5m")
  notBefore?: string;         // ISO 8601 absolute time
  timezone?: string;          // IANA timezone
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';  // HTTP method for callback
}

interface ListMessagesOptions {
  limit?: number;      // Results per page (default: 10)
  offset?: number;     // Starting position (default: 0)
  status?: MessageStatus;  // Filter by status
}
```

### Responses

```typescript
interface MessageResponse {
  id: string;
  callback_url: string;
  payload: MessagePayload;
  callback_headers: CallbackHeaders;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
  scheduled_at?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  last_error?: CallbackError;
  timezone?: string;
}

interface CreateMessageResponse {
  id: string;
  created_at: string;
  timezone: string;
}

interface TimelineResponse {
  message_id: string;
  event_count: number;
  events: MessageEvent[];
}

interface MessageEvent {
  type: EventType;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  components?: {
    http?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      secondsSinceUpdate: number;
      info: string;
    };
  };
}

interface CallbackError {
  id: string;
  message_id: string;
  error_code: ErrorCode;
  error_message: string;
  http_status_code?: number;
  created_at: string;
  attempt_number?: number;
  duration_ms?: number;
}
```

---

## Error Handling Guide

The SDK uses specific error classes for different failure scenarios:

### InlineError

Base error class for all SDK errors.

```typescript
try {
  await client.publish(url, payload);
} catch (error) {
  if (error instanceof InlineError) {
    console.log(error.code);    // Error code
    console.log(error.status);  // HTTP status
    console.log(error.message); // Human-readable message
  }
}
```

### ValidationError

Thrown when input validation fails.

```typescript
try {
  await client.publish('', payload); // Missing URL
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  }
}
```

### AuthenticationError (HTTP 401)

Thrown when authentication fails.

```typescript
try {
  const client = new InlineClient({ apiUrl: '...', token: 'invalid' });
  await client.getHealth();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid or expired token');
  }
}
```

### AuthorizationError (HTTP 403)

Thrown when user lacks required permissions.

```typescript
try {
  await client.publish(url, payload);
} catch (error) {
  if (error instanceof AuthorizationError) {
    console.error('Not authorized to perform this action');
  }
}
```

### NotFoundError (HTTP 404)

Thrown when a requested resource doesn't exist.

```typescript
try {
  const msg = await client.getMessage('non-existent-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Message not found');
  }
}
```

### RateLimitError (HTTP 429)

Thrown when rate limit is exceeded.

```typescript
try {
  await client.publish(url, payload);
} catch (error) {
  if (error instanceof RateLimitError) {
    const retryAfter = error.retryAfter || 60000;
    console.log(`Rate limited. Retry after ${retryAfter}ms`);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
  }
}
```

### ServerError (HTTP 5xx)

Thrown when API returns a server error.

```typescript
try {
  await client.getHealth();
} catch (error) {
  if (error instanceof ServerError) {
    console.error(`Server error (${error.status}): ${error.message}`);
  }
}
```

### NetworkError

Thrown on network connectivity issues.

```typescript
try {
  await client.publish(url, payload);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    console.error('Original error:', error.originalError);
  }
}
```

### WebhookError

Represents errors from webhook callback delivery (not thrown by client).

```typescript
const errors = await client.getMessageErrors('message_123');
for (const callbackError of errors) {
  const webhookError = new WebhookError(
    callbackError.errorMessage,
    callbackError.errorCode,
    callbackError.httpStatusCode,
    callbackError.createdAt
  );
  console.log(`Webhook failed: ${webhookError.errorCode}`);
}
```

---

## Examples

### Complete Workflow Example

```typescript
import {
  InlineClient,
  NotFoundError,
  NetworkError,
  type MessageResponse
} from '@dnl-fm/inline-sdk';

const client = new InlineClient({
  apiUrl: 'https://api.inline.example.com',
  token: process.env.INLINE_TOKEN!
});

async function processOrder(orderId: number) {
  try {
    // 1. Publish webhook for order processing
    const publishResp = await client.publish(
      'https://webhook.example.com/orders',
      {
        event: 'order.created',
        orderId,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'X-Request-ID': crypto.randomUUID()
        }
      }
    );

    console.log(`Order webhook published: ${publishResp.id}`);

    // 2. Schedule follow-up notification (24 hours later)
    const followUpResp = await client.publish(
      'https://webhook.example.com/notifications',
      {
        event: 'order.reminder',
        orderId,
        type: 'follow_up'
      },
      {
        delay: '24h'
      }
    );

    console.log(`Follow-up scheduled: ${followUpResp.id}`);

    // 3. Check message status
    const message = await client.getMessage(publishResp.id);
    console.log(`Message status: ${message.status}`);

    // 4. View timeline
    const timeline = await client.getMessageTimeline(publishResp.id);
    console.log(`Timeline events: ${timeline.event_count}`);

    // 5. Monitor for errors
    const errors = await client.getMessageErrors(publishResp.id);
    if (errors.length > 0) {
      console.warn(`Message has ${errors.length} errors`);
      for (const error of errors) {
        console.warn(`  - ${error.error_code}: ${error.error_message}`);
      }
    }

    return publishResp.id;
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.error('Order not found');
    } else if (error instanceof NetworkError) {
      console.error('Failed to reach API');
    } else {
      throw error;
    }
  }
}

// Usage
await processOrder(12345);
```

### Monitoring and Health Check

```typescript
async function monitorSystem() {
  const health = await client.getHealth();
  const ready = await client.getHealthReady();

  console.log('=== System Health ===');
  console.log(`Overall: ${health.status}`);
  console.log(`Uptime: ${Math.floor(health.uptime / 60)} minutes`);
  console.log(`Ready: ${ready.status === 'ready'}`);

  if (health.components?.http) {
    console.log(`HTTP component: ${health.components.http.status}`);
    console.log(`  Info: ${health.components.http.info}`);
  }

  const errors = await client.getErrorStats();
  console.log(`\n=== Error Statistics ===`);
  console.log(`Total errors: ${errors.summary.total_errors}`);
  console.log(`Error types: ${errors.summary.error_types}`);

  for (const err of errors.errors) {
    console.log(`  ${err.error_code}: ${err.count} (avg ${err.avg_duration_ms}ms)`);
  }
}

await monitorSystem();
```

### Error Recovery

```typescript
async function publishWithRetry(url: string, payload: any, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.publish(url, payload);
    } catch (error) {
      if (error instanceof RateLimitError) {
        const delay = error.retryAfter || 60000;
        console.log(`Rate limited. Waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (error instanceof NetworkError && attempt < maxAttempts) {
        const backoff = Math.pow(2, attempt - 1) * 1000;
        console.log(`Network error. Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        throw error;
      }
    }
  }
}

const result = await publishWithRetry('https://webhook.example.com/events', {
  event: 'test'
});
```

---

## Best Practices

### 1. Always Handle Errors

Wrap SDK calls in try-catch and handle specific error types:

```typescript
try {
  const msg = await client.publish(url, payload);
} catch (error) {
  // Handle errors appropriately
}
```

### 2. Use Timezone for Scheduled Messages

When scheduling messages for specific local times, always include timezone:

```typescript
await client.publish(url, payload, {
  notBefore: '2024-10-28T09:00:00',
  timezone: 'America/New_York'
});
```

### 3. Validate Callback URLs

Ensure callback URLs are valid before publishing:

```typescript
if (!url.startsWith('http://') && !url.startsWith('https://')) {
  throw new Error('Invalid callback URL');
}
```

### 4. Use Custom Headers for Tracking

Add request IDs and other tracking headers:

```typescript
await client.publish(url, payload, {
  headers: {
    'X-Request-ID': crypto.randomUUID(),
    'X-User-ID': userId.toString()
  }
});
```

### 5. Monitor Dead Letter Queue

Regularly check for messages in the dead-letter queue:

```typescript
const dlq = await client.getDeadLetterErrors();
if (dlq.summary.totalMessages > 0) {
  console.warn(`${dlq.summary.totalMessages} messages in DLQ`);
  // Alert or take corrective action
}
```

### 6. Check Health Before Operations

Verify API health before critical operations:

```typescript
const health = await client.getHealth();
if (health.status !== 'healthy') {
  console.warn('API degraded, consider delaying operations');
}
```

### 7. Implement Exponential Backoff

For retries, use exponential backoff:

```typescript
const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s...
await new Promise(resolve => setTimeout(resolve, delay));
```

### 8. Use Appropriate Delay Formats

Choose the right delay format for your use case:

```typescript
// Relative delay for flexible timing
await client.publish(url, payload, { delay: '5m' });

// Absolute time for precise scheduling
await client.publish(url, payload, { notBefore: '2024-10-28T14:30:00Z' });
```

### 9. Validate Payloads

Ensure payloads are JSON-serializable:

```typescript
try {
  JSON.stringify(payload); // Validate
  await client.publish(url, payload);
} catch (error) {
  console.error('Payload is not JSON-serializable');
}
```

### 10. Log Message IDs

Always log message IDs for tracking:

```typescript
const response = await client.publish(url, payload);
console.log(`Published message: ${response.id}`);
// Store this ID for later reference
```

---

## Support

For issues, questions, or contributions, visit the [GitHub repository](https://github.com/dnl-fm/inline-sdk).

## License

MIT - See LICENSE file for details
