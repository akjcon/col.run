/**
 * Plan Quality Evaluation Framework
 *
 * Evaluates training plans against:
 * 1. Structural validity - correct schema, all weeks present, etc.
 * 2. Safety rules - volume progression, recovery placement, etc.
 * 3. Methodology alignment - 80/20 polarization, proper periodization, etc.
 */

import type { TrainingPlan, WeekPlan, Workout } from "./types";

// =============================================================================
// V2 Block Types (for future use, evaluation supports both V1 and V2)
// =============================================================================

export type BlockType =
  | "warmUp"
  | "intervals"
  | "recovery"
  | "rest"
  | "coolDown"
  | "tempo"
  | "longRun"
  | "easy";

export type EffortLevel = "z1" | "z2" | "z3" | "z4" | "z5";

export interface Block {
  type: BlockType;
  value: number; // Distance (miles) OR time (minutes)
  effortLevel: EffortLevel;
}

export interface DayV2 {
  dayOfWeek: string;
  date?: number;
  blocks: Block[];
}

export interface WeekV2 {
  weekNumber: number;
  phase: string;
  days: DayV2[];
}

export interface TrainingPlanV2 {
  id: string;
  userId: string;
  totalWeeks: number;
  weeks: WeekV2[];
  startDate?: number;
  generatedAt?: number;
}

// =============================================================================
// Evaluation Result Types
// =============================================================================

export interface StructuralError {
  code: string;
  message: string;
  weekNumber?: number;
  dayIndex?: number;
}

export interface StructuralResult {
  valid: boolean;
  score: number; // 0-100
  errors: StructuralError[];
  warnings: string[];
}

export interface SafetyViolation {
  rule: string;
  severity: "critical" | "major" | "minor";
  message: string;
  weekNumber?: number;
  details?: string;
}

export interface SafetyResult {
  safe: boolean;
  score: number; // 0-100
  violations: SafetyViolation[];
}

export interface MethodologyScores {
  polarization: number; // 0-100, how close to 80/20
  periodization: number; // 0-100, proper phase structure
  specificity: number; // 0-100, race-specific preparation
  progression: number; // 0-100, logical volume/intensity buildup
}

export interface MethodologyResult {
  score: number; // 0-100, weighted average
  breakdown: MethodologyScores;
  issues: string[];
}

export interface PlanEvaluation {
  structural: StructuralResult;
  safety: SafetyResult;
  methodology: MethodologyResult;
  overall: number; // 0-100, weighted average
}

// =============================================================================
// Structural Validation
// =============================================================================

/**
 * Validates the structural integrity of a training plan
 */
