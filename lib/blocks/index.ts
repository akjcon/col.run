/**
 * Block Module - V2 Workout Structure
 *
 * Hierarchy: TrainingPlan → Week → Day → Workout → Block[]
 */

// Types
export type {
  Block,
  BlockType,
  Day,
  EffortLevel,
  TrainingPlan,
  Week,
  Workout,
} from "./types";

export {
  VALID_BLOCK_TYPES,
  VALID_EFFORT_LEVELS,
  HARD_BLOCK_TYPES,
  EASY_BLOCK_TYPES,
  HARD_EFFORT_LEVELS,
} from "./types";

// Validation
export {
  validateBlock,
  validateWorkout,
  validateDay,
  validateWeek,
  type ValidationResult,
} from "./validation";

// Calculations
export {
  // Classification
  isRestBlock,
  isHardBlock,
  isEasyBlock,
  // Workout
  getWorkoutBlocks,
  calculateWorkoutTotal,
  calculateWorkoutEffort,
  // Day
  getDayBlocks,
  calculateDayTotal,
  calculateDayEffort,
  isRestDay,
  isHardDay,
  countDayBlocksByType,
  // Week
  getWeekBlocks,
  calculateWeekTotal,
  calculateWeekEffort,
  countWeekBlocksByType,
  countRestDays,
  countHardDays,
  calculateWeekDistribution,
} from "./calculations";
