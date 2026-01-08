import { describe, it, expect } from "vitest";
import {
  // Types
  type Block,
  type Day,
  type Workout,
  type Week,
  // Validation
  validateBlock,
  validateWorkout,
  validateDay,
  // Classification
  isRestBlock,
  isHardBlock,
  isEasyBlock,
  // Workout calculations
  calculateWorkoutTotal,
  calculateWorkoutEffort,
  // Day calculations
  calculateDayTotal,
  calculateDayEffort,
  isRestDay,
  isHardDay,
  countDayBlocksByType,
  // Week calculations
  calculateWeekTotal,
  calculateWeekEffort,
  countWeekBlocksByType,
  countRestDays,
  countHardDays,
  calculateWeekDistribution,
} from "@/lib/blocks";

describe("Block Validation", () => {
  describe("validateBlock", () => {
    it("accepts valid block", () => {
      const block: Block = { type: "warmUp", value: 10, effortLevel: "z1" };
      const result = validateBlock(block);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects block with invalid type", () => {
      const block = { type: "invalid", value: 10, effortLevel: "z1" } as Block;
      const result = validateBlock(block);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("type"))).toBe(true);
    });

    it("rejects block with value <= 0 (non-rest)", () => {
      const block: Block = { type: "easy", value: 0, effortLevel: "z2" };
      const result = validateBlock(block);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("value"))).toBe(true);
    });

    it("accepts rest block with value = 0", () => {
      const block: Block = { type: "rest", value: 0, effortLevel: "z1" };
      const result = validateBlock(block);
      expect(result.valid).toBe(true);
    });

    it("rejects block with invalid effortLevel", () => {
      const block = { type: "easy", value: 30, effortLevel: "z6" } as Block;
      const result = validateBlock(block);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("effort"))).toBe(true);
    });

    it("rejects block with negative value", () => {
      const block: Block = { type: "easy", value: -10, effortLevel: "z2" };
      const result = validateBlock(block);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateWorkout", () => {
    it("accepts valid workout with multiple blocks", () => {
      const workout: Workout = {
        blocks: [
          { type: "warmUp", value: 10, effortLevel: "z1" },
          { type: "intervals", value: 20, effortLevel: "z4" },
          { type: "coolDown", value: 10, effortLevel: "z1" },
        ],
      };
      const result = validateWorkout(workout);
      expect(result.valid).toBe(true);
    });

    it("rejects workout with invalid block", () => {
      const workout: Workout = {
        blocks: [
          { type: "warmUp", value: 10, effortLevel: "z1" },
          { type: "easy", value: -5, effortLevel: "z2" }, // Invalid
        ],
      };
      const result = validateWorkout(workout);
      expect(result.valid).toBe(false);
    });
  });

  describe("validateDay", () => {
    it("accepts valid day", () => {
      const day: Day = {
        dayOfWeek: "Monday",
        workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }],
      };
      const result = validateDay(day);
      expect(result.valid).toBe(true);
    });

    it("rejects day missing dayOfWeek", () => {
      const day = {
        workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }],
      } as Day;
      const result = validateDay(day);
      expect(result.valid).toBe(false);
    });
  });
});

