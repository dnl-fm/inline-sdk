import type {
  MessageResponse,
  CreateMessageResponse,
  TimelineResponse,
  DebugStatsResponse,
  HealthStatus,
  ErrorStatsResponse,
  DeadLetterResponse,
} from "../src/types";

// Test constants
export const TEST_BASE_URL = "http://localhost:3000";
export const TEST_API_KEY = "test-api-key-12345";

// Mock Fetch class to track calls and return mocked responses
export class MockFetch {
  private calls: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }> = [];

  private responses: Map<string, any> = new Map();
  private statusCodes: Map<string, number> = new Map();
  private responseHeaders: Map<string, Record<string, string>> = new Map();

  constructor() {
    // Mock the global fetch
    globalThis.fetch = this.fetch.bind(this) as any;
  }

  private async fetch(url: string, options?: RequestInit): Promise<Response> {
    const headers = (options?.headers || {}) as Record<string, string>;

    this.calls.push({
      url,
      method: options?.method || "GET",
      headers,
      body: options?.body ? String(options.body) : undefined,
    });

    const status = this.statusCodes.get(url) || 200;
    const responseBody = this.responses.get(url) || {};
    const responseHeaders = this.responseHeaders.get(url) || {
      "content-type": "application/json",
    };

    if (status === 408 || status === 0) {
      // Simulate timeout
      throw new TypeError("Failed to fetch");
    }

    return new Response(JSON.stringify(responseBody), {
      status,
      headers: responseHeaders,
    });
  }

  setResponse(url: string, body: any, status: number = 200): void {
    this.responses.set(url, body);
    this.statusCodes.set(url, status);
  }

  setResponseHeader(url: string, headers: Record<string, string>): void {
    this.responseHeaders.set(url, headers);
  }

  getCalls(): Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }> {
    return this.calls;
  }

  getCallCount(): number {
    return this.calls.length;
  }

  getLastCall(): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  } | null {
    return this.calls.length > 0 ? this.calls[this.calls.length - 1] : null;
  }

  reset(): void {
    this.calls = [];
    this.responses.clear();
    this.statusCodes.clear();
    this.responseHeaders.clear();
  }
}

// Fixture factories
export function createMockMessage(
  overrides?: Partial<MessageResponse>,
): MessageResponse {
  return {
    id: "msg-123",
    callbackUrl: "https://example.com/webhook",
    payload: { data: "test" },
    headers: { "Content-Type": "application/json" },
    status: "pending",
    createdAt: 1000,
    updatedAt: 1000,
    retryCount: 0,
    maxRetries: 5,
    ...overrides,
  };
}

export function createMockMessagePublic(
  overrides?: Partial<CreateMessageResponse>,
): CreateMessageResponse {
  return {
    id: "msg-456",
    status: "pending",
    createdAt: 2000,
    ...overrides,
  };
}

export function createMockError(): {
  id: string;
  message: string;
  code: string;
} {
  return {
    id: "err-123",
    message: "Test error",
    code: "UNKNOWN",
  };
}

export function createMockTimeline(
  overrides?: Partial<TimelineResponse>,
): TimelineResponse {
  return {
    events: [
      {
        type: "CREATED",
        timestamp: 1000,
      },
      {
        type: "ACTIVE",
        timestamp: 1100,
      },
    ],
    ...overrides,
  };
}

export function createMockStats(
  overrides?: Partial<DebugStatsResponse>,
): DebugStatsResponse {
  return {
    totalMessages: 100,
    messagesByStatus: {
      pending: 10,
      processing: 5,
      completed: 80,
      failed: 5,
      dead_letter: 0,
    },
    totalErrors: 10,
    errorsByCode: {
      HTTP_4XX: 3,
      HTTP_5XX: 4,
      TIMEOUT: 2,
      ECONNREFUSED: 1,
      ECONNRESET: 0,
      UNKNOWN: 0,
    },
    ...overrides,
  };
}

export function createMockHealth(
  overrides?: Partial<HealthStatus>,
): HealthStatus {
  return {
    status: "healthy",
    components: {
      database: "healthy",
      queue: "healthy",
    },
    timestamp: 1000,
    ...overrides,
  };
}

export function createMockErrorStats(
  overrides?: Partial<ErrorStatsResponse>,
): ErrorStatsResponse {
  return {
    stats: [
      {
        code: "HTTP_5XX",
        count: 5,
        lastOccurred: 1000,
      },
      {
        code: "TIMEOUT",
        count: 2,
        lastOccurred: 900,
      },
    ],
    ...overrides,
  };
}

export function createMockDeadLetter(
  overrides?: Partial<DeadLetterResponse>,
): DeadLetterResponse {
  return {
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
    count: 1,
    ...overrides,
  };
}

// Helper assertions
export function assertHeaderPresent(
  headers: Record<string, string>,
  name: string,
  expectedValue?: string,
): void {
  if (!(name in headers)) {
    throw new Error(`Header '${name}' not found in request`);
  }
  if (expectedValue && headers[name] !== expectedValue) {
    throw new Error(
      `Header '${name}' has value '${headers[name]}', expected '${expectedValue}'`,
    );
  }
}

export function assertAuthHeader(headers: Record<string, string>): void {
  assertHeaderPresent(headers, "Authorization");
  const authHeader = headers.Authorization;
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error(`Invalid Authorization header format: ${authHeader}`);
  }
}

export function assertContentTypeJson(headers: Record<string, string>): void {
  assertHeaderPresent(headers, "Content-Type", "application/json");
}

export function assertUrlPath(url: string, expectedPath: string): void {
  const urlObj = new URL(url);
  if (!urlObj.pathname.includes(expectedPath)) {
    throw new Error(
      `URL path '${urlObj.pathname}' does not include '${expectedPath}'`,
    );
  }
}

export function assertUrlQuery(
  url: string,
  paramName: string,
  expectedValue?: string,
): void {
  const urlObj = new URL(url);
  const value = urlObj.searchParams.get(paramName);
  if (value === null) {
    throw new Error(`Query parameter '${paramName}' not found in URL`);
  }
  if (expectedValue && value !== expectedValue) {
    throw new Error(
      `Query parameter '${paramName}' has value '${value}', expected '${expectedValue}'`,
    );
  }
}
