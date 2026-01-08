import { describe, it, expect } from "vitest";
import { scoreMethodology } from "@/lib/plan-evaluation";
import type { TrainingPlan, Day } from "@/lib/plan-evaluation";

// Load fixtures
import validPlan from "../../fixtures/plans/synthetic-valid-12week.json";
import badPolarizationPlan from "../../fixtures/plans/synthetic-bad-polarization.json";

describe("Methodology Alignment", () => {
  describe("Polarization (80/20)", () => {
    it("scores well for proper 80/20 distribution", () => {
      const result = scoreMethodology(validPlan as TrainingPlan);

      // Valid plan should have reasonable polarization
      expect(result.breakdown.polarization).toBeGreaterThanOrEqual(70);
    });

    it("scores poorly for too much intensity", () => {
      const result = scoreMethodology(badPolarizationPlan as TrainingPlan);

      // Bad polarization plan has too much Zone 3-5 work
      expect(result.breakdown.polarization).toBeLessThan(70);
    });

    it("flags polarization issues", () => {
      const result = scoreMethodology(badPolarizationPlan as TrainingPlan);

      expect(result.issues.some((issue) => issue.includes("distribution"))).toBe(true);
    });
  });

  describe("Periodization", () => {
    it("scores proper phase ordering", () => {
      const result = scoreMethodology(validPlan as TrainingPlan);

      // Valid plan has proper phase order: Base -> Build -> Peak -> Taper
      expect(result.breakdown.periodization).toBeGreaterThanOrEqual(70);
    });

    it("penalizes wrong phase ordering", () => {
      const wrongOrderPlan = {
        ...validPlan,
        totalWeeks: 4,
        weeks: [
          { ...validPlan.weeks[0], weekNumber: 1, phase: "Peak" }, // Peak first is wrong!
          { ...validPlan.weeks[1], weekNumber: 2, phase: "Base" },
          { ...validPlan.weeks[2], weekNumber: 3, phase: "Build" },
          { ...validPlan.weeks[3], weekNumber: 4, phase: "Taper" },
        ],
      } as TrainingPlan;

      const result = scoreMethodology(wrongOrderPlan);

      expect(result.breakdown.periodization).toBeLessThan(100);
      expect(result.issues.some((issue) => issue.includes("ordering"))).toBe(true);
    });

    it("penalizes missing taper phase", () => {
      const noTaperPhasePlan = {
        ...validPlan,
        totalWeeks: 4,
        weeks: [
          { ...validPlan.weeks[0], weekNumber: 1, phase: "Base" },
          { ...validPlan.weeks[1], weekNumber: 2, phase: "Base" },
          { ...validPlan.weeks[2], weekNumber: 3, phase: "Build" },
          { ...validPlan.weeks[3], weekNumber: 4, phase: "Build" }, // No taper!
        ],
      } as TrainingPlan;

      const result = scoreMethodology(noTaperPhasePlan);

      expect(result.breakdown.periodization).toBeLessThan(100);
      expect(result.issues.some((issue) => issue.includes("taper"))).toBe(true);
    });

    it("penalizes single-phase plans", () => {
      const singlePhasePlan = {
        ...validPlan,
        totalWeeks: 4,
        weeks: Array.from({ length: 4 }, (_, i) => ({
          ...validPlan.weeks[0],
          weekNumber: i + 1,
          phase: "Base", // All the same phase
        })),
      } as TrainingPlan;

      const result = scoreMethodology(singlePhasePlan);

      expect(result.breakdown.periodization).toBeLessThan(100);
      expect(result.issues.some((issue) => issue.includes("phases"))).toBe(true);
    });
  });

  describe("Race Specificity", () => {
    it("scores race-specific work in peak phase", () => {
      const result = scoreMethodology(validPlan as TrainingPlan);

      // Valid plan has race pace work in peak phase
      expect(result.breakdown.specificity).toBeGreaterThanOrEqual(75);
    });

    it("penalizes missing race-pace work in peak", () => {
      // Create a 10-week plan with peak phase but no race-pace work (all easy)
      const noPeakSpecificityPlan = {
        ...validPlan,
        totalWeeks: 10,
        weeks: Array.from({ length: 10 }, (_, i) => ({
          weekNumber: i + 1,
          phase: i < 4 ? "Base" : i < 7 ? "Build" : i < 9 ? "Peak" : "Taper",
          days: [
            { dayOfWeek: "Monday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Tuesday", workouts: [{ blocks: [{ type: "easy", value: 45, effortLevel: "z2" }] }] },
            { dayOfWeek: "Wednesday", workouts: [{ blocks: [{ type: "easy", value: 40, effortLevel: "z2" }] }] },
            { dayOfWeek: "Thursday", workouts: [{ blocks: [{ type: "easy", value: 45, effortLevel: "z2" }] }] },
            { dayOfWeek: "Friday", workouts: [{ blocks: [{ type: "rest", value: 0, effortLevel: "z1" }] }] },
            { dayOfWeek: "Saturday", workouts: [{ blocks: [{ type: "longRun", value: 90, effortLevel: "z2" }] }] },
            { dayOfWeek: "Sunday", workouts: [{ blocks: [{ type: "easy", value: 30, effortLevel: "z1" }] }] },
          ] as Day[],
        })),
      } as TrainingPlan;

      const result = scoreMethodology(noPeakSpecificityPlan);

      // Should penalize for no race-pace work in peak phase
      expect(result.breakdown.specificity).toBeLessThan(100);
    });
  });

  describe("Progression", () => {
    it("scores logical volume buildup", () => {
      const result = scoreMethodology(validPlan as TrainingPlan);

      // Valid plan has increasing volume through base and build
      expect(result.breakdown.progression).toBeGreaterThanOrEqual(70);
    });

    it("penalizes declining volume in training phases", () => {
      // Create a plan where volume decreases (copy days to get decreasing total minutes)
      const decliningPlan = {
        ...validPlan,
        totalWeeks: 6,
        weeks: [
          { ...validPlan.weeks[9], weekNumber: 1, phase: "Base" }, // High volume (week 10)
          { ...validPlan.weeks[8], weekNumber: 2, phase: "Base" }, // Less (week 9)
          { ...validPlan.weeks[6], weekNumber: 3, phase: "Build" }, // Less (week 7)
          { ...validPlan.weeks[4], weekNumber: 4, phase: "Build" }, // Less (week 5)
          { ...validPlan.weeks[2], weekNumber: 5, phase: "Peak" },  // Less (week 3)
          { ...validPlan.weeks[0], weekNumber: 6, phase: "Taper" }, // Least (week 1)
        ],
      } as TrainingPlan;

      const result = scoreMethodology(decliningPlan);

      expect(result.breakdown.progression).toBeLessThan(100);
    });
  });

  describe("Overall Score", () => {
    it("gives high score for well-designed plan", () => {
      const result = scoreMethodology(validPlan as TrainingPlan);

      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("gives lower score for poorly designed plan", () => {
      const validResult = scoreMethodology(validPlan as TrainingPlan);
      const badResult = scoreMethodology(badPolarizationPlan as TrainingPlan);

      // Bad polarization plan should score lower than valid plan in polarization
      expect(badResult.breakdown.polarization).toBeLessThan(validResult.breakdown.polarization);
    });

    it("is a weighted average of sub-scores", () => {
      const result = scoreMethodology(validPlan as TrainingPlan);

      // Verify the overall is a reasonable combination of sub-scores
      const subScoreAvg =
        (result.breakdown.polarization +
          result.breakdown.periodization +
          result.breakdown.specificity +
          result.breakdown.progression) /
        4;

      // Overall should be close to the average (within 20 points)
      expect(Math.abs(result.score - subScoreAvg)).toBeLessThan(20);
    });
  });

  describe("Issues Reporting", () => {
    it("reports issues for failing criteria", () => {
      const result = scoreMethodology(badPolarizationPlan as TrainingPlan);

      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("reports no issues for well-designed plan", () => {
      const result = scoreMethodology(validPlan as TrainingPlan);

      // Valid plan may have some minor issues but should be few
      expect(result.issues.length).toBeLessThanOrEqual(2);
    });
  });
});
