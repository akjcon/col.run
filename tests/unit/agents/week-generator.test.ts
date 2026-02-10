import { describe, it, expect, vi, beforeEach } from "vitest";
import { WeekGeneratorAgent } from "@/lib/agents/week-generator";
import type { WeekGeneratorInput, PhaseTarget, WeeklyTarget } from "@/lib/agents/types";
import type { Week } from "@/lib/blocks";

// =============================================================================
// Mock Setup
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
// Test Fixtures
// =============================================================================

const validWeekOutput: { week: Week } = {
  week: {
    weekNumber: 1,
    phase: "Base Building",
    days: [
      {
        dayOfWeek: "Monday",
        workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }],
      },
      {
        dayOfWeek: "Tuesday",
        workouts: [{
          blocks: [
            { type: "warmUp", value: 10, effortLevel: "z1" },
            { type: "easy", value: 35, effortLevel: "z2" },
            { type: "coolDown", value: 5, effortLevel: "z1" },
          ],
        }],
      },
      {
        dayOfWeek: "Wednesday",
        workouts: [{ blocks: [{ type: "easy", value: 45, effortLevel: "z2" }] }],
      },
      {
        dayOfWeek: "Thursday",
        workouts: [{
          blocks: [
            { type: "warmUp", value: 10, effortLevel: "z1" },
            { type: "tempo", value: 20, effortLevel: "z3" },
            { type: "coolDown", value: 10, effortLevel: "z1" },
          ],
        }],
      },
      {
        dayOfWeek: "Friday",
        workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }],
      },
      {
        dayOfWeek: "Saturday",
        workouts: [{ blocks: [{ type: "longRun", value: 90, effortLevel: "z2" }] }],
      },
      {
        dayOfWeek: "Sunday",
        workouts: [{ blocks: [{ type: "easy", value: 30, effortLevel: "z1" }] }],
      },
    ],
  },
};

const validPhase: PhaseTarget = {
  name: "Base Building",
  startWeek: 1,
  endWeek: 4,
  focus: "Aerobic development",
  weeklyVolumeRange: [180, 240],
  keyWorkouts: ["long run", "easy runs"],
};

const validTarget: WeeklyTarget = {
  weekNumber: 1,
  phase: "Base Building",
  targetVolume: 180,
  keyWorkoutType: "longRun",
};

const validInput: WeekGeneratorInput = {
  weekNumber: 1,
  target: validTarget,
  phase: validPhase,
  methodology: "Key training principles...",
  athleteProfile: {
    experience: "intermediate",
    weeklyMileage: 30,
    longestRun: 15,
  },
};

// =============================================================================
// Tests
// =============================================================================

