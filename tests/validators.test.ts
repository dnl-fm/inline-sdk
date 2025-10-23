import { describe, it, expect } from "bun:test";
import {
  parseMessageId,
  validateTimestamp,
  validateMessageResponse,
  validateTimelineResponse,
  validateCallbackError,
} from "../src/validators";

describe("parseMessageId", () => {
  it("should parse valid message IDs", () => {
    const validId = "message_000004QYYDCF9PHB9C6VWVHZEZ";
    const result = parseMessageId(validId);
    expect(result).toBe(validId);
  });

  it("should throw on invalid message ID format", () => {
    const invalidIds = [
      "message_", // Missing ULID
      "msg_000004QYYDCF9PHB9C6VWVHZEZ", // Wrong prefix
      "message_800004QYYDCF9PHB9C6VWVHZEZ", // Invalid first char
      "message_000004qyydcf9phb9c6vwvhzez", // Lowercase not allowed
      "message_000004QYYDCF9PHB9C6VWVHZE", // Too short
    ];

    for (const id of invalidIds) {
      expect(() => parseMessageId(id)).toThrow();
    }
  });

  it("should accept all valid first characters (0-7)", () => {
    for (let i = 0; i <= 7; i++) {
      const id = `message_${i}00004QYYDCF9PHB9C6VWVHZEZ`;
      expect(() => parseMessageId(id)).not.toThrow();
    }
  });
});

describe("validateTimestamp", () => {
  it("should validate ISO 8601 timestamps", () => {
    const validTimestamps = [
      "2025-10-23T10:30:00.000Z",
      "2025-10-23T10:30:00Z",
      "2025-10-23T15:45:30.123Z",
    ];

    for (const ts of validTimestamps) {
      expect(() => validateTimestamp(ts)).not.toThrow();
    }
  });

  it("should reject non-ISO formats", () => {
    const invalidTimestamps = [
      "1698056400000", // Unix milliseconds
      "2025-10-23", // Date only
      "10/23/2025", // US format
      "2025-10-23 10:30:00", // Missing T
      "not-a-timestamp",
    ];

    for (const ts of invalidTimestamps) {
      expect(() => validateTimestamp(ts)).toThrow();
    }
  });
});

describe("validateMessageResponse", () => {
  it("should validate a complete message response", () => {
    const response = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callbackUrl: "https://example.com/webhook",
      payload: { event: "test" },
      callbackHeaders: { "X-API-Key": "secret" },
      status: "pending",
      createdAt: "2025-10-23T10:30:00.000Z",
      updatedAt: "2025-10-23T10:30:00.000Z",
      retryCount: 0,
      maxRetries: 3,
    };

    expect(() => validateMessageResponse(response)).not.toThrow();
  });

  it("should validate response with optional fields", () => {
    const response = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callbackUrl: "https://example.com/webhook",
      payload: {},
      callbackHeaders: {},
      status: "completed",
      createdAt: "2025-10-23T10:30:00.000Z",
      updatedAt: "2025-10-23T10:35:00.000Z",
      scheduledAt: "2025-10-23T11:00:00.000Z",
      retryCount: 2,
      maxRetries: 5,
      nextRetryAt: "2025-10-23T10:35:00.000Z",
      lastError: {
        id: "err_123",
        messageId: "message_000004QYYDCF9PHB9C6VWVHZEZ",
        errorCode: "TIMEOUT",
        errorMessage: "Request timed out",
        createdAt: "2025-10-23T10:30:00.000Z",
      },
      timezone: "UTC",
      attemptNumber: 3,
    };

    const result = validateMessageResponse(response);
    expect(result.attemptNumber).toBe(3);
    expect(result.lastError?.errorCode).toBe("TIMEOUT");
  });

  it("should throw on missing required fields", () => {
    const incomplete = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callbackUrl: "https://example.com/webhook",
      // Missing payload, callbackHeaders, status, etc.
    };

    expect(() => validateMessageResponse(incomplete)).toThrow();
  });

  it("should throw on invalid message ID", () => {
    const invalid = {
      id: "invalid-id",
      callbackUrl: "https://example.com/webhook",
      payload: {},
      callbackHeaders: {},
      status: "pending",
      createdAt: "2025-10-23T10:30:00.000Z",
      updatedAt: "2025-10-23T10:30:00.000Z",
      retryCount: 0,
      maxRetries: 3,
    };

    expect(() => validateMessageResponse(invalid)).toThrow();
  });

  it("should throw on invalid timestamps", () => {
    const invalidTs = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callbackUrl: "https://example.com/webhook",
      payload: {},
      callbackHeaders: {},
      status: "pending",
      createdAt: "not-a-timestamp",
      updatedAt: "2025-10-23T10:30:00.000Z",
      retryCount: 0,
      maxRetries: 3,
    };

    expect(() => validateMessageResponse(invalidTs)).toThrow();
  });
});

