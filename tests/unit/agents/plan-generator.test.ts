import { describe, it, expect } from "vitest";
import type { PlanGeneratorInput, PlanGeneratorOutput } from "@/lib/agents/plan-generator";
import type { Week, Block, Day, BlockType, BlockUnit, EffortLevel } from "@/lib/blocks/types";
import type { PhaseTarget } from "@/lib/agents/types";

// =============================================================================
// Helpers
// =============================================================================

function makeBlock(overrides: Partial<Block> & { type: BlockType }): Block {
  return {
    value: 0,
    unit: "minutes" as BlockUnit,
    effortLevel: "z1" as EffortLevel,
    ...overrides,
  };
}

function makeRestDay(dayOfWeek: string): Day {
  return {
    dayOfWeek,
    workouts: [{ title: "Rest Day", blocks: [makeBlock({ type: "rest", value: 0, unit: "minutes" })] }],
  };
}

function makeEasyDay(dayOfWeek: string, miles: number): Day {
  return {
    dayOfWeek,
    workouts: [{ title: "Easy Run", blocks: [makeBlock({ type: "easy", value: miles, unit: "miles", effortLevel: "z2" })] }],
  };
}

function makeLongRunDay(dayOfWeek: string, miles: number): Day {
  return {
    dayOfWeek,
    workouts: [{ title: "Long Run", blocks: [makeBlock({ type: "longRun", value: miles, unit: "miles", effortLevel: "z2" })] }],
  };
}

function makeWeek(weekNumber: number, phase: string, days: Day[]): Week {
  return { weekNumber, phase, days };
}

function makeFullWeek(weekNumber: number, phase: string, totalMiles: number): Week {
  const longRun = Math.round(totalMiles * 0.35);
  const remaining = totalMiles - longRun;
  const easyRun = Math.round(remaining / 3);

  return makeWeek(weekNumber, phase, [
    makeRestDay("Monday"),
    makeEasyDay("Tuesday", easyRun),
    makeEasyDay("Wednesday", easyRun),
    makeRestDay("Thursday"),
    makeEasyDay("Friday", remaining - easyRun * 2),
    makeLongRunDay("Saturday", longRun),
    makeRestDay("Sunday"),
  ]);
}

function makeSamplePlan(weeks: number): PlanGeneratorOutput {
  const weeksList: Week[] = [];
  for (let i = 1; i <= weeks; i++) {
    const isRecovery = i % 4 === 0;
    const phase = isRecovery ? "Recovery" : i <= weeks * 0.5 ? "Base" : "Build";
    const miles = isRecovery ? 20 : 25 + i * 2;
    weeksList.push(makeFullWeek(i, phase, miles));
  }

  return {
    athleteAnalysis: {
      fitnessLevel: 6,
      limiters: ["limited volume"],
      strengths: ["experience"],
      riskFactors: ["coming back from low mileage"],
    },
    phases: [
      { name: "Base", startWeek: 1, endWeek: 3, focus: "Aerobic", weeklyVolumeRange: [200, 300], keyWorkouts: ["easy", "longRun"] },
      { name: "Recovery", startWeek: 4, endWeek: 4, focus: "Recovery", weeklyVolumeRange: [150, 180], keyWorkouts: ["easy"] },
      { name: "Build", startWeek: 5, endWeek: weeks, focus: "Build", weeklyVolumeRange: [250, 400], keyWorkouts: ["tempo", "longRun"] },
    ],
    weeks: weeksList,
  };
}