export function validateStructure(plan: TrainingPlan): StructuralResult {
  const errors: StructuralError[] = [];
  const warnings: string[] = [];

  // Check required top-level fields
  if (!plan.id) {
    errors.push({ code: "MISSING_ID", message: "Plan is missing id" });
  }
  if (!plan.userId) {
    errors.push({ code: "MISSING_USER_ID", message: "Plan is missing userId" });
  }
  if (!plan.totalWeeks || plan.totalWeeks < 1) {
    errors.push({
      code: "INVALID_TOTAL_WEEKS",
      message: `Invalid totalWeeks: ${plan.totalWeeks}`,
    });
  }
  if (plan.totalWeeks > 52) {
    warnings.push(`Plan has ${plan.totalWeeks} weeks, which is unusually long`);
  }

  // Check weeks array
  if (!plan.weeks || !Array.isArray(plan.weeks)) {
    errors.push({ code: "MISSING_WEEKS", message: "Plan is missing weeks array" });
    return { valid: false, score: 0, errors, warnings };
  }

  // Check week count matches totalWeeks
  if (plan.weeks.length !== plan.totalWeeks) {
    errors.push({
      code: "WEEK_COUNT_MISMATCH",
      message: `Plan has ${plan.weeks.length} weeks but totalWeeks is ${plan.totalWeeks}`,
    });
  }

  // Check each week
  const seenWeekNumbers = new Set<number>();
  for (let i = 0; i < plan.weeks.length; i++) {
    const week = plan.weeks[i];

    // Check week number is sequential
    const expectedWeekNumber = i + 1;
    if (week.weekNumber !== expectedWeekNumber) {
      errors.push({
        code: "WEEK_NUMBER_MISMATCH",
        message: `Week at index ${i} has weekNumber ${week.weekNumber}, expected ${expectedWeekNumber}`,
        weekNumber: week.weekNumber,
      });
    }

    // Check for duplicate week numbers
    if (seenWeekNumbers.has(week.weekNumber)) {
      errors.push({
        code: "DUPLICATE_WEEK_NUMBER",
        message: `Duplicate week number: ${week.weekNumber}`,
        weekNumber: week.weekNumber,
      });
    }
    seenWeekNumbers.add(week.weekNumber);

    // Check week has phase
    if (!week.phase) {
      errors.push({
        code: "MISSING_PHASE",
        message: `Week ${week.weekNumber} is missing phase`,
        weekNumber: week.weekNumber,
      });
    }

    // Check workouts array
    if (!week.workouts || !Array.isArray(week.workouts)) {
      errors.push({
        code: "MISSING_WORKOUTS",
        message: `Week ${week.weekNumber} is missing workouts array`,
        weekNumber: week.weekNumber,
      });
      continue;
    }

    // Check workout count (should be 7 for a full week)
    if (week.workouts.length !== 7) {
      errors.push({
        code: "INVALID_WORKOUT_COUNT",
        message: `Week ${week.weekNumber} has ${week.workouts.length} workouts, expected 7`,
        weekNumber: week.weekNumber,
      });
    }

    // Check each workout has required fields
    for (let j = 0; j < week.workouts.length; j++) {
      const workout = week.workouts[j];
      if (!workout.day) {
        errors.push({
          code: "MISSING_WORKOUT_DAY",
          message: `Week ${week.weekNumber}, workout ${j} is missing day`,
          weekNumber: week.weekNumber,
          dayIndex: j,
        });
      }
      if (!workout.type) {
        errors.push({
          code: "MISSING_WORKOUT_TYPE",
          message: `Week ${week.weekNumber}, ${workout.day || `workout ${j}`} is missing type`,
          weekNumber: week.weekNumber,
          dayIndex: j,
        });
      }
    }
  }

  // Calculate score: 100 - (errors * 10), min 0
  const score = Math.max(0, 100 - errors.length * 10);

  return {
    valid: errors.length === 0,
    score,
    errors,
    warnings,
  };
}

// =============================================================================
// Safety Rules Validation
// =============================================================================

// Workout types considered "hard" (high intensity)
const HARD_WORKOUT_PATTERNS = [
  /interval/i,
  /tempo/i,
  /threshold/i,
  /speed/i,
  /race.?pace/i,
  /vo2/i,
  /hill.?repeat/i,
  /fartlek/i,
  /zone.?[45]/i,
];

// Workout types considered "easy" or rest
const EASY_WORKOUT_PATTERNS = [
  /rest/i,
  /recovery/i,
  /easy/i,
  /zone.?[12]/i,
  /active.?recovery/i,
  /off/i,
];

function isHardWorkout(workout: Workout): boolean {
  const text = `${workout.type} ${workout.zone} ${workout.description}`;
  return HARD_WORKOUT_PATTERNS.some((pattern) => pattern.test(text));
}

function isRestOrEasy(workout: Workout): boolean {
  const text = `${workout.type} ${workout.zone} ${workout.description}`;
  return EASY_WORKOUT_PATTERNS.some((pattern) => pattern.test(text));
}

function parseWeeklyMiles(targetMiles: string): number {
  // Handle formats like "35-40", "35", "~40"
  const match = targetMiles.match(/(\d+(?:\.\d+)?)/g);
  if (!match) return 0;
  // If range, take the max
  const numbers = match.map(Number);
  return Math.max(...numbers);
}

/**
 * Checks safety rules for a training plan
 */
