/**
 * V2 Block Types
 *
 * Hierarchy: TrainingPlan → Week → Day → Workout → Block[]
 *
 * Key design decision:
 * - Easy runs (easy, longRun) use DISTANCE (miles) because pace varies with terrain/vert
 * - Workouts (intervals, tempo, etc.) use TIME (minutes) for consistent effort
 * - This matches how real runners train: "do 8 miles easy" vs "do 6x5min hard"
 */

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

export type BlockUnit = "minutes" | "miles" | "seconds";

export interface RepeatStructure {
  times: number;
  restBetween?: {
    value: number;
    unit: BlockUnit;
    effortLevel: EffortLevel;
  };
}

export interface Block {
  type: BlockType;
  value: number; // See unit field for interpretation
  unit: BlockUnit; // "minutes" for workouts, "miles" for easy/long runs
  effortLevel: EffortLevel;
  notes?: string; // Optional instructions, e.g., "on steep hill", "at race pace"
  repeat?: RepeatStructure; // For interval workouts: 8x30sec, 6x5min, etc.
}

/**
 * Block types that should use DISTANCE (miles)
 * These are steady-state aerobic runs where pace varies with terrain
 */
export const DISTANCE_BASED_BLOCKS: BlockType[] = ["easy", "longRun"];

/**
 * Block types that should use TIME (minutes)
 * These are effort-based segments where we want consistent time at effort
 */
export const TIME_BASED_BLOCKS: BlockType[] = [
  "warmUp",
  "intervals",
  "recovery",
  "rest",
  "coolDown",
  "tempo",
];

/**
 * Get the default unit for a block type
 */
export function getDefaultUnit(type: BlockType): BlockUnit {
  return DISTANCE_BASED_BLOCKS.includes(type) ? "miles" : "minutes";
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

// Constants
export const VALID_BLOCK_TYPES: BlockType[] = [
  "warmUp",
  "intervals",
  "recovery",
  "rest",
  "coolDown",
  "tempo",
  "longRun",
  "easy",
];

export const VALID_EFFORT_LEVELS: EffortLevel[] = ["z1", "z2", "z3", "z4", "z5"];

// Block type classifications
export const HARD_BLOCK_TYPES: BlockType[] = ["intervals", "tempo"];
export const EASY_BLOCK_TYPES: BlockType[] = ["warmUp", "recovery", "coolDown", "easy", "longRun"];
export const HARD_EFFORT_LEVELS: EffortLevel[] = ["z4", "z5"];
