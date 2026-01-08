/**
 * V2 Block Types
 *
 * Hierarchy: TrainingPlan → Week → Day → Workout → Block[]
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