export function checkSafetyRules(plan: TrainingPlan): SafetyResult {
  const violations: SafetyViolation[] = [];

  // Rule 1: Volume progression (max 10% week-over-week increase)
  const MAX_VOLUME_INCREASE = 0.10;

  // Helper to check if a week is recovery/taper
  const isRecoveryWeek = (week: WeekPlan) =>
    week.phase.toLowerCase().includes("recovery") ||
    week.phase.toLowerCase().includes("taper") ||
    week.phase.toLowerCase().includes("rest");

  // Track last non-recovery week for comparison
  let lastNonRecoveryMiles = 0;
  let lastNonRecoveryWeekNum = 0;

  for (let i = 0; i < plan.weeks.length; i++) {
    const currWeek = plan.weeks[i];
    const currMiles = parseWeeklyMiles(currWeek.targetMiles);

    // Skip recovery weeks for the progression check
    if (isRecoveryWeek(currWeek)) {
      continue;
    }

    // Compare to last non-recovery week (not just the previous week)
    if (lastNonRecoveryMiles > 0 && currMiles > lastNonRecoveryMiles) {
      const increase = (currMiles - lastNonRecoveryMiles) / lastNonRecoveryMiles;
      if (increase > MAX_VOLUME_INCREASE) {
        violations.push({
          rule: "VOLUME_PROGRESSION_LIMIT",
          severity: increase > 0.15 ? "critical" : "major",
          message: `Volume increase of ${(increase * 100).toFixed(1)}% from week ${lastNonRecoveryWeekNum} to ${currWeek.weekNumber} exceeds ${MAX_VOLUME_INCREASE * 100}% limit`,
          weekNumber: currWeek.weekNumber,
          details: `${lastNonRecoveryMiles} mi → ${currMiles} mi`,
        });
      }
    }

    // Update tracking for next iteration
    lastNonRecoveryMiles = currMiles;
    lastNonRecoveryWeekNum = currWeek.weekNumber;
  }

  // Rule 2: Recovery week placement (every 3-4 weeks)
  const MAX_WEEKS_WITHOUT_RECOVERY = 4;
  let weeksSinceRecovery = 0;
  for (const week of plan.weeks) {
    const isRecovery =
      week.phase.toLowerCase().includes("recovery") ||
      week.phase.toLowerCase().includes("rest");

    if (isRecovery) {
      weeksSinceRecovery = 0;
    } else {
      weeksSinceRecovery++;
      if (weeksSinceRecovery > MAX_WEEKS_WITHOUT_RECOVERY) {
        violations.push({
          rule: "RECOVERY_WEEK_FREQUENCY",
          severity: "major",
          message: `${weeksSinceRecovery} consecutive training weeks without recovery`,
          weekNumber: week.weekNumber,
        });
      }
    }
  }

  // Rule 3: No consecutive hard days
  for (const week of plan.weeks) {
    let consecutiveHardDays = 0;
    for (const workout of week.workouts) {
      if (isHardWorkout(workout)) {
        consecutiveHardDays++;
        if (consecutiveHardDays >= 2) {
          violations.push({
            rule: "CONSECUTIVE_HARD_DAYS",
            severity: "major",
            message: `Consecutive hard workouts detected on ${workout.day}`,
            weekNumber: week.weekNumber,
            details: `${consecutiveHardDays} hard days in a row`,
          });
        }
      } else {
        consecutiveHardDays = 0;
      }
    }
  }

  // Rule 4: At least one rest day per week
  for (const week of plan.weeks) {
    const hasRestDay = week.workouts.some(
      (w) => w.type.toLowerCase().includes("rest") || w.type.toLowerCase() === "off"
    );
    if (!hasRestDay) {
      violations.push({
        rule: "NO_REST_DAY",
        severity: "major",
        message: `Week ${week.weekNumber} has no rest day`,
        weekNumber: week.weekNumber,
      });
    }
  }

  // Rule 5: Taper before race (last 1-3 weeks should show volume reduction)
  if (plan.weeks.length >= 4) {
    const lastWeek = plan.weeks[plan.weeks.length - 1];
    const secondLastWeek = plan.weeks[plan.weeks.length - 2];
    const peakWeekMiles = Math.max(...plan.weeks.map((w) => parseWeeklyMiles(w.targetMiles)));
    const lastWeekMiles = parseWeeklyMiles(lastWeek.targetMiles);

    // Race week should be significantly less than peak
    if (peakWeekMiles > 0 && lastWeekMiles > 0) {
      const reduction = 1 - lastWeekMiles / peakWeekMiles;
      if (reduction < 0.3) {
        violations.push({
          rule: "INSUFFICIENT_TAPER",
          severity: "minor",
          message: `Race week volume (${lastWeekMiles} mi) is only ${(reduction * 100).toFixed(0)}% less than peak (${peakWeekMiles} mi); recommend 30-50% reduction`,
          weekNumber: lastWeek.weekNumber,
        });
      }
    }
  }

  // Calculate score
  const criticalCount = violations.filter((v) => v.severity === "critical").length;
  const majorCount = violations.filter((v) => v.severity === "major").length;
  const minorCount = violations.filter((v) => v.severity === "minor").length;
  const score = Math.max(0, 100 - criticalCount * 30 - majorCount * 15 - minorCount * 5);

  return {
    safe: violations.filter((v) => v.severity !== "minor").length === 0,
    score,
    violations,
  };
}

// =============================================================================
// Methodology Alignment
// =============================================================================

/**
 * Scores how well the plan follows training methodology
 */
