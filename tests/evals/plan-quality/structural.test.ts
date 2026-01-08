import { describe, it, expect } from "vitest";
import { validateStructure } from "@/lib/plan-evaluation";
import type { TrainingPlan } from "@/lib/plan-evaluation";

// Load fixtures
import validPlan from "../../fixtures/plans/synthetic-valid-12week.json";
import missingWeeksPlan from "../../fixtures/plans/synthetic-invalid-missing-weeks.json";

describe("Structural Validity", () => {
  describe("Valid Plan", () => {
    it("passes for valid plan with all weeks", () => {
      const result = validateStructure(validPlan as TrainingPlan);

      expect(result.valid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.errors).toHaveLength(0);
    });

    it("has all 12 weeks present", () => {
      const result = validateStructure(validPlan as TrainingPlan);

      expect(result.valid).toBe(true);
      expect((validPlan as TrainingPlan).weeks).toHaveLength(12);
    });

    it("has 7 days per week", () => {
      for (const week of (validPlan as TrainingPlan).weeks) {
        expect(week.days).toHaveLength(7);
      }
    });
  });

  describe("Missing Weeks", () => {
    it("fails for plan missing weeks", () => {
      const result = validateStructure(missingWeeksPlan as TrainingPlan);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "WEEK_COUNT_MISMATCH")).toBe(true);
    });

    it("detects non-sequential week numbers", () => {
      const result = validateStructure(missingWeeksPlan as TrainingPlan);

      // Plan claims 8 weeks but only has 5, and they're not sequential (1,2,4,5,8)
      expect(result.errors.some((e) => e.code === "WEEK_NUMBER_MISMATCH")).toBe(true);
    });

    it("has reduced score for missing weeks", () => {
      const result = validateStructure(missingWeeksPlan as TrainingPlan);

      expect(result.score).toBeLessThan(100);
    });
  });

  describe("Missing Required Fields", () => {
    it("fails for plan missing id", () => {
      const planWithoutId = { ...validPlan, id: undefined } as unknown as TrainingPlan;
      const result = validateStructure(planWithoutId);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_ID")).toBe(true);
    });

    it("fails for plan missing userId", () => {
      const planWithoutUserId = { ...validPlan, userId: undefined } as unknown as TrainingPlan;
      const result = validateStructure(planWithoutUserId);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_USER_ID")).toBe(true);
    });

    it("fails for invalid totalWeeks", () => {
      const planWithInvalidWeeks = { ...validPlan, totalWeeks: 0 } as TrainingPlan;
      const result = validateStructure(planWithInvalidWeeks);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_TOTAL_WEEKS")).toBe(true);
    });
  });

  describe("Invalid Days", () => {
    it("fails for week with wrong number of days", () => {
      const planWithShortWeek = {
        ...validPlan,
        weeks: [
          {
            ...validPlan.weeks[0],
            days: validPlan.weeks[0].days.slice(0, 5), // Only 5 days
          },
          ...validPlan.weeks.slice(1),
        ],
      } as TrainingPlan;

      const result = validateStructure(planWithShortWeek);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_DAY_COUNT")).toBe(true);
    });

    it("fails for day missing dayOfWeek field", () => {
      const planWithBadDay = {
        ...validPlan,
        weeks: [
          {
            ...validPlan.weeks[0],
            days: [
              { workouts: validPlan.weeks[0].days[0].workouts }, // Missing dayOfWeek
              ...validPlan.weeks[0].days.slice(1),
            ],
          },
          ...validPlan.weeks.slice(1),
        ],
      } as TrainingPlan;

      const result = validateStructure(planWithBadDay);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_DAY_OF_WEEK")).toBe(true);
    });

    it("fails for day missing workouts array", () => {
      const planWithBadDay = {
        ...validPlan,
        weeks: [
          {
            ...validPlan.weeks[0],
            days: [
              { dayOfWeek: "Monday" }, // Missing workouts
              ...validPlan.weeks[0].days.slice(1),
            ],
          },
          ...validPlan.weeks.slice(1),
        ],
      } as TrainingPlan;

      const result = validateStructure(planWithBadDay);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "MISSING_WORKOUTS")).toBe(true);
    });
  });

  describe("Duplicate Week Numbers", () => {
    it("detects duplicate week numbers", () => {
      const planWithDuplicates = {
        ...validPlan,
        totalWeeks: 3,
        weeks: [
          { ...validPlan.weeks[0], weekNumber: 1 },
          { ...validPlan.weeks[1], weekNumber: 1 }, // Duplicate!
          { ...validPlan.weeks[2], weekNumber: 3 },
        ],
      } as TrainingPlan;

      const result = validateStructure(planWithDuplicates);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "DUPLICATE_WEEK_NUMBER")).toBe(true);
    });
  });

  describe("Warnings", () => {
    it("warns for unusually long plans", () => {
      const veryLongPlan = {
        ...validPlan,
        totalWeeks: 60,
        weeks: Array.from({ length: 60 }, (_, i) => ({
          ...validPlan.weeks[0],
          weekNumber: i + 1,
        })),
      } as TrainingPlan;

      const result = validateStructure(veryLongPlan);

      expect(result.warnings.some((w) => w.includes("unusually long"))).toBe(true);
    });
  });
});
