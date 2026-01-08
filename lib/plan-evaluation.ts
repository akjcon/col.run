/**
 * Plan Quality Evaluation Framework (V2)
 *
 * Hierarchy: TrainingPlan → Week → Day → Workout → Block[]
 *
 * Evaluates training plans against:
 * 1. Structural validity - correct schema, all weeks present, etc.
 * 2. Safety rules - volume progression, recovery placement, etc.
 * 3. Methodology alignment - 80/20 polarization, proper periodization, etc.
 */

// =============================================================================
// V2 Types: TrainingPlan → Week → Day → Workout → Block[]
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
  value: number; // Duration in minutes
  effortLevel: EffortLevel;
}

export interface Workout {
  blocks: Block[];
}

export interface Day {
  dayOfWeek: string;
  date?: number;
  workouts: Workout[]; // Usually 1, but can be multiple (AM/PM)
}

export interface Week {
  weekNumber: number;
  phase: string;
  days: Day[];
}

export interface TrainingPlan {
  id: string;
  userId: string;
  totalWeeks: number;
  weeks: Week[];
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
// Block Helpers
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

// Block types that are considered "hard" (high intensity)
const HARD_BLOCK_TYPES: BlockType[] = ["intervals", "tempo"];

// Block types that are considered "easy"
const EASY_BLOCK_TYPES: BlockType[] = ["warmUp", "recovery", "coolDown", "easy", "longRun"];

// Effort levels that are considered "hard"
const HARD_EFFORT_LEVELS: EffortLevel[] = ["z4", "z5"];

function isHardBlock(block: Block): boolean {
  return HARD_BLOCK_TYPES.includes(block.type) || HARD_EFFORT_LEVELS.includes(block.effortLevel);
}

function isEasyBlock(block: Block): boolean {
  return EASY_BLOCK_TYPES.includes(block.type) && !HARD_EFFORT_LEVELS.includes(block.effortLevel);
}

function isRestBlock(block: Block): boolean {
  return block.type === "rest";
}

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
 * Calculates total minutes for a day (across all workouts)
 */
export function calculateDayTotal(day: Day): number {
  return day.workouts.reduce(
    (daySum, workout) => daySum + workout.blocks.reduce((sum, block) => sum + block.value, 0),
    0
  );
}

/**
 * Calculates total minutes for a week
 */
export function calculateWeekTotal(week: Week): number {
  return week.days.reduce((sum, day) => sum + calculateDayTotal(day), 0);
}

/**
 * Gets all blocks from a week (flattened)
 */
function getAllBlocks(week: Week): Block[] {
  return week.days.flatMap((day) => day.workouts.flatMap((workout) => workout.blocks));
}

/**
 * Checks if a day is a rest day (only rest blocks or no workouts)
 */
function isRestDay(day: Day): boolean {
  if (day.workouts.length === 0) return true;
  const allBlocks = day.workouts.flatMap((w) => w.blocks);
  return allBlocks.length === 0 || allBlocks.every((b) => isRestBlock(b));
}

/**
 * Checks if a day has hard workout(s)
 */
function isHardDay(day: Day): boolean {
  return day.workouts.some((workout) => workout.blocks.some((block) => isHardBlock(block)));
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

    // Check days array
    if (!week.days || !Array.isArray(week.days)) {
      errors.push({
        code: "MISSING_DAYS",
        message: `Week ${week.weekNumber} is missing days array`,
        weekNumber: week.weekNumber,
      });
      continue;
    }

    // Check day count (should be 7 for a full week)
    if (week.days.length !== 7) {
      errors.push({
        code: "INVALID_DAY_COUNT",
        message: `Week ${week.weekNumber} has ${week.days.length} days, expected 7`,
        weekNumber: week.weekNumber,
      });
    }

    // Check each day has required fields
    for (let j = 0; j < week.days.length; j++) {
      const day = week.days[j];
      if (!day.dayOfWeek) {
        errors.push({
          code: "MISSING_DAY_OF_WEEK",
          message: `Week ${week.weekNumber}, day ${j} is missing dayOfWeek`,
          weekNumber: week.weekNumber,
          dayIndex: j,
        });
      }
      if (!day.workouts || !Array.isArray(day.workouts)) {
        errors.push({
          code: "MISSING_WORKOUTS",
          message: `Week ${week.weekNumber}, ${day.dayOfWeek || `day ${j}`} is missing workouts array`,
          weekNumber: week.weekNumber,
          dayIndex: j,
        });
      }

      // Check each workout has blocks
      for (let k = 0; k < (day.workouts || []).length; k++) {
        const workout = day.workouts[k];
        if (!workout.blocks || !Array.isArray(workout.blocks)) {
          errors.push({
            code: "MISSING_BLOCKS",
            message: `Week ${week.weekNumber}, ${day.dayOfWeek}, workout ${k} is missing blocks array`,
            weekNumber: week.weekNumber,
            dayIndex: j,
          });
        }

        // Validate each block
        for (const block of workout.blocks || []) {
          const blockResult = validateBlock(block);
          if (!blockResult.valid) {
            errors.push({
              code: "INVALID_BLOCK",
              message: `Week ${week.weekNumber}, ${day.dayOfWeek}: ${blockResult.errors.join(", ")}`,
              weekNumber: week.weekNumber,
              dayIndex: j,
            });
          }
        }
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

/**
 * Checks safety rules for a training plan
 */
export function checkSafetyRules(plan: TrainingPlan): SafetyResult {
  const violations: SafetyViolation[] = [];

  // Rule 1: Volume progression (max 10% week-over-week increase)
  const MAX_VOLUME_INCREASE = 0.1;

  // Helper to check if a week is recovery/taper
  const isRecoveryWeek = (week: Week) =>
    week.phase.toLowerCase().includes("recovery") ||
    week.phase.toLowerCase().includes("taper") ||
    week.phase.toLowerCase().includes("rest");

  // Track last non-recovery week for comparison
  let lastNonRecoveryMinutes = 0;
  let lastNonRecoveryWeekNum = 0;

  for (let i = 0; i < plan.weeks.length; i++) {
    const currWeek = plan.weeks[i];
    const currMinutes = calculateWeekTotal(currWeek);

    // Skip recovery weeks for the progression check
    if (isRecoveryWeek(currWeek)) {
      continue;
    }

    // Compare to last non-recovery week (not just the previous week)
    if (lastNonRecoveryMinutes > 0 && currMinutes > lastNonRecoveryMinutes) {
      const increase = (currMinutes - lastNonRecoveryMinutes) / lastNonRecoveryMinutes;
      if (increase > MAX_VOLUME_INCREASE) {
        violations.push({
          rule: "VOLUME_PROGRESSION_LIMIT",
          severity: increase > 0.15 ? "critical" : "major",
          message: `Volume increase of ${(increase * 100).toFixed(1)}% from week ${lastNonRecoveryWeekNum} to ${currWeek.weekNumber} exceeds ${MAX_VOLUME_INCREASE * 100}% limit`,
          weekNumber: currWeek.weekNumber,
          details: `${lastNonRecoveryMinutes} min → ${currMinutes} min`,
        });
      }
    }

    // Update tracking for next iteration
    lastNonRecoveryMinutes = currMinutes;
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
    for (const day of week.days) {
      if (isHardDay(day)) {
        consecutiveHardDays++;
        if (consecutiveHardDays >= 2) {
          violations.push({
            rule: "CONSECUTIVE_HARD_DAYS",
            severity: "major",
            message: `Consecutive hard workouts detected on ${day.dayOfWeek}`,
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
    const hasRestDay = week.days.some((day) => isRestDay(day));
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
    const peakWeekMinutes = Math.max(...plan.weeks.map((w) => calculateWeekTotal(w)));
    const lastWeekMinutes = calculateWeekTotal(lastWeek);

    // Race week should be significantly less than peak
    if (peakWeekMinutes > 0 && lastWeekMinutes > 0) {
      const reduction = 1 - lastWeekMinutes / peakWeekMinutes;
      if (reduction < 0.3) {
        violations.push({
          rule: "INSUFFICIENT_TAPER",
          severity: "minor",
          message: `Race week volume (${lastWeekMinutes} min) is only ${(reduction * 100).toFixed(0)}% less than peak (${peakWeekMinutes} min); recommend 30-50% reduction`,
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
    for (const block of getAllBlocks(week)) {
      if (isRestBlock(block)) {
        // Rest blocks don't count toward training time
        continue;
      } else if (isHardBlock(block)) {
        hardMinutes += block.value;
      } else if (isEasyBlock(block)) {
        easyMinutes += block.value;
      } else {
        // Default to easy for z3 (threshold between easy/hard)
        if (block.effortLevel === "z3") {
          // z3 is borderline - count as 50/50
          easyMinutes += block.value * 0.5;
          hardMinutes += block.value * 0.5;
        } else {
          easyMinutes += block.value;
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

  // For longer plans, should have race-pace work (tempo/intervals at z3-z4) in peak phase
  if (plan.weeks.length >= 8) {
    const peakWeeks = plan.weeks.filter((w) => w.phase.toLowerCase().includes("peak"));
    const hasRacePaceWork = peakWeeks.some((week) =>
      getAllBlocks(week).some(
        (block) =>
          (block.type === "tempo" || block.type === "intervals") &&
          (block.effortLevel === "z3" || block.effortLevel === "z4")
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
    (w) =>
      !w.phase.toLowerCase().includes("taper") && !w.phase.toLowerCase().includes("recovery")
  );

  if (nonTaperWeeks.length >= 4) {
    const firstHalfAvg =
      nonTaperWeeks
        .slice(0, Math.floor(nonTaperWeeks.length / 2))
        .reduce((sum, w) => sum + calculateWeekTotal(w), 0) /
      Math.floor(nonTaperWeeks.length / 2);

    const secondHalfAvg =
      nonTaperWeeks
        .slice(Math.floor(nonTaperWeeks.length / 2))
        .reduce((sum, w) => sum + calculateWeekTotal(w), 0) /
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