describe("validateTimelineResponse", () => {
  it("should validate a complete timeline", () => {
    const timeline = {
      messageId: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      eventCount: 3,
      events: [
        {
          type: "MESSAGE_RECEIVED",
          timestamp: "2025-10-23T10:30:00.000Z",
        },
        {
          type: "PROCESSING_STARTED",
          timestamp: "2025-10-23T10:30:01.000Z",
        },
        {
          type: "CALLBACK_INITIATED",
          timestamp: "2025-10-23T10:30:02.000Z",
          details: { url: "https://example.com", method: "POST" },
        },
      ],
    };

    expect(() => validateTimelineResponse(timeline)).not.toThrow();
  });

  it("should validate an empty timeline", () => {
    const timeline = {
      messageId: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      eventCount: 0,
      events: [],
    };
    expect(() => validateTimelineResponse(timeline)).not.toThrow();
  });

  it("should throw on missing events field", () => {
    const invalid = {
      messageId: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      eventCount: 0,
      data: [],
    };
    expect(() => validateTimelineResponse(invalid)).toThrow();
  });

  it("should throw on invalid event type", () => {
    const invalid = {
      messageId: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      eventCount: 1,
      events: [
        {
          type: "INVALID_TYPE",
          timestamp: "2025-10-23T10:30:00.000Z",
        },
      ],
    };

    expect(() => validateTimelineResponse(invalid)).toThrow();
  });

  it("should throw on invalid timestamp in event", () => {
    const invalid = {
      messageId: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      eventCount: 1,
      events: [
        {
          type: "MESSAGE_RECEIVED",
          timestamp: "not-a-timestamp",
        },
      ],
    };

    expect(() => validateTimelineResponse(invalid)).toThrow();
  });
});

describe("validateCallbackError", () => {
  it("should validate a complete callback error", () => {
    const error = {
      id: "err_123",
      messageId: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      errorCode: "HTTP_5XX",
      errorMessage: "Internal server error",
      httpStatusCode: 500,
      createdAt: "2025-10-23T10:30:00.000Z",
      attemptNumber: 2,
      durationMs: 5000,
    };

    expect(() => validateCallbackError(error)).not.toThrow();
  });

  it("should validate error with minimal fields", () => {
    const error = {
      id: "err_123",
      messageId: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      errorCode: "TIMEOUT",
      errorMessage: "Request timed out",
      createdAt: "2025-10-23T10:30:00.000Z",
    };

    expect(() => validateCallbackError(error)).not.toThrow();
  });

  it("should throw on missing required fields", () => {
    const incomplete = {
      id: "err_123",
      messageId: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      // Missing errorCode, errorMessage, createdAt
    };

    expect(() => validateCallbackError(incomplete)).toThrow();
  });

  it("should throw on invalid errorCode", () => {
    const invalid = {
      id: "err_123",
      messageId: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      errorCode: "INVALID_CODE",
      errorMessage: "Error",
      createdAt: "2025-10-23T10:30:00.000Z",
    };

    expect(() => validateCallbackError(invalid)).toThrow();
  });

  it("should throw on invalid timestamp", () => {
    const invalid = {
      id: "err_123",
      messageId: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      errorCode: "TIMEOUT",
      errorMessage: "Error",
      createdAt: "invalid-timestamp",
    };

    expect(() => validateCallbackError(invalid)).toThrow();
  });
});
