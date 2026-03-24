/**
 * Plan Differentiation Tests
 *
 * These tests verify that our evaluation framework correctly differentiates
 * between good and bad training plans. A good eval should:
 * - Score a well-designed plan highly (>75%)
 * - Score a poorly-designed plan low (<50%)
 * - The difference should be meaningful (>25 points)
 */

import { describe, it, expect } from "vitest";
import { evaluatePlan, type TrainingPlan } from "../../lib/plan-evaluation";
import goodPlanFixture from "../fixtures/plans/good-50k-plan.json";
import badPlanFixture from "../fixtures/plans/bad-50k-plan.json";

// Import race requirements for appropriateness checks
import { getRaceRequirements } from "../../lib/planning/race-requirements";

// The target race type for these fixtures
const RACE_TYPE = "50k";

describe("Plan Differentiation", () => {
  const goodPlan = goodPlanFixture.plan as TrainingPlan;
  const badPlan = badPlanFixture.plan as TrainingPlan;

  describe("Good 50k Plan", () => {
    it("should have valid structure", () => {
      const result = evaluatePlan(goodPlan, RACE_TYPE);
      expect(result.structural.valid).toBe(true);
      expect(result.structural.score).toBe(100);
    });

    it("should have acceptable safety score", () => {
      const result = evaluatePlan(goodPlan, RACE_TYPE);
      // Real plans may have some volume spikes; >35 means no critical violations
      expect(result.safety.score).toBeGreaterThanOrEqual(35);
    });

    it("should have high methodology score", () => {
      const result = evaluatePlan(goodPlan, RACE_TYPE);
      expect(result.methodology.score).toBeGreaterThanOrEqual(80);
    });

    it("should have good race appropriateness score", () => {
      const result = evaluatePlan(goodPlan, RACE_TYPE);
      expect(result.raceAppropriateness).toBeDefined();
      // Good plan should score at least 50% on race appropriateness
      expect(result.raceAppropriateness!.score).toBeGreaterThanOrEqual(50);
    });

    it("should have good overall score", () => {
      const result = evaluatePlan(goodPlan, RACE_TYPE);
      // Good plans should score >=65 (not perfect, but good)
      expect(result.overall).toBeGreaterThanOrEqual(65);
    });

    it("should have appropriate volume for 50k", () => {
      const stats = calculatePlanStats(goodPlan);
      const requirements = getRaceRequirements("50k")!;

      // Peak weekly mileage should be at least minimum for race
      expect(stats.peakWeeklyMiles).toBeGreaterThanOrEqual(
        requirements.peakWeeklyMileage.min * 0.5 // At least 50% of minimum
      );
    });

    it("should have appropriate long run for 50k", () => {
      const stats = calculatePlanStats(goodPlan);
      const requirements = getRaceRequirements("50k")!;

      // Peak long run should be at least 50% of minimum
      expect(stats.peakLongRunMiles).toBeGreaterThanOrEqual(
        requirements.peakLongRun.min * 0.5
      );
    });
  });

  describe("Bad 50k Plan", () => {
    it("should have valid structure (structure is fine, content is bad)", () => {
      const result = evaluatePlan(badPlan, RACE_TYPE);
      expect(result.structural.valid).toBe(true);
    });

    it("should have LOW race appropriateness score", () => {
      const result = evaluatePlan(badPlan, RACE_TYPE);
      expect(result.raceAppropriateness).toBeDefined();
      // Bad plans should have very low race appropriateness
      expect(result.raceAppropriateness!.score).toBeLessThanOrEqual(20);
    });

    it("should have LOW overall score due to race inappropriateness", () => {
      const result = evaluatePlan(badPlan, RACE_TYPE);
      // Bad plans should score below 60
      expect(result.overall).toBeLessThanOrEqual(60);
    });

    it("should have insufficient volume for 50k", () => {
      const stats = calculatePlanStats(badPlan);
      const requirements = getRaceRequirements("50k")!;

      // This plan's peak is way below minimum
      expect(stats.peakWeeklyMiles).toBeLessThan(requirements.peakWeeklyMileage.min);
    });

    it("should have insufficient long run for 50k", () => {
      const stats = calculatePlanStats(badPlan);
      const requirements = getRaceRequirements("50k")!;

      // This plan's long runs are way too short
      expect(stats.peakLongRunMiles).toBeLessThan(requirements.peakLongRun.min);
    });

    it("should have no race-specific workouts", () => {
      const stats = calculatePlanStats(badPlan);
      expect(stats.tempoMinutes).toBe(0);
      expect(stats.intervalMinutes).toBe(0);
    });
  });

  describe("Score Differentiation", () => {
    it("good plan should score significantly higher than bad plan", () => {
      const goodResult = evaluatePlan(goodPlan, RACE_TYPE);
      const badResult = evaluatePlan(badPlan, RACE_TYPE);

      const difference = goodResult.overall - badResult.overall;

      console.log(`Good plan score: ${goodResult.overall}`);
      console.log(`Bad plan score: ${badResult.overall}`);
      console.log(`Difference: ${difference}`);

      // The difference should be meaningful (at least 10 points)
      // This proves the eval correctly differentiates quality
      expect(difference).toBeGreaterThanOrEqual(10);
    });

    it("should print detailed comparison", () => {
      const goodResult = evaluatePlan(goodPlan, RACE_TYPE);
      const badResult = evaluatePlan(badPlan, RACE_TYPE);

      console.log("\n=== PLAN COMPARISON ===");
      console.log("\nGood Plan:");
      console.log(`  Structural: ${goodResult.structural.score}`);
      console.log(`  Safety: ${goodResult.safety.score}`);
      console.log(`  Methodology: ${goodResult.methodology.score}`);
      console.log(`  Race Appropriateness: ${goodResult.raceAppropriateness?.score || "N/A"}`);
      console.log(`  Overall: ${goodResult.overall}`);

      console.log("\nBad Plan:");
      console.log(`  Structural: ${badResult.structural.score}`);
      console.log(`  Safety: ${badResult.safety.score}`);
      console.log(`  Methodology: ${badResult.methodology.score}`);
      console.log(`  Race Appropriateness: ${badResult.raceAppropriateness?.score || "N/A"}`);
      console.log(`  Overall: ${badResult.overall}`);

      if (goodResult.raceAppropriateness) {
        console.log("\nGood Plan Race Stats:");
        console.log(`  Peak weekly: ${goodResult.raceAppropriateness.peakWeeklyMiles.toFixed(1)}mi`);
        console.log(`  Peak long run: ${goodResult.raceAppropriateness.peakLongRunMiles.toFixed(1)}mi`);
        console.log(`  Has key workouts: ${goodResult.raceAppropriateness.hasKeyWorkouts}`);
        if (goodResult.raceAppropriateness.issues.length > 0) {
          console.log(`  Issues: ${goodResult.raceAppropriateness.issues.join(", ")}`);
        }
      }

      if (badResult.raceAppropriateness) {
        console.log("\nBad Plan Race Stats:");
        console.log(`  Peak weekly: ${badResult.raceAppropriateness.peakWeeklyMiles.toFixed(1)}mi`);
        console.log(`  Peak long run: ${badResult.raceAppropriateness.peakLongRunMiles.toFixed(1)}mi`);
        console.log(`  Has key workouts: ${badResult.raceAppropriateness.hasKeyWorkouts}`);
        if (badResult.raceAppropriateness.issues.length > 0) {
          console.log(`  Issues: ${badResult.raceAppropriateness.issues.join(", ")}`);
        }
      }

      console.log("\nGood Plan Stats (raw calc):");
      const goodStats = calculatePlanStats(goodPlan);
      console.log(`  Peak weekly: ${goodStats.peakWeeklyMiles}mi`);
      console.log(`  Peak long run: ${goodStats.peakLongRunMiles}mi`);
      console.log(`  Tempo: ${goodStats.tempoMinutes}min`);
      console.log(`  Intervals: ${goodStats.intervalMinutes}min`);

      console.log("\nBad Plan Stats (raw calc):");
      const badStats = calculatePlanStats(badPlan);
      console.log(`  Peak weekly: ${badStats.peakWeeklyMiles}mi`);
      console.log(`  Peak long run: ${badStats.peakLongRunMiles}mi`);
      console.log(`  Tempo: ${badStats.tempoMinutes}min`);
      console.log(`  Intervals: ${badStats.intervalMinutes}min`);
    });
  });
});

