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
      callback_url: "https://example.com/webhook",
      payload: { event: "test" },
      callback_headers: { "X-API-Key": "secret" },
      status: "pending",
      created_at: "2025-10-23T10:30:00.000Z",
      updated_at: "2025-10-23T10:30:00.000Z",
      retry_count: 0,
      max_retries: 3,
    };

    expect(() => validateMessageResponse(response)).not.toThrow();
  });

  it("should validate response with optional fields", () => {
    const response = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callback_url: "https://example.com/webhook",
      payload: {},
      callback_headers: {},
      status: "completed",
      created_at: "2025-10-23T10:30:00.000Z",
      updated_at: "2025-10-23T10:35:00.000Z",
      scheduled_at: "2025-10-23T11:00:00.000Z",
      retry_count: 2,
      max_retries: 5,
      next_retry_at: "2025-10-23T10:35:00.000Z",
      last_error: {
        id: "err_123",
        message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
        error_code: "TIMEOUT",
        error_message: "Request timed out",
        created_at: "2025-10-23T10:30:00.000Z",
      },
      timezone: "UTC",
      attempt_number: 3,
    };

    const result = validateMessageResponse(response);
    expect(result.attempt_number).toBe(3);
    expect(result.last_error?.error_code).toBe("TIMEOUT");
  });

  it("should throw on missing required fields", () => {
    const incomplete = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callback_url: "https://example.com/webhook",
      // Missing payload, callback_headers, status, etc.
    };

    expect(() => validateMessageResponse(incomplete)).toThrow();
  });

  it("should throw on invalid message ID", () => {
    const invalid = {
      id: "invalid-id",
      callback_url: "https://example.com/webhook",
      payload: {},
      callback_headers: {},
      status: "pending",
      created_at: "2025-10-23T10:30:00.000Z",
      updated_at: "2025-10-23T10:30:00.000Z",
      retry_count: 0,
      max_retries: 3,
    };

    expect(() => validateMessageResponse(invalid)).toThrow();
  });

  it("should throw on invalid timestamps", () => {
    const invalidTs = {
      id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      callback_url: "https://example.com/webhook",
      payload: {},
      callback_headers: {},
      status: "pending",
      created_at: "not-a-timestamp",
      updated_at: "2025-10-23T10:30:00.000Z",
      retry_count: 0,
      max_retries: 3,
    };

    expect(() => validateMessageResponse(invalidTs)).toThrow();
  });
});

describe("validateTimelineResponse", () => {
  it("should validate a complete timeline", () => {
    const timeline = {
      message_id: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      event_count: 3,
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
      message_id: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      event_count: 0,
      events: [],
    };
    expect(() => validateTimelineResponse(timeline)).not.toThrow();
  });

  it("should throw on missing events field", () => {
    const invalid = {
      message_id: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      event_count: 0,
      data: [],
    };
    expect(() => validateTimelineResponse(invalid)).toThrow();
  });

  it("should throw on invalid event type", () => {
    const invalid = {
      message_id: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      event_count: 1,
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
      message_id: "message_01K88AMDZT4G9SBP1AQ51V5HSP",
      event_count: 1,
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
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      error_code: "HTTP_5XX",
      error_message: "Internal server error",
      http_status_code: 500,
      created_at: "2025-10-23T10:30:00.000Z",
      attempt_number: 2,
      duration_ms: 5000,
    };

    expect(() => validateCallbackError(error)).not.toThrow();
  });

  it("should validate error with minimal fields", () => {
    const error = {
      id: "err_123",
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      error_code: "TIMEOUT",
      error_message: "Request timed out",
      created_at: "2025-10-23T10:30:00.000Z",
    };

    expect(() => validateCallbackError(error)).not.toThrow();
  });

  it("should throw on missing required fields", () => {
    const incomplete = {
      id: "err_123",
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      // Missing error_code, error_message, created_at
    };

    expect(() => validateCallbackError(incomplete)).toThrow();
  });

  it("should throw on invalid errorCode", () => {
    const invalid = {
      id: "err_123",
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      error_code: "INVALID_CODE",
      error_message: "Error",
      created_at: "2025-10-23T10:30:00.000Z",
    };

    expect(() => validateCallbackError(invalid)).toThrow();
  });

  it("should throw on invalid timestamp", () => {
    const invalid = {
      id: "err_123",
      message_id: "message_000004QYYDCF9PHB9C6VWVHZEZ",
      error_code: "TIMEOUT",
      error_message: "Error",
      created_at: "invalid-timestamp",
    };

    expect(() => validateCallbackError(invalid)).toThrow();
  });
});