export function scoreMethodology(plan: TrainingPlan): MethodologyResult {
  const issues: string[] = [];

  // 1. Polarization Score (80/20 distribution)
  let easyMinutes = 0;
  let hardMinutes = 0;

  for (const week of plan.weeks) {
    for (const workout of week.workouts) {
      // Estimate duration from description (crude but works for V1)
      const durationMatch = workout.description?.match(/(\d+)(?:-(\d+))?\s*(?:min|minutes)/i);
      let duration = 45; // default assumption
      if (durationMatch) {
        duration = durationMatch[2] ? parseInt(durationMatch[2]) : parseInt(durationMatch[1]);
      }

      if (isRestOrEasy(workout)) {
        easyMinutes += duration;
      } else if (isHardWorkout(workout)) {
        hardMinutes += duration;
      } else {
        // Long runs are typically 80% easy, 20% hard
        if (workout.type.toLowerCase().includes("long")) {
          easyMinutes += duration * 0.8;
          hardMinutes += duration * 0.2;
        } else {
          // Default to easy for unclassified
          easyMinutes += duration;
        }
      }
    }
  }

  const totalMinutes = easyMinutes + hardMinutes;
  const easyPercent = totalMinutes > 0 ? easyMinutes / totalMinutes : 0;
  const targetEasy = 0.8;
  const deviation = Math.abs(easyPercent - targetEasy);

  let polarizationScore: number;
  if (deviation <= 0.05) {
    polarizationScore = 100;
  } else if (deviation <= 0.1) {
    polarizationScore = 85;
  } else if (deviation <= 0.15) {
    polarizationScore = 70;
  } else if (deviation <= 0.2) {
    polarizationScore = 55;
  } else {
    polarizationScore = 40;
  }

  if (polarizationScore < 70) {
    issues.push(
      `Training distribution is ${(easyPercent * 100).toFixed(0)}% easy / ${((1 - easyPercent) * 100).toFixed(0)}% hard; target is 80/20`
    );
  }

  // 2. Periodization Score (proper phase structure)
  let periodizationScore = 100;
  const phases = plan.weeks.map((w) => w.phase.toLowerCase());
  const uniquePhases = [...new Set(phases)];

  if (uniquePhases.length < 2) {
    periodizationScore -= 30;
    issues.push("Plan has less than 2 distinct phases");
  }

  // Check phase ordering (base should come before build, build before peak)
  const phaseOrder = ["base", "build", "peak", "taper"];
  let lastPhaseIndex = -1;
  for (const week of plan.weeks) {
    const phase = week.phase.toLowerCase();
    const phaseIndex = phaseOrder.findIndex((p) => phase.includes(p));
    if (phaseIndex !== -1) {
      if (phaseIndex < lastPhaseIndex) {
        periodizationScore -= 20;
        issues.push(`Phase ordering issue: ${week.phase} appears after a later phase`);
        break;
      }
      lastPhaseIndex = Math.max(lastPhaseIndex, phaseIndex);
    }
  }

  // Check for taper at the end
  const lastPhase = phases[phases.length - 1] || "";
  if (!lastPhase.includes("taper") && !lastPhase.includes("race")) {
    periodizationScore -= 15;
    issues.push("Plan does not end with a taper phase");
  }

  // 3. Specificity Score (race-specific preparation in later phases)
  let specificityScore = 100;

  // For longer plans, should have race-pace work in peak phase
  if (plan.weeks.length >= 8) {
    const peakWeeks = plan.weeks.filter((w) => w.phase.toLowerCase().includes("peak"));
    const hasRacePaceWork = peakWeeks.some((week) =>
      week.workouts.some(
        (w) =>
          w.type.toLowerCase().includes("race") ||
          w.description?.toLowerCase().includes("race pace")
      )
    );

    if (!hasRacePaceWork && peakWeeks.length > 0) {
      specificityScore -= 25;
      issues.push("No race-pace workouts found in peak phase");
    }
  }

  // 4. Progression Score (logical buildup)
  let progressionScore = 100;

  // Check that volume generally increases through base/build phases
  const nonTaperWeeks = plan.weeks.filter(
    (w) => !w.phase.toLowerCase().includes("taper") && !w.phase.toLowerCase().includes("recovery")
  );

  if (nonTaperWeeks.length >= 4) {
    const firstHalfAvg =
      nonTaperWeeks
        .slice(0, Math.floor(nonTaperWeeks.length / 2))
        .reduce((sum, w) => sum + parseWeeklyMiles(w.targetMiles), 0) /
      Math.floor(nonTaperWeeks.length / 2);

    const secondHalfAvg =
      nonTaperWeeks
        .slice(Math.floor(nonTaperWeeks.length / 2))
        .reduce((sum, w) => sum + parseWeeklyMiles(w.targetMiles), 0) /
      (nonTaperWeeks.length - Math.floor(nonTaperWeeks.length / 2));

    if (secondHalfAvg < firstHalfAvg) {
      progressionScore -= 30;
      issues.push("Volume decreases from first half to second half of training (excluding taper)");
    }
  }

  // Calculate overall methodology score (weighted average)
  const overallScore =
    polarizationScore * 0.3 +
    periodizationScore * 0.3 +
    specificityScore * 0.2 +
    progressionScore * 0.2;

  return {
    score: Math.round(overallScore),
    breakdown: {
      polarization: polarizationScore,
      periodization: periodizationScore,
      specificity: specificityScore,
      progression: progressionScore,
    },
    issues,
  };
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

/**
 * Evaluates a training plan across all dimensions
 */
export function evaluatePlan(plan: TrainingPlan): PlanEvaluation {
  const structural = validateStructure(plan);
  const safety = checkSafetyRules(plan);
  const methodology = scoreMethodology(plan);

  // Overall score: weighted average with structural as gate
  // If structural is invalid, cap overall at 50
  let overall: number;
  if (!structural.valid) {
    overall = Math.min(50, structural.score * 0.5 + safety.score * 0.25 + methodology.score * 0.25);
  } else {
    overall = structural.score * 0.2 + safety.score * 0.4 + methodology.score * 0.4;
  }

  return {
    structural,
    safety,
    methodology,
    overall: Math.round(overall),
  };
}

// =============================================================================
// V2 Block Validation (for future use)
// =============================================================================

const VALID_BLOCK_TYPES: BlockType[] = [
  "warmUp",
  "intervals",
  "recovery",
  "rest",
  "coolDown",
  "tempo",
  "longRun",
  "easy",
];

const VALID_EFFORT_LEVELS: EffortLevel[] = ["z1", "z2", "z3", "z4", "z5"];

/**
 * Validates a single workout block
 */
export function validateBlock(block: Block): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!VALID_BLOCK_TYPES.includes(block.type)) {
    errors.push(`Invalid block type: ${block.type}`);
  }

  if (typeof block.value !== "number" || block.value < 0) {
    errors.push(`Invalid block value: ${block.value}`);
  }

  if (block.type !== "rest" && block.value <= 0) {
    errors.push(`Non-rest block must have value > 0`);
  }

  if (!VALID_EFFORT_LEVELS.includes(block.effortLevel)) {
    errors.push(`Invalid effort level: ${block.effortLevel}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculates total value (duration/distance) for a day
 */
export function calculateDayTotal(day: DayV2): number {
  return day.blocks.reduce((sum, block) => sum + block.value, 0);
}

/**
 * Calculates weighted average effort level for a day
 */
export function calculateDayEffort(day: DayV2): number {
  const effortMap: Record<EffortLevel, number> = {
    z1: 1,
    z2: 2,
    z3: 3,
    z4: 4,
    z5: 5,
  };

  const totalValue = calculateDayTotal(day);
  if (totalValue === 0) return 0;

  const weightedSum = day.blocks.reduce(
    (sum, block) => sum + effortMap[block.effortLevel] * block.value,
    0
  );

  return weightedSum / totalValue;
}

/**
 * Calculates weekly totals from a V2 week
 */
export function calculateWeekTotals(week: WeekV2): {
  totalValue: number;
  avgEffort: number;
  blockCounts: Record<BlockType, number>;
} {
  const blockCounts: Record<BlockType, number> = {
    warmUp: 0,
    intervals: 0,
    recovery: 0,
    rest: 0,
    coolDown: 0,
    tempo: 0,
    longRun: 0,
    easy: 0,
  };

  let totalValue = 0;
  let weightedEffortSum = 0;

  for (const day of week.days) {
    for (const block of day.blocks) {
      blockCounts[block.type]++;
      totalValue += block.value;
      const effortMap: Record<EffortLevel, number> = { z1: 1, z2: 2, z3: 3, z4: 4, z5: 5 };
      weightedEffortSum += effortMap[block.effortLevel] * block.value;
    }
  }

  return {
    totalValue,
    avgEffort: totalValue > 0 ? weightedEffortSum / totalValue : 0,
    blockCounts,
  };
}
