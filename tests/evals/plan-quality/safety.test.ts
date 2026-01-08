import { describe, it, expect } from "vitest";
import { checkSafetyRules } from "@/lib/plan-evaluation";
import type { TrainingPlan } from "@/lib/types";

// Load fixtures
import validPlan from "../../fixtures/plans/synthetic-valid-12week.json";
import volumeSpikePlan from "../../fixtures/plans/synthetic-unsafe-volume-spike.json";

describe("Safety Rules", () => {
  describe("Valid Plan", () => {
    it("passes for safe plan", () => {
      const result = checkSafetyRules(validPlan as TrainingPlan);

      // Valid plan should have high safety score
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it("has proper volume progression", () => {
      const result = checkSafetyRules(validPlan as TrainingPlan);

      const volumeViolations = result.violations.filter(
        (v) => v.rule === "VOLUME_PROGRESSION_LIMIT"
      );
      expect(volumeViolations).toHaveLength(0);
    });
  });

  describe("Volume Progression", () => {
    it("detects volume spike > 10%", () => {
      const result = checkSafetyRules(volumeSpikePlan as TrainingPlan);

      const volumeViolations = result.violations.filter(
        (v) => v.rule === "VOLUME_PROGRESSION_LIMIT"
      );
      expect(volumeViolations.length).toBeGreaterThan(0);
    });

    it("marks large volume spikes as critical", () => {
      const result = checkSafetyRules(volumeSpikePlan as TrainingPlan);

      // Week 2 to 3 is 32 -> 45 = 40% increase - should be critical
      const criticalViolations = result.violations.filter(
        (v) => v.rule === "VOLUME_PROGRESSION_LIMIT" && v.severity === "critical"
      );
      expect(criticalViolations.length).toBeGreaterThan(0);
    });

    it("ignores volume drops (recovery weeks)", () => {
      // Valid plan has recovery weeks with volume drops - these shouldn't trigger violations
      const result = checkSafetyRules(validPlan as TrainingPlan);

      // Check that we don't have false positives for recovery week drops
      const volumeViolations = result.violations.filter(
        (v) => v.rule === "VOLUME_PROGRESSION_LIMIT"
      );
      expect(volumeViolations).toHaveLength(0);
    });
  });

  describe("Recovery Week Frequency", () => {
    it("detects missing recovery weeks", () => {
      // Create a plan with 8 consecutive hard weeks (no recovery)
      const noRecoveryPlan = {
        ...validPlan,
        totalWeeks: 8,
        weeks: Array.from({ length: 8 }, (_, i) => ({
          weekNumber: i + 1,
          phase: "Build", // Not "Recovery" - continuous building
          targetMiles: String(40 + i * 2),
          targetVertical: "2000",
          workouts: validPlan.weeks[4].workouts, // Use a build week template
        })),
      } as TrainingPlan;

      const result = checkSafetyRules(noRecoveryPlan);

      const recoveryViolations = result.violations.filter(
        (v) => v.rule === "RECOVERY_WEEK_FREQUENCY"
      );
      expect(recoveryViolations.length).toBeGreaterThan(0);
    });

    it("accepts plans with regular recovery weeks", () => {
      // Valid plan has recovery at week 4 and 8
      const result = checkSafetyRules(validPlan as TrainingPlan);

      const recoveryViolations = result.violations.filter(
        (v) => v.rule === "RECOVERY_WEEK_FREQUENCY"
      );
      expect(recoveryViolations).toHaveLength(0);
    });
  });

  describe("Consecutive Hard Days", () => {
    it("detects consecutive hard days", () => {
      // Create a plan with back-to-back hard workouts
      const backToBackHardPlan = {
        ...validPlan,
        totalWeeks: 1,
        weeks: [
          {
            weekNumber: 1,
            phase: "Build",
            targetMiles: "40",
            targetVertical: "2000",
            workouts: [
              { day: "Monday", type: "Rest", zone: "Recovery", description: "Rest" },
              { day: "Tuesday", type: "Intervals", zone: "Zone 4", description: "Hard intervals" },
              { day: "Wednesday", type: "Tempo Run", zone: "Zone 3-4", description: "Hard tempo" }, // Back-to-back!
              { day: "Thursday", type: "Easy Run", zone: "Zone 1-2", description: "Easy" },
              { day: "Friday", type: "Rest", zone: "Recovery", description: "Rest" },
              { day: "Saturday", type: "Long Run", zone: "Zone 1-2", description: "Long run" },
              { day: "Sunday", type: "Easy Run", zone: "Zone 1-2", description: "Easy" },
            ],
          },
        ],
      } as TrainingPlan;

      const result = checkSafetyRules(backToBackHardPlan);

      const hardDayViolations = result.violations.filter(
        (v) => v.rule === "CONSECUTIVE_HARD_DAYS"
      );
      expect(hardDayViolations.length).toBeGreaterThan(0);
    });

    it("accepts plans with easy days between hard days", () => {
      const result = checkSafetyRules(validPlan as TrainingPlan);

      const hardDayViolations = result.violations.filter(
        (v) => v.rule === "CONSECUTIVE_HARD_DAYS"
      );
      // Valid plan should alternate hard/easy properly
      expect(hardDayViolations).toHaveLength(0);
    });
  });

  describe("Rest Days", () => {
    it("detects weeks without rest days", () => {
      const noRestPlan = {
        ...validPlan,
        totalWeeks: 1,
        weeks: [
          {
            weekNumber: 1,
            phase: "Build",
            targetMiles: "50",
            targetVertical: "2000",
            workouts: [
              { day: "Monday", type: "Easy Run", zone: "Zone 1-2", description: "Easy run" },
              { day: "Tuesday", type: "Easy Run", zone: "Zone 1-2", description: "Easy run" },
              { day: "Wednesday", type: "Tempo", zone: "Zone 3", description: "Tempo run" },
              { day: "Thursday", type: "Easy Run", zone: "Zone 1-2", description: "Easy run" },
              { day: "Friday", type: "Easy Run", zone: "Zone 1-2", description: "Easy run" },
              { day: "Saturday", type: "Long Run", zone: "Zone 1-2", description: "Long run" },
              { day: "Sunday", type: "Easy Run", zone: "Zone 1-2", description: "Easy run" },
            ],
          },
        ],
      } as TrainingPlan;

      const result = checkSafetyRules(noRestPlan);

      const noRestViolations = result.violations.filter((v) => v.rule === "NO_REST_DAY");
      expect(noRestViolations.length).toBeGreaterThan(0);
    });
  });

  describe("Taper", () => {
    it("detects insufficient taper", () => {
      // Plan where race week has nearly same volume as peak
      const noTaperPlan = {
        ...validPlan,
        totalWeeks: 4,
        weeks: [
          { ...validPlan.weeks[0], weekNumber: 1, targetMiles: "40" },
          { ...validPlan.weeks[1], weekNumber: 2, targetMiles: "45" },
          { ...validPlan.weeks[2], weekNumber: 3, phase: "Peak", targetMiles: "50" },
          { ...validPlan.weeks[3], weekNumber: 4, phase: "Race Week", targetMiles: "45" }, // Not enough reduction
        ],
      } as TrainingPlan;

      const result = checkSafetyRules(noTaperPlan);

      const taperViolations = result.violations.filter((v) => v.rule === "INSUFFICIENT_TAPER");
      expect(taperViolations.length).toBeGreaterThan(0);
    });

    it("accepts proper taper", () => {
      // Valid plan has proper taper: peak ~50mi, race week ~25mi
      const result = checkSafetyRules(validPlan as TrainingPlan);

      const taperViolations = result.violations.filter((v) => v.rule === "INSUFFICIENT_TAPER");
      expect(taperViolations).toHaveLength(0);
    });
  });

  describe("Score Calculation", () => {
    it("reduces score for critical violations", () => {
      const result = checkSafetyRules(volumeSpikePlan as TrainingPlan);

      // Critical violations should significantly reduce score
      expect(result.score).toBeLessThan(70);
    });

    it("gives high score for safe plan", () => {
      const result = checkSafetyRules(validPlan as TrainingPlan);

      expect(result.score).toBeGreaterThanOrEqual(85);
    });
  });
});
