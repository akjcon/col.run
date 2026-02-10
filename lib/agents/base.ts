/**
 * Base Agent Class
 *
 * Provides common functionality for all agents:
 * - Input/output validation
 * - Execution tracing
 * - Error handling
 * - LLM interaction
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AgentResult, AgentTrace } from "./types";

// =============================================================================
// Agent Configuration
// =============================================================================

export interface AgentConfig {
  name: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_CONFIG = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 8000,
  temperature: 0.3,
};

// =============================================================================
// Base Agent
// =============================================================================

export abstract class BaseAgent<TInput, TOutput> {
  protected client: Anthropic;
  protected config: Required<AgentConfig>;

  constructor(config: AgentConfig, client?: Anthropic) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.client = client ?? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Build the system prompt for this agent
   */
  protected abstract buildSystemPrompt(input: TInput): string;

  /**
   * Build the user message for this agent
   */
  protected abstract buildUserMessage(input: TInput): string;

  /**
   * Parse the LLM response into structured output
   */
  protected abstract parseResponse(response: string): TOutput;

  /**
   * Validate input before processing
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected validateInput(_input: TInput): { valid: boolean; error?: string } {
    // Default: accept all input
    // Override in subclasses for specific validation
    return { valid: true };
  }

  /**
   * Validate output before returning
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected validateOutput(_output: TOutput): { valid: boolean; error?: string } {
    // Default: accept all output
    // Override in subclasses for specific validation
    return { valid: true };
  }

  /**
   * Execute the agent
   */
  async execute(input: TInput): Promise<AgentResult<TOutput>> {
    const trace: AgentTrace = {
      agentName: this.config.name,
      startTime: Date.now(),
    };

    try {
      // Validate input
      const inputValidation = this.validateInput(input);
      if (!inputValidation.valid) {
        throw new Error(`Input validation failed: ${inputValidation.error}`);
      }

      // Build prompts
      const systemPrompt = this.buildSystemPrompt(input);
      const userMessage = this.buildUserMessage(input);

      // Call LLM
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      // Extract response text
      const responseText = response.content[0]?.type === "text"
        ? response.content[0].text
        : "";

      // Record token usage
      trace.inputTokens = response.usage?.input_tokens;
      trace.outputTokens = response.usage?.output_tokens;

      // Parse response
      const output = this.parseResponse(responseText);

      // Validate output
      const outputValidation = this.validateOutput(output);
      if (!outputValidation.valid) {
        throw new Error(`Output validation failed: ${outputValidation.error}`);
      }

      // Complete trace
      trace.endTime = Date.now();
      trace.durationMs = trace.endTime - trace.startTime;

      return {
        success: true,
        data: output,
        trace,
      };
    } catch (error) {
      trace.endTime = Date.now();
      trace.durationMs = trace.endTime - trace.startTime;
      trace.error = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: trace.error,
        trace,
      };
    }
  }
}

// =============================================================================
// JSON Parsing Utilities
// =============================================================================

/**
 * Extract JSON from a response that may contain markdown or other text
 */
export function extractJSON<T>(text: string): T {
  // Try to find JSON object or array
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Try to fix common JSON issues
    let fixed = jsonMatch[0];

    // Remove trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Balance braces/brackets
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += "}";
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixed += "]";
    }

    return JSON.parse(fixed);
  }
}