describe("Block Classification", () => {
  describe("isRestBlock", () => {
    it("returns true for rest blocks", () => {
      expect(isRestBlock({ type: "rest", value: 0, effortLevel: "z1" })).toBe(true);
    });

    it("returns false for non-rest blocks", () => {
      expect(isRestBlock({ type: "easy", value: 30, effortLevel: "z2" })).toBe(false);
    });
  });

  describe("isHardBlock", () => {
    it("returns true for intervals", () => {
      expect(isHardBlock({ type: "intervals", value: 20, effortLevel: "z4" })).toBe(true);
    });

    it("returns true for tempo", () => {
      expect(isHardBlock({ type: "tempo", value: 30, effortLevel: "z3" })).toBe(true);
    });

    it("returns true for z4 effort", () => {
      expect(isHardBlock({ type: "easy", value: 30, effortLevel: "z4" })).toBe(true);
    });

    it("returns true for z5 effort", () => {
      expect(isHardBlock({ type: "longRun", value: 90, effortLevel: "z5" })).toBe(true);
    });

    it("returns false for easy z2 block", () => {
      expect(isHardBlock({ type: "easy", value: 30, effortLevel: "z2" })).toBe(false);
    });
  });

  describe("isEasyBlock", () => {
    it("returns true for easy z1 block", () => {
      expect(isEasyBlock({ type: "easy", value: 30, effortLevel: "z1" })).toBe(true);
    });

    it("returns true for warmUp z1 block", () => {
      expect(isEasyBlock({ type: "warmUp", value: 15, effortLevel: "z1" })).toBe(true);
    });

    it("returns true for longRun z2 block", () => {
      expect(isEasyBlock({ type: "longRun", value: 90, effortLevel: "z2" })).toBe(true);
    });

    it("returns false for easy z5 block (hard effort)", () => {
      expect(isEasyBlock({ type: "easy", value: 30, effortLevel: "z5" })).toBe(false);
    });

    it("returns false for tempo block", () => {
      expect(isEasyBlock({ type: "tempo", value: 30, effortLevel: "z3" })).toBe(false);
    });
  });
});

describe("Workout Calculations", () => {
  const structuredWorkout: Workout = {
    blocks: [
      { type: "warmUp", value: 10, effortLevel: "z1" },
      { type: "intervals", value: 20, effortLevel: "z4" },
      { type: "coolDown", value: 10, effortLevel: "z1" },
    ],
  };

  describe("calculateWorkoutTotal", () => {
    it("sums block values", () => {
      expect(calculateWorkoutTotal(structuredWorkout)).toBe(40);
    });

    it("returns 0 for empty workout", () => {
      expect(calculateWorkoutTotal({ blocks: [] })).toBe(0);
    });
  });

  describe("calculateWorkoutEffort", () => {
    it("calculates weighted average effort", () => {
      // 10min z1 + 20min z4 + 10min z1 = (10*1 + 20*4 + 10*1) / 40 = 100/40 = 2.5
      expect(calculateWorkoutEffort(structuredWorkout)).toBe(2.5);
    });

    it("returns 0 for workout with only rest", () => {
      const restWorkout: Workout = {
        blocks: [{ type: "rest", value: 0, effortLevel: "z1" }],
      };
      expect(calculateWorkoutEffort(restWorkout)).toBe(0);
    });
  });
});

describe("Day Calculations", () => {
  const runDay: Day = {
    dayOfWeek: "Tuesday",
    workouts: [
      {
        blocks: [
          { type: "warmUp", value: 10, effortLevel: "z1" },
          { type: "intervals", value: 20, effortLevel: "z4" },
          { type: "coolDown", value: 10, effortLevel: "z1" },
        ],
      },
    ],
  };

  const restDay: Day = {
    dayOfWeek: "Monday",
    workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }],
  };

  const easyDay: Day = {
    dayOfWeek: "Wednesday",
    workouts: [{ blocks: [{ type: "easy", value: 45, effortLevel: "z2" }] }],
  };

  describe("calculateDayTotal", () => {
    it("sums all block values across workouts", () => {
      expect(calculateDayTotal(runDay)).toBe(40);
    });

    it("returns 0 for rest day", () => {
      expect(calculateDayTotal(restDay)).toBe(0);
    });
  });

  describe("calculateDayEffort", () => {
    it("calculates weighted average effort", () => {
      expect(calculateDayEffort(runDay)).toBe(2.5);
    });

    it("returns 0 for rest day", () => {
      expect(calculateDayEffort(restDay)).toBe(0);
    });
  });

  describe("isRestDay", () => {
    it("returns true for rest day", () => {
      expect(isRestDay(restDay)).toBe(true);
    });

    it("returns false for run day", () => {
      expect(isRestDay(runDay)).toBe(false);
    });
  });

  describe("isHardDay", () => {
    it("returns true for day with intervals", () => {
      expect(isHardDay(runDay)).toBe(true);
    });

    it("returns false for easy day", () => {
      expect(isHardDay(easyDay)).toBe(false);
    });

    it("returns false for rest day", () => {
      expect(isHardDay(restDay)).toBe(false);
    });
  });

  describe("countDayBlocksByType", () => {
    it("counts blocks by type", () => {
      const counts = countDayBlocksByType(runDay);
      expect(counts.warmUp).toBe(1);
      expect(counts.intervals).toBe(1);
      expect(counts.coolDown).toBe(1);
      expect(counts.easy).toBe(0);
    });
  });
});

