/**
 * Block Validation Utilities
 */

import type { Block, Day, Workout, Week, BlockUnit } from "./types";
import { VALID_BLOCK_TYPES, VALID_EFFORT_LEVELS } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_UNITS: BlockUnit[] = ["minutes", "miles", "seconds"];

/**
 * Validates a single block
 */
export function validateBlock(block: Block): ValidationResult {
  const errors: string[] = [];

  if (!block) {
    return { valid: false, errors: ["Block is undefined"] };
  }

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

  // Validate unit field
  if (!block.unit) {
    errors.push(`Block missing unit field`);
  } else if (!VALID_UNITS.includes(block.unit)) {
    errors.push(`Invalid unit: ${block.unit}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a workout (array of blocks)
 */
export function validateWorkout(workout: Workout): ValidationResult {
  const errors: string[] = [];

  if (!workout) {
    return { valid: false, errors: ["Workout is undefined"] };
  }

  if (!workout.blocks || !Array.isArray(workout.blocks)) {
    return { valid: false, errors: ["Workout missing blocks array"] };
  }

  for (let i = 0; i < workout.blocks.length; i++) {
    const blockResult = validateBlock(workout.blocks[i]);
    if (!blockResult.valid) {
      errors.push(`Block ${i}: ${blockResult.errors.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a day (array of workouts)
 */
export function validateDay(day: Day): ValidationResult {
  const errors: string[] = [];

  if (!day) {
    return { valid: false, errors: ["Day is undefined"] };
  }

  if (!day.dayOfWeek) {
    errors.push("Day missing dayOfWeek");
  }

  if (!day.workouts || !Array.isArray(day.workouts)) {
    return { valid: false, errors: ["Day missing workouts array"] };
  }

  for (let i = 0; i < day.workouts.length; i++) {
    const workoutResult = validateWorkout(day.workouts[i]);
    if (!workoutResult.valid) {
      errors.push(`Workout ${i}: ${workoutResult.errors.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a week (array of days)
 */
export function validateWeek(week: Week): ValidationResult {
  const errors: string[] = [];

  if (!week) {
    return { valid: false, errors: ["Week is undefined"] };
  }

  if (typeof week.weekNumber !== "number" || week.weekNumber < 1) {
    errors.push(`Invalid week number: ${week.weekNumber}`);
  }

  if (!week.phase) {
    errors.push("Week missing phase");
  }

  if (!week.days || !Array.isArray(week.days)) {
    return { valid: false, errors: ["Week missing days array"] };
  }

  if (week.days.length !== 7) {
    errors.push(`Week has ${week.days.length} days, expected 7`);
  }

  for (let i = 0; i < week.days.length; i++) {
    const dayResult = validateDay(week.days[i]);
    if (!dayResult.valid) {
      errors.push(`${week.days[i]?.dayOfWeek || `Day ${i}`}: ${dayResult.errors.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
