/**
 * Agent Framework Types
 *
 * Two-tier architecture:
 * - Orchestrator: Full book context, strategic decisions
 * - WeekGenerator: Focused context, tactical execution
 */

import type { Week } from "@/lib/blocks";

// =============================================================================
// Agent Base Types
// =============================================================================

export interface AgentTrace {
  agentName: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  trace: AgentTrace;
}

// =============================================================================
// Athlete & Goal Types
// =============================================================================

export interface AthleteProfile {
  // Current fitness (from recent Strava data)
  experience: "beginner" | "intermediate" | "advanced" | "elite";
  weeklyMileage: number; // Current weekly mileage
  longestRun: number; // Longest run in last 12 weeks
  ctl?: number; // Chronic Training Load
  atl?: number; // Acute Training Load
  thresholdPace?: number; // min/mile

  // Experience/capability (from lifetime Strava data)
  lifetimeMiles?: number;
  longestRunEver?: number; // Longest run ever (not just recent)
  peakWeeklyMileage?: number; // Peak weekly mileage ever
  ultraExperience?: boolean;
  trailExperience?: boolean;

  // Legacy/optional
  marathonPR?: string;
  currentFitness?: string;
  background?: string;
  injuries?: string;
}

export interface RaceGoal {
  raceDistance: string;
  targetTime?: string;
  raceDate?: number; // epoch ms
  raceName?: string;
  elevation?: number; // total elevation gain in feet
  terrainType?: "road" | "trail" | "mountain" | "mixed";
}

export interface PlanConstraints {
  blackoutDates?: number[]; // epoch ms dates to skip
  requiredRestDays?: string[]; // e.g., ["Sunday"]
  maxWeeklyHours?: number;
  preferredLongRunDay?: string;
}

// =============================================================================
// Orchestrator Types
// =============================================================================

export interface OrchestratorInput {
  athlete: AthleteProfile;
  goal: RaceGoal;
  planWeeks: number;
  constraints?: PlanConstraints;
  // New: Pre-computed feasibility and requirements
  raceRequirements?: RaceRequirementsSummary;
  feasibility?: FeasibilitySummary;
  // Aggregated feedback from previous plan reviews
  feedbackContext?: string;
}

export interface PhaseTarget {
  name: string;
  startWeek: number;
  endWeek: number;
  focus: string;
  weeklyVolumeRange: [number, number]; // [min, max] in minutes
  keyWorkouts: string[];
}

export interface WeeklyTarget {
  weekNumber: number;
  phase: string;
  targetVolume: number; // minutes
  keyWorkoutType: string | null; // e.g., "tempo", "intervals", "longRun"
  notes?: string;
  /** Detailed instructions for the week generator explaining workout rationale and specifics */
  instructions?: string;
}

export interface OrchestratorOutput {
  phases: PhaseTarget[];
  weeklyTargets: WeeklyTarget[];
  methodology: string; // Relevant excerpts from book for week generators
  athleteAnalysis: {
    fitnessLevel: number; // 1-10
    limiters: string[];
    strengths: string[];
    riskFactors: string[];
  };
}

// =============================================================================
// Week Generator Types
// =============================================================================

export interface WeekGeneratorInput {
  weekNumber: number;
  target: WeeklyTarget;
  phase: PhaseTarget;
  methodology: string;
  previousWeek?: Week;
  constraints?: PlanConstraints;
  athleteProfile: AthleteProfile;
}

export interface WeekGeneratorOutput {
  week: Week;
}

// =============================================================================
// Pipeline Types
// =============================================================================

export interface RaceRequirementsSummary {
  distanceMiles: number;
  peakWeeklyMileage: { min: number; ideal: number; max: number };
  peakLongRun: { min: number; ideal: number; max: number };
  keyWorkouts: string[];
  considerations: string[];
}

export interface FeasibilitySummary {
  feasible: boolean;
  riskLevel: "low" | "moderate" | "high" | "extreme";
  suggestedApproach: string;
  startingWeeklyMileage: number;
  targetPeakMileage: number;
  targetPeakLongRun: number;
  warnings: string[];
}

export interface PlanGenerationInput {
  athlete: AthleteProfile;
  goal: RaceGoal;
  constraints?: PlanConstraints;
  // New: Pre-computed feasibility and requirements
  raceRequirements?: RaceRequirementsSummary;
  feasibility?: FeasibilitySummary;
}

export interface PlanGenerationOutput {
  plan: {
    id: string;
    userId: string;
    totalWeeks: number;
    weeks: Week[];
    phases: PhaseTarget[];
    startDate?: number;
    generatedAt: number;
  };
  traces: AgentTrace[];
  evaluation?: {
    structural: number;
    safety: number;
    methodology: number;
    overall: number;
  };
}