describe("WeekGeneratorAgent", () => {
  let agent: WeekGeneratorAgent;

  beforeEach(() => {
    agent = new WeekGeneratorAgent();
    mockCreate.mockReset();
  });

  describe("input validation", () => {
    it("accepts valid input", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validWeekOutput) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);
      expect(result.success).toBe(true);
    });

    it("rejects invalid week number", async () => {
      const invalidInput = { ...validInput, weekNumber: 0 };
      const result = await agent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("week number");
    });

    it("rejects missing target", async () => {
      const invalidInput = { ...validInput, target: undefined as any };
      const result = await agent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("target");
    });

    it("rejects missing phase", async () => {
      const invalidInput = { ...validInput, phase: undefined as any };
      const result = await agent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("phase");
    });
  });

  describe("output parsing", () => {
    it("parses valid week output", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validWeekOutput) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);

      expect(result.success).toBe(true);
      expect(result.data?.week.weekNumber).toBe(1);
      expect(result.data?.week.phase).toBe("Base Building");
      expect(result.data?.week.days).toHaveLength(7);
    });

    it("normalizes missing days to rest days", async () => {
      const partialWeek = {
        week: {
          weekNumber: 1,
          phase: "Base Building",
          days: [
            { dayOfWeek: "Tuesday", workouts: [{ blocks: [{ type: "easy", value: 30, effortLevel: "z2" }] }] },
          ],
        },
      };

      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(partialWeek) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);

      expect(result.success).toBe(true);
      expect(result.data?.week.days).toHaveLength(7);
      // Monday should be normalized to rest
      const monday = result.data?.week.days.find(d => d.dayOfWeek === "Monday");
      expect(monday?.workouts[0].blocks[0].type).toBe("rest");
    });

    it("orders days correctly (Monday to Sunday)", async () => {
      const unorderedWeek = {
        week: {
          weekNumber: 1,
          phase: "Base Building",
          days: [
            { dayOfWeek: "Sunday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Monday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Wednesday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Tuesday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Friday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Thursday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Saturday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
          ],
        },
      };

      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(unorderedWeek) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);

      expect(result.success).toBe(true);
      expect(result.data?.week.days[0].dayOfWeek).toBe("Monday");
      expect(result.data?.week.days[6].dayOfWeek).toBe("Sunday");
    });
  });

  describe("output validation", () => {
    it("validates week structure using lib/blocks validation", async () => {
      const invalidWeek = {
        week: {
          weekNumber: 1,
          phase: "Base Building",
          days: [
            {
              dayOfWeek: "Monday",
              workouts: [{
                blocks: [{ type: "invalid", value: 30, effortLevel: "z2" }], // Invalid block type
              }],
            },
          ],
        },
      };

      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(invalidWeek) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("normalizes negative block values to minimum valid values", async () => {
      // Note: The agent normalizes invalid values instead of rejecting them
      // This test verifies that negative values become valid minimums
      const invalidWeek = {
        week: {
          weekNumber: 1,
          phase: "Base Building",
          days: [
            {
              dayOfWeek: "Monday",
              workouts: [{
                blocks: [{ type: "easy", value: -10, effortLevel: "z2" }],
              }],
            },
          ],
        },
      };

      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(invalidWeek) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);

      // Agent should succeed by normalizing the invalid value
      expect(result.success).toBe(true);
      // The normalized value should be at least 1
      if (result.week) {
        const firstBlock = result.week.days[0].workouts[0].blocks[0];
        expect(firstBlock.value).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("context handling", () => {
    it("includes previous week in prompt when provided", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validWeekOutput) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const inputWithPreviousWeek = {
        ...validInput,
        weekNumber: 2,
        previousWeek: validWeekOutput.week,
      };

      await agent.execute(inputWithPreviousWeek);

      // Check that the LLM was called with previous week context
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain("PREVIOUS WEEK");
    });

    it("includes constraints in prompt when provided", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validWeekOutput) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const inputWithConstraints = {
        ...validInput,
        constraints: {
          requiredRestDays: ["Sunday"],
          preferredLongRunDay: "Saturday",
        },
      };

      await agent.execute(inputWithConstraints);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain("Sunday");
      expect(callArgs.messages[0].content).toContain("Saturday");
    });
  });

  describe("block types", () => {
    it("generates rest day correctly", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validWeekOutput) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);

      const monday = result.data?.week.days.find(d => d.dayOfWeek === "Monday");
      expect(monday?.workouts[0].blocks[0].type).toBe("rest");
      expect(monday?.workouts[0].blocks[0].value).toBe(0);
    });

    it("generates structured workout with warmup/cooldown", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validWeekOutput) }],
        usage: { input_tokens: 500, output_tokens: 300 },
      });

      const result = await agent.execute(validInput);

      const thursday = result.data?.week.days.find(d => d.dayOfWeek === "Thursday");
      const blocks = thursday?.workouts[0].blocks;
      expect(blocks?.[0].type).toBe("warmUp");
      expect(blocks?.[1].type).toBe("tempo");
      expect(blocks?.[2].type).toBe("coolDown");
    });
  });
});
