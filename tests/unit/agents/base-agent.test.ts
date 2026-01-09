import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseAgent, extractJSON } from "@/lib/agents/base";
import type { AgentResult, AgentTrace } from "@/lib/agents/types";

// =============================================================================
// Test Agent Implementation
// =============================================================================

interface TestInput {
  value: string;
}

interface TestOutput {
  result: string;
}

class TestAgent extends BaseAgent<TestInput, TestOutput> {
  public mockResponse: string = '{"result": "success"}';
  public shouldFailValidation: boolean = false;
  public outputValidationError: string | null = null;

  constructor() {
    super({ name: "TestAgent" });
  }

  protected buildSystemPrompt(input: TestInput): string {
    return `System prompt for ${input.value}`;
  }

  protected buildUserMessage(input: TestInput): string {
    return `User message: ${input.value}`;
  }

  protected parseResponse(response: string): TestOutput {
    return JSON.parse(response);
  }

  protected validateInput(input: TestInput): { valid: boolean; error?: string } {
    if (this.shouldFailValidation) {
      return { valid: false, error: "Validation failed" };
    }
    if (!input.value) {
      return { valid: false, error: "Missing value" };
    }
    return { valid: true };
  }

  protected validateOutput(output: TestOutput): { valid: boolean; error?: string } {
    if (this.outputValidationError) {
      return { valid: false, error: this.outputValidationError };
    }
    return { valid: true };
  }
}

// =============================================================================
// Mock Anthropic Client
// =============================================================================

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
      };
    },
  };
});

// =============================================================================
// Tests
// =============================================================================

describe("BaseAgent", () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent();
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"result": "success"}' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
  });

  describe("execute", () => {
    it("returns successful result with trace", async () => {
      const result = await agent.execute({ value: "test" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: "success" });
      expect(result.trace).toBeDefined();
      expect(result.trace.agentName).toBe("TestAgent");
      expect(result.trace.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("records token usage in trace", async () => {
      const result = await agent.execute({ value: "test" });

      expect(result.trace.inputTokens).toBe(100);
      expect(result.trace.outputTokens).toBe(50);
    });

    it("returns error result when input validation fails", async () => {
      agent.shouldFailValidation = true;
      const result = await agent.execute({ value: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
      expect(result.trace.error).toBeDefined();
    });

    it("returns error result when output validation fails", async () => {
      agent.outputValidationError = "Invalid output";
      const result = await agent.execute({ value: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid output");
    });

    it("handles LLM errors gracefully", async () => {
      mockCreate.mockRejectedValue(new Error("API Error"));
      const result = await agent.execute({ value: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("API Error");
      expect(result.trace.error).toBeDefined();
    });

    it("handles parse errors gracefully", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "not valid json" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await agent.execute({ value: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("tracing", () => {
    it("includes start and end times", async () => {
      const result = await agent.execute({ value: "test" });

      expect(result.trace.startTime).toBeDefined();
      expect(result.trace.endTime).toBeDefined();
      expect(result.trace.endTime).toBeGreaterThanOrEqual(result.trace.startTime);
    });

    it("calculates duration correctly", async () => {
      const result = await agent.execute({ value: "test" });

      expect(result.trace.durationMs).toBe(
        result.trace.endTime! - result.trace.startTime
      );
    });
  });
});

describe("extractJSON", () => {
  it("extracts JSON object from plain text", () => {
    const text = '{"key": "value"}';
    expect(extractJSON(text)).toEqual({ key: "value" });
  });

  it("extracts JSON from markdown code block", () => {
    const text = '```json\n{"key": "value"}\n```';
    expect(extractJSON(text)).toEqual({ key: "value" });
  });

  it("extracts JSON from text with surrounding content", () => {
    const text = 'Here is the result:\n{"key": "value"}\nEnd of result.';
    expect(extractJSON(text)).toEqual({ key: "value" });
  });

  it("extracts JSON array", () => {
    const text = '[{"a": 1}, {"b": 2}]';
    expect(extractJSON(text)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("fixes trailing commas", () => {
    const text = '{"key": "value",}';
    expect(extractJSON(text)).toEqual({ key: "value" });
  });

  it("throws when no JSON found", () => {
    const text = "no json here";
    expect(() => extractJSON(text)).toThrow("No JSON found");
  });

  it("handles nested objects", () => {
    const text = '{"outer": {"inner": "value"}}';
    expect(extractJSON(text)).toEqual({ outer: { inner: "value" } });
  });
});
