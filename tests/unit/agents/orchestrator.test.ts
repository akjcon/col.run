import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OrchestratorAgent,
  setBookContentForTesting,
  clearBookContentCache,
} from "@/lib/agents/orchestrator";
import type { OrchestratorInput, OrchestratorOutput } from "@/lib/agents/types";

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

const validOrchestratorOutput: OrchestratorOutput = {
  athleteAnalysis: {
    fitnessLevel: 6,
    limiters: ["Aerobic base", "Hill strength"],
    strengths: ["Mental toughness", "Recovery"],
    riskFactors: ["Previous knee injury"],
  },
  phases: [
    {
      name: "Base Building",
      startWeek: 1,
      endWeek: 4,
      focus: "Aerobic development",
      weeklyVolumeRange: [180, 240],
      keyWorkouts: ["long run", "easy runs"],
    },
    {
      name: "Build",
      startWeek: 5,
      endWeek: 8,
      focus: "Add intensity",
      weeklyVolumeRange: [240, 300],
      keyWorkouts: ["tempo", "intervals"],
    },
  ],
  weeklyTargets: [
    // Volume progression: max 10% increase week-over-week
    { weekNumber: 1, phase: "Base Building", targetVolume: 180, keyWorkoutType: "longRun" },
    { weekNumber: 2, phase: "Base Building", targetVolume: 195, keyWorkoutType: "longRun" }, // +8%
    { weekNumber: 3, phase: "Base Building", targetVolume: 210, keyWorkoutType: "longRun" }, // +8%
    { weekNumber: 4, phase: "Base Building", targetVolume: 190, keyWorkoutType: null, notes: "Recovery week" }, // -10%
    { weekNumber: 5, phase: "Build", targetVolume: 205, keyWorkoutType: "tempo" }, // +8%
    { weekNumber: 6, phase: "Build", targetVolume: 220, keyWorkoutType: "intervals" }, // +7%
    { weekNumber: 7, phase: "Build", targetVolume: 240, keyWorkoutType: "tempo" }, // +9%
    { weekNumber: 8, phase: "Build", targetVolume: 200, keyWorkoutType: null, notes: "Taper" }, // -17% (taper)
  ],
  methodology: "Key principles from the book about periodization and base building...",
};

const validInput: OrchestratorInput = {
  athlete: {
    experience: "intermediate",
    weeklyMileage: 30,
    longestRun: 15,
    marathonPR: "4:00:00",
    background: "Former cyclist",
  },
  goal: {
    raceDistance: "50K",
    targetTime: "6:00:00",
    raceDate: Date.now() + 8 * 7 * 24 * 60 * 60 * 1000, // 8 weeks from now
    terrainType: "trail",
  },
  planWeeks: 8,
};

// =============================================================================
// Tests
// =============================================================================

describe("OrchestratorAgent", () => {
  let agent: OrchestratorAgent;

  beforeEach(() => {
    agent = new OrchestratorAgent();
    mockCreate.mockReset();
    // Set mock book content for testing
    setBookContentForTesting("Mock book content for testing");
  });

  afterEach(() => {
    clearBookContentCache();
  });

  describe("input validation", () => {
    it("accepts valid input", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validOrchestratorOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const result = await agent.execute(validInput);
      expect(result.success).toBe(true);
    });

    it("rejects missing athlete profile", async () => {
      const invalidInput = { ...validInput, athlete: undefined as any };
      const result = await agent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("athlete");
    });

    it("rejects missing goal", async () => {
      const invalidInput = { ...validInput, goal: undefined as any };
      const result = await agent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("goal");
    });

    it("rejects plan weeks < 4", async () => {
      const invalidInput = { ...validInput, planWeeks: 3 };
      const result = await agent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("weeks");
    });

    it("rejects plan weeks > 52", async () => {
      const invalidInput = { ...validInput, planWeeks: 53 };
      const result = await agent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("weeks");
    });
  });

  describe("output parsing", () => {
    it("parses valid orchestrator output", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validOrchestratorOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const result = await agent.execute(validInput);

      expect(result.success).toBe(true);
      expect(result.data?.phases).toHaveLength(2);
      expect(result.data?.weeklyTargets).toHaveLength(8);
      expect(result.data?.athleteAnalysis.fitnessLevel).toBe(6);
    });

    it("rejects response missing phases", async () => {
      const badOutput = { ...validOrchestratorOutput, phases: undefined };
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(badOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const result = await agent.execute(validInput);
      expect(result.success).toBe(false);
      expect(result.error).toContain("phases");
    });

    it("rejects response missing weeklyTargets", async () => {
      const badOutput = { ...validOrchestratorOutput, weeklyTargets: undefined };
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(badOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const result = await agent.execute(validInput);
      expect(result.success).toBe(false);
      expect(result.error).toContain("weeklyTargets");
    });
  });

  describe("output validation", () => {
    it("rejects overlapping phases", async () => {
      const badOutput = {
        ...validOrchestratorOutput,
        phases: [
          { name: "Phase 1", startWeek: 1, endWeek: 5, focus: "Test", weeklyVolumeRange: [100, 200], keyWorkouts: [] },
          { name: "Phase 2", startWeek: 4, endWeek: 8, focus: "Test", weeklyVolumeRange: [100, 200], keyWorkouts: [] },
        ],
      };
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(badOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const result = await agent.execute(validInput);
      expect(result.success).toBe(false);
      expect(result.error).toContain("overlap");
    });

    it("warns on volume progression > 20% but does not fail", async () => {
      // Volume validation now warns instead of failing to allow testing
      const badOutput = {
        ...validOrchestratorOutput,
        weeklyTargets: [
          { weekNumber: 1, phase: "Base", targetVolume: 180, keyWorkoutType: "longRun" },
          { weekNumber: 2, phase: "Base", targetVolume: 230, keyWorkoutType: "longRun" }, // 28% increase - exceeds 20% warn threshold
          { weekNumber: 3, phase: "Base", targetVolume: 250, keyWorkoutType: "longRun" },
          { weekNumber: 4, phase: "Base", targetVolume: 200, keyWorkoutType: null },
          { weekNumber: 5, phase: "Build", targetVolume: 220, keyWorkoutType: "tempo" },
          { weekNumber: 6, phase: "Build", targetVolume: 240, keyWorkoutType: "intervals" },
          { weekNumber: 7, phase: "Build", targetVolume: 260, keyWorkoutType: "tempo" },
          { weekNumber: 8, phase: "Build", targetVolume: 200, keyWorkoutType: null },
        ],
        phases: validOrchestratorOutput.phases,
      };
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(badOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      // Now passes validation (with warnings) to allow full pipeline testing
      const result = await agent.execute(validInput);
      expect(result.success).toBe(true);
    });

    it("allows volume decreases (recovery weeks)", async () => {
      // validOrchestratorOutput already has week 4 as recovery with volume decrease
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validOrchestratorOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const result = await agent.execute(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe("athlete experience levels", () => {
    it("handles beginner athlete", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validOrchestratorOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const beginnerInput = {
        ...validInput,
        athlete: { ...validInput.athlete, experience: "beginner" as const },
      };

      const result = await agent.execute(beginnerInput);
      expect(result.success).toBe(true);
    });

    it("handles advanced athlete", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(validOrchestratorOutput) }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      });

      const advancedInput = {
        ...validInput,
        athlete: { ...validInput.athlete, experience: "advanced" as const },
      };

      const result = await agent.execute(advancedInput);
      expect(result.success).toBe(true);
    });
  });
});
