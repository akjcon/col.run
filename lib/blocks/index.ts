/**
 * Block Module - V2 Workout Structure
 *
 * Hierarchy: TrainingPlan → Week → Day → Workout → Block[]
 */

// Types
export type {
  Block,
  BlockType,
  BlockUnit,
  Day,
  EffortLevel,
  RepeatStructure,
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
  DISTANCE_BASED_BLOCKS,
  TIME_BASED_BLOCKS,
  getDefaultUnit,
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
  // Conversions
  blockValueToMinutes,
  blockValueToMiles,
  // Classification
  isRestBlock,
  isHardBlock,
  isEasyBlock,
  // Workout
  getWorkoutBlocks,
  calculateWorkoutTotal,
  calculateWorkoutTotalMiles,
  calculateWorkoutEffort,
  // Day
  getDayBlocks,
  calculateDayTotal,
  calculateDayTotalMiles,
  calculateDayEffort,
  isRestDay,
  isHardDay,
  countDayBlocksByType,
  // Week
  getWeekBlocks,
  calculateWeekTotal,
  calculateWeekTotalMiles,
  calculateWeekEffort,
  countWeekBlocksByType,
  countRestDays,
  countHardDays,
  calculateWeekDistribution,
} from "./calculations";
