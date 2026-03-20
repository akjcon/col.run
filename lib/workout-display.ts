/**
 * Workout Display Utilities
 *
 * Deterministic functions to derive human-readable info from V2 blocks.
 * Used by dashboard components to render workout cards.
 */

import type { Block, Day, EffortLevel, Workout } from "@/lib/blocks/types";
import { calculatePaceZones, formatPaceRange } from "@/lib/pace-zones";
import {
  calculateWorkoutTotalMiles,
  calculateWorkoutTotal,
  isRestDay as _isRestDay,
  getDayBlocks,
  isRestBlock,
} from "@/lib/blocks/calculations";

// =============================================================================
// Effort / Zone Labels & Colors
// =============================================================================

export function effortToZoneLabel(effort: EffortLevel): string {
  switch (effort) {
    case "z1": return "Recovery";
    case "z2": return "Zone 2";
    case "z3": return "Zone 3";
    case "z4": return "Zone 4";
    case "z5": return "Zone 5";
  }
}

export function effortToColor(effort: EffortLevel): string {
  switch (effort) {
    case "z1": return "#93C5FD"; // soft blue
    case "z2": return "#86EFAC"; // soft green
    case "z3": return "#E98A15"; // brand orange
    case "z4": return "#F87171"; // red
    case "z5": return "#171717"; // near-black
  }
}

const EFFORT_RANK: Record<EffortLevel, number> = {
  z1: 1,
  z2: 2,
  z3: 3,
  z4: 4,
  z5: 5,
};

// =============================================================================
// Block Formatting
// =============================================================================

export function formatBlock(block: Block): string {
  if (isRestBlock(block)) return "Rest";

  const effortLabel = effortToZoneLabel(block.effortLevel).toLowerCase();

  if (block.repeat) {
    const rep = block.repeat;
    const unitLabel = block.unit === "miles" ? "mi" : block.unit === "seconds" ? "sec" : "min";
    let s = `${rep.times}x${block.value}${unitLabel} at ${effortLabel}`;
    if (rep.restBetween) {
      const restUnit = rep.restBetween.unit === "miles" ? "mi" : rep.restBetween.unit === "seconds" ? "sec" : "min";
      s += ` (${rep.restBetween.value}${restUnit} recovery)`;
    }
    return s;
  }

  if (block.unit === "miles") {
    return `${block.value} miles at ${effortLabel}`;
  }
  return `${block.value}min at ${effortLabel}`;
}

/**
 * Format a block with its pace range appended (when threshold pace is available).
 */
export function formatBlockWithPace(block: Block, thresholdPace?: number): string {
  const base = formatBlock(block);
  if (!thresholdPace || isRestBlock(block)) return base;
  const zones = calculatePaceZones(thresholdPace);
  const range = zones[block.effortLevel];
  return `${base} (${formatPaceRange(range)})`;
}

/**
 * Get the pace range string for a given effort level.
 */
export function effortToPaceRange(effort: EffortLevel, thresholdPace: number): string {
  const zones = calculatePaceZones(thresholdPace);
  return formatPaceRange(zones[effort]);
}

// =============================================================================
// Workout-level Display
// =============================================================================

/**
 * Derive a human-readable title from the primary block type.
 * Uses the AI-generated title if available, otherwise falls back to block-derived title.
 */
export function getWorkoutTitle(workout: Workout): string {
  if (workout.title) return workout.title;

  const blocks = workout.blocks.filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return "Rest Day";

  // Check for specific block types in priority order
  const hasIntervals = blocks.some((b) => b.type === "intervals");
  const hasTempo = blocks.some((b) => b.type === "tempo");
  const hasLongRun = blocks.some((b) => b.type === "longRun");

  if (hasIntervals) {
    const intervalBlock = blocks.find((b) => b.type === "intervals")!;
    if (intervalBlock.repeat) {
      const unitLabel = intervalBlock.unit === "miles" ? "mi" : intervalBlock.unit === "seconds" ? "sec" : "min";
      return `${intervalBlock.repeat.times}x${intervalBlock.value}${unitLabel} Intervals`;
    }
    return "Interval Workout";
  }

  if (hasTempo) return "Tempo Run";
  if (hasLongRun) return "Long Run";

  // Default: easy run
  return "Easy Run";
}

/**
 * Human-readable summary of all blocks.
 */
export function getWorkoutSummary(workout: Workout): string {
  const blocks = workout.blocks.filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return "Rest";
  return blocks.map(formatBlock).join(" + ");
}

/**
 * Get the highest effort level across all blocks in a workout.
 */
export function getWorkoutEffortLevel(workout: Workout): EffortLevel {
  const blocks = workout.blocks.filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return "z1";

  let highest: EffortLevel = "z1";
  for (const block of blocks) {
    if (EFFORT_RANK[block.effortLevel] > EFFORT_RANK[highest]) {
      highest = block.effortLevel;
    }
  }
  return highest;
}

/**
 * Get total miles for a workout (convenience wrapper).
 */
export function getWorkoutMiles(workout: Workout): number {
  return calculateWorkoutTotalMiles(workout);
}

/**
 * Get total minutes for a workout (convenience wrapper).
 */
export function getWorkoutMinutes(workout: Workout): number {
  return calculateWorkoutTotal(workout);
}

// =============================================================================
// Day-level Display
// =============================================================================

/**
 * Title for the whole day — handles rest days.
 */
export function getDayTitle(day: Day): string {
  if (isRestDay(day)) return "Rest Day";
  if (day.workouts.length === 0) return "Rest Day";
  return getWorkoutTitle(day.workouts[0]);
}

/**
 * Check if a day is a rest day.
 */
export function isRestDay(day: Day): boolean {
  return _isRestDay(day);
}

/**
 * Get the highest effort level for the day.
 */
export function getDayEffortLevel(day: Day): EffortLevel {
  const blocks = getDayBlocks(day).filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return "z1";

  let highest: EffortLevel = "z1";
  for (const block of blocks) {
    if (EFFORT_RANK[block.effortLevel] > EFFORT_RANK[highest]) {
      highest = block.effortLevel;
    }
  }
  return highest;
}