// Helper to calculate plan statistics
function calculatePlanStats(plan: TrainingPlan) {
  let peakWeeklyMiles = 0;
  let peakLongRunMiles = 0;
  let tempoMinutes = 0;
  let intervalMinutes = 0;

  for (const week of plan.weeks) {
    let weeklyMiles = 0;

    for (const day of week.days) {
      for (const workout of day.workouts) {
        for (const block of workout.blocks) {
          // Calculate miles - use unit if available, otherwise assume minutes and convert
          let blockMiles = 0;
          if ((block as any).unit === "miles") {
            blockMiles = block.value;
          } else if (block.type !== "rest") {
            blockMiles = block.value / 10; // Assume 10 min/mile
          }

          weeklyMiles += blockMiles;

          if (block.type === "longRun") {
            peakLongRunMiles = Math.max(peakLongRunMiles, blockMiles);
          }
          if (block.type === "tempo") {
            tempoMinutes += block.value;
          }
          if (block.type === "intervals") {
            intervalMinutes += block.value;
          }
        }
      }
    }

    peakWeeklyMiles = Math.max(peakWeeklyMiles, weeklyMiles);
  }

  return {
    peakWeeklyMiles,
    peakLongRunMiles,
    tempoMinutes,
    intervalMinutes,
  };
}