describe("Week Calculations", () => {
  const testWeek: Week = {
    weekNumber: 1,
    phase: "Base",
    days: [
      { dayOfWeek: "Monday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
      { dayOfWeek: "Tuesday", workouts: [{ blocks: [{ type: "easy", value: 45, effortLevel: "z2" }] }] },
      { dayOfWeek: "Wednesday", workouts: [{ blocks: [{ type: "easy", value: 40, effortLevel: "z2" }] }] },
      {
        dayOfWeek: "Thursday",
        workouts: [
          {
            blocks: [
              { type: "warmUp", value: 10, effortLevel: "z1" },
              { type: "tempo", value: 20, effortLevel: "z3" },
              { type: "coolDown", value: 10, effortLevel: "z1" },
            ],
          },
        ],
      },
      { dayOfWeek: "Friday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
      { dayOfWeek: "Saturday", workouts: [{ blocks: [{ type: "longRun", value: 90, effortLevel: "z2" }] }] },
      { dayOfWeek: "Sunday", workouts: [{ blocks: [{ type: "easy", value: 30, effortLevel: "z1" }] }] },
    ],
  };

  describe("calculateWeekTotal", () => {
    it("sums all minutes in week", () => {
      // 0 + 45 + 40 + 40 + 0 + 90 + 30 = 245
      expect(calculateWeekTotal(testWeek)).toBe(245);
    });
  });

  describe("calculateWeekEffort", () => {
    it("calculates weighted average effort for week", () => {
      const effort = calculateWeekEffort(testWeek);
      // Should be between 1 and 3 (mostly easy running with one tempo)
      expect(effort).toBeGreaterThan(1);
      expect(effort).toBeLessThan(3);
    });
  });

  describe("countWeekBlocksByType", () => {
    it("counts all blocks in week by type", () => {
      const counts = countWeekBlocksByType(testWeek);
      expect(counts.rest).toBe(2);
      expect(counts.easy).toBe(3);
      expect(counts.warmUp).toBe(1);
      expect(counts.tempo).toBe(1);
      expect(counts.coolDown).toBe(1);
      expect(counts.longRun).toBe(1);
    });
  });

  describe("countRestDays", () => {
    it("counts rest days in week", () => {
      expect(countRestDays(testWeek)).toBe(2); // Monday and Friday
    });
  });

  describe("countHardDays", () => {
    it("counts hard days in week", () => {
      expect(countHardDays(testWeek)).toBe(1); // Thursday (tempo)
    });
  });

  describe("calculateWeekDistribution", () => {
    it("calculates easy/hard distribution", () => {
      const dist = calculateWeekDistribution(testWeek);

      // Easy: warmUp(10) + coolDown(10) + easy(45+40+30) + longRun(90) = 225
      // Hard (tempo at z3): 20 * 0.5 = 10 (z3 splits 50/50)
      // Easy portion of tempo: 20 * 0.5 = 10
      expect(dist.total).toBe(245);
      expect(dist.easy).toBeGreaterThan(200);
      expect(dist.hard).toBeLessThan(50);
    });
  });
});
