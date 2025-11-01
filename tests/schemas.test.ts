import { describe, it, expect } from "bun:test";
import {
  ErrorCodeSchema,
  EventTypeSchema,
  CallbackErrorSchema,
  MessageResponseSchema,
  HealthStatusSchema,
  RetryMessageResponseSchema,
  TimelineEventSchema,
  TimelineResponseSchema,
} from "../src/schemas";

describe("ErrorCodeSchema", () => {
  it("should validate all valid error codes", () => {
    const validCodes = [
      "HTTP_4XX",
      "HTTP_5XX",
      "TIMEOUT",
      "ECONNREFUSED",
      "ECONNRESET",
      "ENOTFOUND",
      "DNS_FAILURE",
      "NETWORK_ERROR",
      "UNKNOWN",
    ];

    for (const code of validCodes) {
      const result = ErrorCodeSchema.safeParse(code);
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid error codes", () => {
    const result = ErrorCodeSchema.safeParse("INVALID_CODE");
    expect(result.success).toBe(false);
  });
});

describe("EventTypeSchema", () => {
  it("should validate all valid event types", () => {
    const validTypes = [
      "MESSAGE_RECEIVED",
      "PROCESSING_STARTED",
      "PROCESSING_COMPLETED",
      "PROCESSING_FAILED",
      "CALLBACK_INITIATED",
      "CALLBACK_SUCCEEDED",
      "CALLBACK_FAILED",
      "CALLBACK_RETRYING",
      "MANUAL_RETRY_TRIGGERED",
    ];

    for (const type of validTypes) {
      const result = EventTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid event types", () => {
    const result = EventTypeSchema.safeParse("CREATED");
    expect(result.success).toBe(false);
  });

  it("should have exactly 9 event types", () => {
    expect(EventTypeSchema.options.length).toBe(9);
  });
});

describe("CallbackErrorSchema", () => {
  it("should validate a complete callback error", () => {
    const error = {
      id: "err_123",
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      error_code: "HTTP_5XX",
      error_message: "Internal server error",
      http_status_code: 500,
      created_at: "2025-10-23T10:30:00.000Z",
      attempt_number: 2,
      duration_ms: 5000,
    };

    const result = CallbackErrorSchema.safeParse(error);
    expect(result.success).toBe(true);
  });

  it("should validate callback error with minimal fields", () => {
    const error = {
      id: "err_123",
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      error_code: "TIMEOUT",
      error_message: "Request timed out",
      created_at: "2025-10-23T10:30:00.000Z",
    };

    const result = CallbackErrorSchema.safeParse(error);
    expect(result.success).toBe(true);
  });

  it("should reject callback error with invalid messageId", () => {
    const error = {
      id: "err_123",
      messageId: "invalid-id",
      errorCode: "TIMEOUT",
      errorMessage: "Request timed out",
      createdAt: "2025-10-23T10:30:00.000Z",
    };

    const result = CallbackErrorSchema.safeParse(error);
    expect(result.success).toBe(false);
  });

  it("should reject callback error with invalid ISO timestamp", () => {
    const error = {
      id: "err_123",
      messageId: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      errorCode: "TIMEOUT",
      errorMessage: "Request timed out",
      createdAt: "2025-10-23", // Not ISO datetime
    };

    const result = CallbackErrorSchema.safeParse(error);
    expect(result.success).toBe(false);
  });
});

describe("MessageResponseSchema", () => {
  it("should validate a complete message response", () => {
    const message = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callback_url: "https://example.com/webhook",
      payload: { event: "test", data: 123 },
      callback_headers: { "X-API-Key": "secret" },
      status: "completed",
      created_at: "2025-10-23T10:30:00.000Z",
      updated_at: "2025-10-23T10:35:00.000Z",
      retry_count: 2,
      max_retries: 5,
    };

    const result = MessageResponseSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  it("should validate message response with optional fields", () => {
    const message = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callback_url: "https://example.com/webhook",
      payload: {},
      callback_headers: {},
      status: "pending",
      created_at: "2025-10-23T10:30:00.000Z",
      updated_at: "2025-10-23T10:30:00.000Z",
      scheduled_at: "2025-10-23T11:00:00.000Z",
      retry_count: 0,
      max_retries: 3,
      next_retry_at: "2025-10-23T10:35:00.000Z",
      last_error: {
        id: "err_123",
        message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
        error_code: "TIMEOUT",
        error_message: "Timeout",
        created_at: "2025-10-23T10:30:00.000Z",
      },
      timezone: "UTC",
      attempt_number: 1,
    };

    const result = MessageResponseSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  it("should reject message response with invalid messageId", () => {
    const message = {
      id: "bad-id",
      callback_url: "https://example.com/webhook",
      payload: {},
      callback_headers: {},
      status: "completed",
      created_at: "2025-10-23T10:30:00.000Z",
      updated_at: "2025-10-23T10:35:00.000Z",
      retry_count: 0,
      max_retries: 5,
    };

    const result = MessageResponseSchema.safeParse(message);
    expect(result.success).toBe(false);
  });

  it("should reject message response with invalid timestamps", () => {
    const message = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callback_url: "https://example.com/webhook",
      payload: {},
      callback_headers: {},
      status: "completed",
      created_at: 1698056400000, // Unix ms, not ISO string
      updated_at: "2025-10-23T10:35:00.000Z",
      retry_count: 0,
      max_retries: 5,
    };

    const result = MessageResponseSchema.safeParse(message);
    expect(result.success).toBe(false);
  });
});

describe("HealthStatusSchema", () => {
  it("should validate a complete health status", () => {
    const health = {
      status: "healthy",
      timestamp: "2025-10-23T10:30:00.000Z",
      uptime: 3600000,
      components: {
        database: "healthy",
        queue: "healthy",
      },
    };

    const result = HealthStatusSchema.safeParse(health);
    expect(result.success).toBe(true);
  });

  it("should validate health status without components", () => {
    const health = {
      status: "healthy",
      timestamp: "2025-10-23T10:30:00.000Z",
      uptime: 3600000,
    };

    const result = HealthStatusSchema.safeParse(health);
    expect(result.success).toBe(true);
  });

  it("should reject health status with invalid timestamp", () => {
    const health = {
      status: "healthy",
      timestamp: "not-a-timestamp",
      uptime: 3600000,
    };

    const result = HealthStatusSchema.safeParse(health);
    expect(result.success).toBe(false);
  });
});

describe("RetryMessageResponseSchema", () => {
  it("should validate a valid retry response", () => {
    const retry = {
      success: true,
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      message: "Message queued for retry",
    };

    const result = RetryMessageResponseSchema.safeParse(retry);
    expect(result.success).toBe(true);
  });

  it("should reject retry response with invalid messageId", () => {
    const retry = {
      success: true,
      message_id: "invalid",
      message: "Message queued for retry",
    };

    const result = RetryMessageResponseSchema.safeParse(retry);
    expect(result.success).toBe(false);
  });
});

describe("TimelineEventSchema", () => {
  it("should validate a timeline event with details", () => {
    const event = {
      type: "CALLBACK_INITIATED",
      timestamp: "2025-10-23T10:30:00.000Z",
      details: { url: "https://example.com", method: "POST" },
    };

    const result = TimelineEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should validate a timeline event without details", () => {
    const event = {
      type: "MESSAGE_RECEIVED",
      timestamp: "2025-10-23T10:30:00.000Z",
    };

    const result = TimelineEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("should reject event with invalid event type", () => {
    const event = {
      type: "INVALID_TYPE",
      timestamp: "2025-10-23T10:30:00.000Z",
    };

    const result = TimelineEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("TimelineResponseSchema", () => {
  it("should validate a complete timeline response", () => {
    const timeline = {
      message_id: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      event_count: 3,
      events: [
        {
          type: "MESSAGE_RECEIVED",
          timestamp: "2025-10-23T10:30:00.000Z",
        },
        {
          type: "CALLBACK_INITIATED",
          timestamp: "2025-10-23T10:30:05.000Z",
          details: { url: "https://example.com" },
        },
        {
          type: "CALLBACK_SUCCEEDED",
          timestamp: "2025-10-23T10:30:10.000Z",
          details: { statusCode: 200 },
        },
      ],
    };

    const result = TimelineResponseSchema.safeParse(timeline);
    expect(result.success).toBe(true);
  });

  it("should validate timeline with empty events", () => {
    const timeline = {
      message_id: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      event_count: 0,
      events: [],
    };

    const result = TimelineResponseSchema.safeParse(timeline);
    expect(result.success).toBe(true);
  });

  it("should reject timeline with missing events field", () => {
    const timeline = {};

    const result = TimelineResponseSchema.safeParse(timeline);
    expect(result.success).toBe(false);
  });
});

describe("MessageId format validation", () => {
  it("should accept valid ULID-based message IDs", () => {
    const validIds = [
      "message_000004QYYDCF9PHB9C6VWVHZEZ",
      "message_100009QYYDCF9PHB9C6VWVHZEZ",
      "message_700009QYYDCF9PHB9C6VWVHZEZ",
      "message_000001234567890ABCDEFGHJKM",
    ];

    for (const id of validIds) {
      const result = MessageResponseSchema.safeParse({
        id,
        callback_url: "https://example.com",
        payload: {},
        callback_headers: {},
        status: "pending",
        created_at: "2025-10-23T10:30:00.000Z",
        updated_at: "2025-10-23T10:30:00.000Z",
        retry_count: 0,
        max_retries: 3,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid message ID formats", () => {
    const invalidIds = [
      "message_", // Missing ULID
      "msg_000004QYYDCF9PHB9C6VWVHZEZ", // Wrong prefix
      "message_800004QYYDCF9PHB9C6VWVHZEZ", // Invalid first char (8)
      "message_000004QYYDCF9PHB9C6VWVHZ", // Too short
      "message_000004QYYDCF9PHB9C6VWVHZEZz", // Too long
    ];

    for (const id of invalidIds) {
      const result = MessageResponseSchema.safeParse({
        id,
        callback_url: "https://example.com",
        payload: {},
        callback_headers: {},
        status: "pending",
        created_at: "2025-10-23T10:30:00.000Z",
        updated_at: "2025-10-23T10:30:00.000Z",
        retry_count: 0,
        max_retries: 3,
      });
      expect(result.success).toBe(false);
    }
  });
});

describe("ISO Timestamp validation", () => {
  it("should accept valid ISO 8601 timestamps", () => {
    const validTimestamps = [
      "2025-10-23T10:30:00.000Z",
      "2025-10-23T10:30:00Z",
      "2025-10-23T10:30:00.123Z",
      "2025-10-23T15:30:00Z",
    ];

    for (const ts of validTimestamps) {
      const result = HealthStatusSchema.safeParse({
        status: "healthy",
        timestamp: ts,
        uptime: 1000,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid timestamp formats", () => {
    const invalidTimestamps = [
      "1698056400000", // Unix milliseconds
      "2025-10-23", // Date only
      "10/23/2025", // US format
      "2025-10-23 10:30:00", // Missing T
      "not-a-timestamp",
    ];

    for (const ts of invalidTimestamps) {
      const result = HealthStatusSchema.safeParse({
        status: "healthy",
        timestamp: ts,
        uptime: 1000,
      });
      expect(result.success).toBe(false);
    }
  });
});
