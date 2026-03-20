/**
 * Plan Fixer
 *
 * Deterministic fixer that applies structured fixes from the reviewer.
 * Each fix type maps to a pure transform function — no LLM calls.
 */

import type { Week, Block, BlockType, BlockUnit, EffortLevel } from "@/lib/blocks";
import {
  blockValueToMiles,
  calculateWeekTotalMiles,
} from "@/lib/blocks/calculations";
import type { ReviewIssue, SuggestedFix } from "./types";

export interface FixApplicationResult {
  issueId: string;
  fixType: string;
  success: boolean;
  description: string;
}

export interface FixResult {
  applied: FixApplicationResult[];
  skipped: FixApplicationResult[];
  updatedWeeks: Week[];
}

/**
 * Apply all fixes from reviewer issues to the plan.
 * Processes in severity order: critical → major → minor.
 */
export function applyFixes(weeks: Week[], issues: ReviewIssue[]): FixResult {
  const applied: FixApplicationResult[] = [];
  const skipped: FixApplicationResult[] = [];

  // Deep clone to avoid mutating the original
  let updatedWeeks: Week[] = JSON.parse(JSON.stringify(weeks));

  // Sort by severity: critical first
  const severityOrder = { critical: 0, major: 1, minor: 2 };
  const fixableIssues = issues
    .filter((i) => i.suggestedFix !== null)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  for (const issue of fixableIssues) {
    const fix = issue.suggestedFix!;

    try {
      const result = applySingleFix(updatedWeeks, fix);
      if (result) {
        updatedWeeks = result.weeks;
        applied.push({
          issueId: issue.issueId,
          fixType: fix.type,
          success: true,
          description: result.description,
        });
      } else {
        skipped.push({
          issueId: issue.issueId,
          fixType: fix.type,
          success: false,
          description: "Fix could not be applied — target not found",
        });
      }
    } catch (err) {
      skipped.push({
        issueId: issue.issueId,
        fixType: fix.type,
        success: false,
        description: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { applied, skipped, updatedWeeks };
}

// =============================================================================
// Fix Handlers
// =============================================================================

function applySingleFix(
  weeks: Week[],
  fix: SuggestedFix
): { weeks: Week[]; description: string } | null {
  switch (fix.type) {
    case "adjust_week_volume":
      return applyAdjustWeekVolume(weeks, fix);
    case "swap_days":
      return applySwapDays(weeks, fix);
    case "remove_hard_workout":
      return applyRemoveHardWorkout(weeks, fix);
    case "reduce_block_value":
      return applyReduceBlockValue(weeks, fix);
    case "change_effort_level":
      return applyChangeEffortLevel(weeks, fix);
    default:
      return null;
  }
}

/**
 * Scale all non-rest blocks in a week proportionally to hit a target mileage.
 */
function applyAdjustWeekVolume(
  weeks: Week[],
  fix: { type: "adjust_week_volume"; weekNumber: number; targetMiles: number }
): { weeks: Week[]; description: string } | null {
  const weekIndex = weeks.findIndex((w) => w.weekNumber === fix.weekNumber);
  if (weekIndex === -1) return null;

  const week = weeks[weekIndex];
  const currentMiles = calculateWeekTotalMiles(week);

  if (currentMiles <= 0) return null;

  const scale = fix.targetMiles / currentMiles;

  const updatedWeek: Week = {
    ...week,
    days: week.days.map((day) => ({
      ...day,
      workouts: day.workouts.map((workout) => ({
        blocks: workout.blocks.map((block) => {
          if (block.type === "rest") return block;

          const newValue =
            block.unit === "miles"
              ? Math.max(1, Math.round(block.value * scale))
              : Math.max(5, Math.round((block.value * scale) / 5) * 5);

          return { ...block, value: newValue };
        }),
      })),
    })),
  };

  const newWeeks = [...weeks];
  newWeeks[weekIndex] = updatedWeek;

  return {
    weeks: newWeeks,
    description: `Week ${fix.weekNumber}: scaled volume from ${currentMiles.toFixed(0)}mi to ~${fix.targetMiles}mi`,
  };
}

/**
 * Swap two days within a week.
 */
function applySwapDays(
  weeks: Week[],
  fix: { type: "swap_days"; weekNumber: number; day1: string; day2: string }
): { weeks: Week[]; description: string } | null {
  const weekIndex = weeks.findIndex((w) => w.weekNumber === fix.weekNumber);
  if (weekIndex === -1) return null;

  const week = weeks[weekIndex];
  const day1Index = week.days.findIndex((d) => d.dayOfWeek === fix.day1);
  const day2Index = week.days.findIndex((d) => d.dayOfWeek === fix.day2);

  if (day1Index === -1 || day2Index === -1) return null;

  const updatedDays = [...week.days];
  // Swap workouts but keep dayOfWeek labels in place
  const temp = updatedDays[day1Index].workouts;
  updatedDays[day1Index] = { ...updatedDays[day1Index], workouts: updatedDays[day2Index].workouts };
  updatedDays[day2Index] = { ...updatedDays[day2Index], workouts: temp };

  const newWeeks = [...weeks];
  newWeeks[weekIndex] = { ...week, days: updatedDays };

  return {
    weeks: newWeeks,
    description: `Week ${fix.weekNumber}: swapped ${fix.day1} ↔ ${fix.day2}`,
  };
}

/**
 * Replace a hard workout on a specific day with an easy run of equivalent distance.
 */
function applyRemoveHardWorkout(
  weeks: Week[],
  fix: { type: "remove_hard_workout"; weekNumber: number; dayOfWeek: string }
): { weeks: Week[]; description: string } | null {
  const weekIndex = weeks.findIndex((w) => w.weekNumber === fix.weekNumber);
  if (weekIndex === -1) return null;

  const week = weeks[weekIndex];
  const dayIndex = week.days.findIndex((d) => d.dayOfWeek === fix.dayOfWeek);
  if (dayIndex === -1) return null;

  const day = week.days[dayIndex];

  // Calculate total miles for the day to preserve volume
  const totalMiles = day.workouts.reduce(
    (sum, w) => sum + w.blocks.reduce((bSum, b) => bSum + blockValueToMiles(b), 0),
    0
  );

  const easyMiles = Math.max(1, Math.round(totalMiles));

  const easyBlock: Block = {
    type: "easy" as BlockType,
    value: easyMiles,
    unit: "miles" as BlockUnit,
    effortLevel: "z2" as EffortLevel,
  };

  const updatedDays = [...week.days];
  updatedDays[dayIndex] = {
    ...day,
    workouts: [{ blocks: [easyBlock] }],
  };

  const newWeeks = [...weeks];
  newWeeks[weekIndex] = { ...week, days: updatedDays };

  return {
    weeks: newWeeks,
    description: `Week ${fix.weekNumber} ${fix.dayOfWeek}: replaced hard workout with ${easyMiles}mi easy`,
  };
}

/**
 * Reduce a specific block's value.
 */
function applyReduceBlockValue(
  weeks: Week[],
  fix: {
    type: "reduce_block_value";
    weekNumber: number;
    dayOfWeek: string;
    blockIndex: number;
    newValue: number;
  }
): { weeks: Week[]; description: string } | null {
  const weekIndex = weeks.findIndex((w) => w.weekNumber === fix.weekNumber);
  if (weekIndex === -1) return null;

  const week = weeks[weekIndex];
  const dayIndex = week.days.findIndex((d) => d.dayOfWeek === fix.dayOfWeek);
  if (dayIndex === -1) return null;

  const day = week.days[dayIndex];
  const allBlocks = day.workouts.flatMap((w) => w.blocks);

  if (fix.blockIndex < 0 || fix.blockIndex >= allBlocks.length) return null;

  const oldValue = allBlocks[fix.blockIndex].value;
  const oldUnit = allBlocks[fix.blockIndex].unit;

  // Apply the change by walking through workouts/blocks
  let blockCounter = 0;
  const updatedDays = [...week.days];
  updatedDays[dayIndex] = {
    ...day,
    workouts: day.workouts.map((workout) => ({
      blocks: workout.blocks.map((block) => {
        const currentIndex = blockCounter++;
        if (currentIndex === fix.blockIndex) {
          return { ...block, value: fix.newValue };
        }
        return block;
      }),
    })),
  };

  const newWeeks = [...weeks];
  newWeeks[weekIndex] = { ...week, days: updatedDays };

  return {
    weeks: newWeeks,
    description: `Week ${fix.weekNumber} ${fix.dayOfWeek} block ${fix.blockIndex}: ${oldValue}${oldUnit === "miles" ? "mi" : "min"} → ${fix.newValue}${oldUnit === "miles" ? "mi" : "min"}`,
  };
}

/**
 * Change a block's effort level.
 */
function applyChangeEffortLevel(
  weeks: Week[],
  fix: {
    type: "change_effort_level";
    weekNumber: number;
    dayOfWeek: string;
    blockIndex: number;
    newEffortLevel: "z1" | "z2" | "z3" | "z4" | "z5";
  }
): { weeks: Week[]; description: string } | null {
  const weekIndex = weeks.findIndex((w) => w.weekNumber === fix.weekNumber);
  if (weekIndex === -1) return null;

  const week = weeks[weekIndex];
  const dayIndex = week.days.findIndex((d) => d.dayOfWeek === fix.dayOfWeek);
  if (dayIndex === -1) return null;

  const day = week.days[dayIndex];
  const allBlocks = day.workouts.flatMap((w) => w.blocks);

  if (fix.blockIndex < 0 || fix.blockIndex >= allBlocks.length) return null;

  const oldEffort = allBlocks[fix.blockIndex].effortLevel;

  let blockCounter = 0;
  const updatedDays = [...week.days];
  updatedDays[dayIndex] = {
    ...day,
    workouts: day.workouts.map((workout) => ({
      blocks: workout.blocks.map((block) => {
        const currentIndex = blockCounter++;
        if (currentIndex === fix.blockIndex) {
          return { ...block, effortLevel: fix.newEffortLevel };
        }
        return block;
      }),
    })),
  };

  const newWeeks = [...weeks];
  newWeeks[weekIndex] = { ...week, days: updatedDays };

  return {
    weeks: newWeeks,
    description: `Week ${fix.weekNumber} ${fix.dayOfWeek} block ${fix.blockIndex}: ${oldEffort} → ${fix.newEffortLevel}`,
  };
}
