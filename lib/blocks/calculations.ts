/**
 * Block Calculation Utilities
 */

import type { Block, BlockType, Day, EffortLevel, Week, Workout } from "./types";
import { HARD_BLOCK_TYPES, HARD_EFFORT_LEVELS, EASY_BLOCK_TYPES } from "./types";

// Effort level numeric mapping
const EFFORT_MAP: Record<EffortLevel, number> = {
  z1: 1,
  z2: 2,
  z3: 3,
  z4: 4,
  z5: 5,
};

// =============================================================================
// Block Classification
// =============================================================================

/**
 * Checks if a block is a rest block
 */
export function isRestBlock(block: Block): boolean {
  return block.type === "rest";
}

/**
 * Checks if a block is a hard (high intensity) block
 * Hard = tempo/intervals type OR z4/z5 effort
 */
export function isHardBlock(block: Block): boolean {
  return HARD_BLOCK_TYPES.includes(block.type) || HARD_EFFORT_LEVELS.includes(block.effortLevel);
}

/**
 * Checks if a block is an easy block
 * Easy = warmUp/recovery/coolDown/easy/longRun type AND NOT z4/z5 effort
 */
export function isEasyBlock(block: Block): boolean {
  return EASY_BLOCK_TYPES.includes(block.type) && !HARD_EFFORT_LEVELS.includes(block.effortLevel);
}

// =============================================================================
// Workout Calculations
// =============================================================================

/**
 * Gets all blocks from a workout
 */
export function getWorkoutBlocks(workout: Workout): Block[] {
  return workout.blocks || [];
}

/**
 * Calculates total minutes for a workout
 */
export function calculateWorkoutTotal(workout: Workout): number {
  return getWorkoutBlocks(workout).reduce((sum, block) => sum + block.value, 0);
}

/**
 * Calculates weighted average effort for a workout (1-5 scale)
 */
export function calculateWorkoutEffort(workout: Workout): number {
  const blocks = getWorkoutBlocks(workout).filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return 0;

  const totalValue = blocks.reduce((sum, b) => sum + b.value, 0);
  if (totalValue === 0) return 0;

  const weightedSum = blocks.reduce((sum, b) => sum + EFFORT_MAP[b.effortLevel] * b.value, 0);
  return weightedSum / totalValue;
}

// =============================================================================
// Day Calculations
// =============================================================================

/**
 * Gets all blocks from a day (flattened across all workouts)
 */
export function getDayBlocks(day: Day): Block[] {
  return day.workouts.flatMap((w) => getWorkoutBlocks(w));
}

/**
 * Calculates total minutes for a day (across all workouts)
 */
export function calculateDayTotal(day: Day): number {
  return day.workouts.reduce((sum, workout) => sum + calculateWorkoutTotal(workout), 0);
}

/**
 * Calculates weighted average effort for a day (1-5 scale)
 */
export function calculateDayEffort(day: Day): number {
  const blocks = getDayBlocks(day).filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return 0;

  const totalValue = blocks.reduce((sum, b) => sum + b.value, 0);
  if (totalValue === 0) return 0;

  const weightedSum = blocks.reduce((sum, b) => sum + EFFORT_MAP[b.effortLevel] * b.value, 0);
  return weightedSum / totalValue;
}

/**
 * Checks if a day is a rest day (only rest blocks or empty)
 */
export function isRestDay(day: Day): boolean {
  const blocks = getDayBlocks(day);
  return blocks.length === 0 || blocks.every((b) => isRestBlock(b));
}

/**
 * Checks if a day has hard workout(s)
 */
export function isHardDay(day: Day): boolean {
  return getDayBlocks(day).some((b) => isHardBlock(b));
}

/**
 * Counts blocks by type for a day
 */
export function countDayBlocksByType(day: Day): Record<BlockType, number> {
  const counts: Record<BlockType, number> = {
    warmUp: 0,
    intervals: 0,
    recovery: 0,
    rest: 0,
    coolDown: 0,
    tempo: 0,
    longRun: 0,
    easy: 0,
  };

  for (const block of getDayBlocks(day)) {
    counts[block.type]++;
  }

  return counts;
}

// =============================================================================
// Week Calculations
// =============================================================================

/**
 * Gets all blocks from a week (flattened)
 */
export function getWeekBlocks(week: Week): Block[] {
  return week.days.flatMap((day) => getDayBlocks(day));
}

/**
 * Calculates total minutes for a week
 */
export function calculateWeekTotal(week: Week): number {
  return week.days.reduce((sum, day) => sum + calculateDayTotal(day), 0);
}

/**
 * Calculates weighted average effort for a week (1-5 scale)
 */
export function calculateWeekEffort(week: Week): number {
  const blocks = getWeekBlocks(week).filter((b) => !isRestBlock(b));
  if (blocks.length === 0) return 0;

  const totalValue = blocks.reduce((sum, b) => sum + b.value, 0);
  if (totalValue === 0) return 0;

  const weightedSum = blocks.reduce((sum, b) => sum + EFFORT_MAP[b.effortLevel] * b.value, 0);
  return weightedSum / totalValue;
}

/**
 * Counts blocks by type for a week
 */
export function countWeekBlocksByType(week: Week): Record<BlockType, number> {
  const counts: Record<BlockType, number> = {
    warmUp: 0,
    intervals: 0,
    recovery: 0,
    rest: 0,
    coolDown: 0,
    tempo: 0,
    longRun: 0,
    easy: 0,
  };

  for (const block of getWeekBlocks(week)) {
    counts[block.type]++;
  }

  return counts;
}

/**
 * Counts rest days in a week
 */
export function countRestDays(week: Week): number {
  return week.days.filter((day) => isRestDay(day)).length;
}

/**
 * Counts hard days in a week
 */
export function countHardDays(week: Week): number {
  return week.days.filter((day) => isHardDay(day)).length;
}

/**
 * Calculates easy/hard minute distribution for a week
 * Returns { easy: minutes, hard: minutes, total: minutes }
 */
export function calculateWeekDistribution(week: Week): {
  easy: number;
  hard: number;
  total: number;
} {
  let easy = 0;
  let hard = 0;

  for (const block of getWeekBlocks(week)) {
    if (isRestBlock(block)) {
      continue; // Rest doesn't count toward training time
    } else if (isHardBlock(block)) {
      hard += block.value;
    } else if (isEasyBlock(block)) {
      easy += block.value;
    } else {
      // z3 blocks that aren't tempo/intervals are borderline - split 50/50
      if (block.effortLevel === "z3") {
        easy += block.value * 0.5;
        hard += block.value * 0.5;
      } else {
        easy += block.value;
      }
    }
  }

  return { easy, hard, total: easy + hard };
}