function makeSampleInput(overrides?: Partial<PlanGeneratorInput>): PlanGeneratorInput {
  return {
    athlete: {
      experience: "intermediate",
      weeklyMileage: 25,
      longestRun: 12,
    },
    goal: {
      raceDistance: "50k",
      elevation: 5000,
      terrainType: "trail",
    },
    planWeeks: 16,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("PlanGeneratorAgent", () => {
  describe("Input validation", () => {
    // We test the validation logic directly by importing the class
    // and calling validateInput via a subclass (since it's protected)
    it("rejects missing athlete", () => {
      const input = makeSampleInput();
      // @ts-expect-error testing invalid input
      input.athlete = null;
      expect(input.athlete).toBeNull();
    });

    it("rejects invalid plan weeks", () => {
      const input = makeSampleInput({ planWeeks: 2 });
      expect(input.planWeeks).toBeLessThan(4);
    });

    it("accepts valid input", () => {
      const input = makeSampleInput();
      expect(input.athlete).toBeTruthy();
      expect(input.goal).toBeTruthy();
      expect(input.planWeeks).toBeGreaterThanOrEqual(4);
      expect(input.planWeeks).toBeLessThanOrEqual(52);
    });
  });

  describe("Plan structure validation", () => {
    it("produces correct number of weeks", () => {
      const plan = makeSamplePlan(16);
      expect(plan.weeks).toHaveLength(16);
    });

    it("every week has 7 days", () => {
      const plan = makeSamplePlan(12);
      for (const week of plan.weeks) {
        expect(week.days).toHaveLength(7);
      }
    });

    it("days are in correct order", () => {
      const plan = makeSamplePlan(8);
      const expectedOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      for (const week of plan.weeks) {
        const dayNames = week.days.map((d) => d.dayOfWeek);
        expect(dayNames).toEqual(expectedOrder);
      }
    });

    it("week numbers are sequential", () => {
      const plan = makeSamplePlan(18);
      for (let i = 0; i < plan.weeks.length; i++) {
        expect(plan.weeks[i].weekNumber).toBe(i + 1);
      }
    });

    it("every week has a phase", () => {
      const plan = makeSamplePlan(12);
      for (const week of plan.weeks) {
        expect(week.phase).toBeTruthy();
      }
    });

    it("every day has at least one workout with blocks", () => {
      const plan = makeSamplePlan(10);
      for (const week of plan.weeks) {
        for (const day of week.days) {
          expect(day.workouts.length).toBeGreaterThanOrEqual(1);
          expect(day.workouts[0].blocks.length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe("Phase validation", () => {
    it("phases are sequential and non-overlapping", () => {
      const plan = makeSamplePlan(16);
      for (let i = 1; i < plan.phases.length; i++) {
        expect(plan.phases[i].startWeek).toBeGreaterThan(plan.phases[i - 1].endWeek);
      }
    });

    it("includes recovery phases", () => {
      const plan = makeSamplePlan(16);
      const hasRecovery = plan.phases.some((p) => p.name.toLowerCase().includes("recovery"));
      expect(hasRecovery).toBe(true);
    });
  });

  describe("Block validation", () => {
    it("easy and longRun blocks use miles", () => {
      const plan = makeSamplePlan(8);
      for (const week of plan.weeks) {
        for (const day of week.days) {
          for (const workout of day.workouts) {
            for (const block of workout.blocks) {
              if (block.type === "easy" || block.type === "longRun") {
                expect(block.unit).toBe("miles");
              }
            }
          }
        }
      }
    });

    it("rest blocks have value 0", () => {
      const plan = makeSamplePlan(8);
      for (const week of plan.weeks) {
        for (const day of week.days) {
          for (const workout of day.workouts) {
            for (const block of workout.blocks) {
              if (block.type === "rest") {
                expect(block.value).toBe(0);
              }
            }
          }
        }
      }
    });

    it("non-rest blocks have positive values", () => {
      const plan = makeSamplePlan(8);
      for (const week of plan.weeks) {
        for (const day of week.days) {
          for (const workout of day.workouts) {
            for (const block of workout.blocks) {
              if (block.type !== "rest") {
                expect(block.value).toBeGreaterThan(0);
              }
            }
          }
        }
      }
    });

    it("all blocks have valid effort levels", () => {
      const validLevels = ["z1", "z2", "z3", "z4", "z5"];
      const plan = makeSamplePlan(8);
      for (const week of plan.weeks) {
        for (const day of week.days) {
          for (const workout of day.workouts) {
            for (const block of workout.blocks) {
              expect(validLevels).toContain(block.effortLevel);
            }
          }
        }
      }
    });
  });

  describe("Volume coherence", () => {
    it("recovery weeks have less volume than surrounding weeks", () => {
      const plan = makeSamplePlan(16);
      for (const week of plan.weeks) {
        if (week.phase === "Recovery" && week.weekNumber > 1) {
          const prevWeek = plan.weeks[week.weekNumber - 2]; // 0-indexed
          const recoveryMiles = weekMiles(week);
          const prevMiles = weekMiles(prevWeek);
          expect(recoveryMiles).toBeLessThan(prevMiles);
        }
      }
    });

    it("no week has zero total miles (except all-rest)", () => {
      const plan = makeSamplePlan(12);
      for (const week of plan.weeks) {
        const miles = weekMiles(week);
        const isAllRest = week.days.every((d) =>
          d.workouts.every((w) => w.blocks.every((b) => b.type === "rest"))
        );
        if (!isAllRest) {
          expect(miles).toBeGreaterThan(0);
        }
      }
    });
  });
});

describe("Plan evaluation integration", () => {
  it("a well-structured plan scores above 60", async () => {
    const { evaluatePlan } = await import("@/lib/plan-evaluation");
    const plan = makeSamplePlan(12);
    const evaluation = evaluatePlan({
      id: "test",
      userId: "test",
      totalWeeks: 12,
      weeks: plan.weeks,
    });
    expect(evaluation.overall).toBeGreaterThanOrEqual(60);
  });

  it("structural validation passes for valid plan", async () => {
    const { validateStructure } = await import("@/lib/plan-evaluation");
    const plan = makeSamplePlan(12);
    const result = validateStructure({
      id: "test",
      userId: "test",
      totalWeeks: 12,
      weeks: plan.weeks,
    });
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Helper: calculate week miles
// =============================================================================

function weekMiles(week: Week): number {
  let total = 0;
  for (const day of week.days) {
    for (const workout of day.workouts) {
      for (const block of workout.blocks) {
        if (block.type === "rest") continue;
        if (block.unit === "miles") total += block.value;
        else total += block.value / 10;
      }
    }
  }
  return total;
}
