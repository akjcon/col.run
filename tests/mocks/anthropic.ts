import { vi } from "vitest";

// Mock response types
interface MockMessage {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{
    type: "text";
    text: string;
  }>;
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence";
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Default mock response
const defaultMockResponse: MockMessage = {
  id: "msg_test_123",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "This is a mock response from Claude.",
    },
  ],
  model: "claude-sonnet-4-20250514",
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: {
    input_tokens: 100,
    output_tokens: 50,
  },
};

// Store for mock responses by prompt pattern
const mockResponses: Map<string | RegExp, MockMessage | string> = new Map();

// Mock Anthropic client
export const mockAnthropicClient = {
  messages: {
    create: vi.fn().mockImplementation(async (params: any) => {
      // Check for pattern-matched responses
      for (const [pattern, response] of mockResponses) {
        const messageContent = params.messages
          ?.map((m: any) => m.content)
          .join(" ");
        const systemContent = params.system || "";
        const fullContent = `${systemContent} ${messageContent}`;

        const matches =
          pattern instanceof RegExp
            ? pattern.test(fullContent)
            : fullContent.includes(pattern);

        if (matches) {
          if (typeof response === "string") {
            return {
              ...defaultMockResponse,
              content: [{ type: "text", text: response }],
            };
          }
          return response;
        }
      }

      // Return default response
      return defaultMockResponse;
    }),
  },
};

// Helper to set mock response for a specific pattern
export function setMockResponse(
  pattern: string | RegExp,
  response: MockMessage | string
): void {
  mockResponses.set(pattern, response);
}

// Helper to clear all mock responses
export function clearMockResponses(): void {
  mockResponses.clear();
}

// Helper to set a JSON response (useful for plan generation)
export function setMockJsonResponse(
  pattern: string | RegExp,
  jsonData: any
): void {
  setMockResponse(pattern, JSON.stringify(jsonData, null, 2));
}

// Create the mock module
export const createAnthropicMock = () => {
  return {
    default: vi.fn().mockImplementation(() => mockAnthropicClient),
    Anthropic: vi.fn().mockImplementation(() => mockAnthropicClient),
  };
};

// Reset mock between tests
export function resetAnthropicMock(): void {
  clearMockResponses();
  mockAnthropicClient.messages.create.mockClear();
}
