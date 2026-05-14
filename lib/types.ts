// User Profile Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: number; // epoch timestamp
  completedOnboarding: boolean;
  // Deploy environment the user signed up under: "production", "preview",
  // "development", or "unknown". Stamped on user creation so dev/prod
  // accounts in the same Firestore can be told apart.
  env?: string;
}

export interface TrainingBackground {
  experience: "beginner" | "intermediate" | "advanced";
  weeklyMileage: number;
  longestRun: number;
  marathonPR?: string;
  currentFitness?: string;
  injuries?: string;
  goals: {
    raceDistance: string;
    raceDate?: number; // epoch timestamp
    targetTime?: string;
    elevation?: number;
    description?: string;
  };
  background?: string;
  specialNotes?: string;
  thresholdPace?: number; // min/mi, manually entered
  fitnessSource?: "strava" | "manual";
  stravaConnected?: boolean;
}

// V2 Training Plan — uses block-based structure from lib/blocks/types.ts
// Hierarchy: TrainingPlan → Week → Day → Workout → Block[]
import type { Week, Day } from "@/lib/blocks/types";
import type { PhaseTarget } from "@/lib/agents/types";

export interface TrainingPlan {
  id: string;
  userId: string;
  totalWeeks: number;
  weeks: Week[];
  phases: PhaseTarget[];
  startDate: number; // epoch timestamp
  generatedAt: number; // epoch timestamp
  raceDate?: number; // epoch timestamp — the target race day
  raceName?: string; // e.g. "Western States 100"
  isActive?: boolean;
  previousPlanId?: string; // set when impersonating a review plan
}

export interface ChatToolCall {
  name: string; // "read_athlete_data" | "update_coach_memory" | "propose_plan_changes" | "update_threshold_pace"
  input: unknown;
  result?: string; // truncated tool result for server-side tools; omitted for client-side proposals
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ChatToolCall[]; // populated on assistant messages when the coach invoked any tools
}

export interface UserData {
  profile: UserProfile;
  trainingBackground?: TrainingBackground;
  activePlan?: TrainingPlan;
  chatHistory: ChatMessage[];
}

// Workout Tracking Types
export interface WorkoutLog {
  id: string; // "{date}-{dayOfWeek}" for dedup
  date: number; // epoch ms — primary key for matching
  weekNumber: number;
  dayOfWeek: string;

  // Plan reference
  plannedTitle: string; // "Easy Run", "Tempo", etc.
  plannedMiles?: number;
  plannedMinutes?: number;

  // Completion
  source: "manual" | "strava";
  completedAt: number; // epoch ms
  feelingRating?: number; // 1-10 slider value
  feelingNotes?: string; // optional text when rating <=3 or >=8

  // Strava data (when source === "strava")
  stravaActivityId?: number;
  actualMiles?: number;
  actualMinutes?: number;
  actualElevation?: number;
  avgPace?: number;
  avgHeartRate?: number;

  // AI analysis (filled later by coaching features)
  adherence?: "on_target" | "over" | "under" | "skipped";
  coachingNote?: string;
  noteDismissed?: boolean;
}

// Athlete Snapshot — denormalized doc for AI features (chat, plan gen, coaching)
// Chat context — passed from UI to ChatDrawer + API
export interface ChatContext {
  page: "home" | "overview" | "calendar";
  trigger: "sidebar" | "workout" | "tomorrow" | "progress" | "phase" | "pace-zones";
  workout?: {
    title: string;
    miles?: number;
    minutes?: number;
    effortLevel?: string;
    blocks?: string[];
    isCompleted?: boolean;
  };
  progress?: {
    currentWeek: number;
    totalWeeks: number;
    phaseName?: string;
    thisWeekMiles?: number;
    raceDistance?: string;
    raceDate?: number;
  };
}

export interface AthleteSnapshot {
  updatedAt: number;

  // Resolved: Strava-derived > self-reported from onboarding
  experience: string;
  weeklyMileage: number;
  longestRun: number;
  marathonPR?: string;
  injuries?: string;

  // From FitnessProfile (Strava, last 12 weeks)
  ctl?: number;
  atl?: number;
  tsb?: number;
  currentWeeklyMileage?: number;
  currentLongestRun?: number; // longest run in the last 12 weeks (miles)
  currentAvgPace?: number; // recent avg pace (min/mile)
  estimatedThresholdPace?: number;
  thresholdPace?: number; // resolved: manual entry > Strava estimate

  // From ExperienceProfile (Strava, lifetime)
  lifetimeMiles?: number;
  lifetimeRuns?: number;
  longestRunEver?: number; // all-time longest single run (miles)
  peakWeeklyMileage?: number;
  ultraExperience?: boolean;
  trailExperience?: boolean;

  // From recent WorkoutLogs (last 4 weeks)
  recentAdherence?: {
    completed: number;
    total: number;
    avgFeeling?: number;
  };

  // Goal
  raceDistance?: string;
  raceDate?: number;
  targetTime?: string;
}

export interface CoachMemoryEntry {
  id: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// Plan Modification — single source of truth for proposed plan changes.
// Used end-to-end: LLM tool output → chat route validation → NDJSON event →
// PlanChangeCard → /api/plan/modify. Discriminated by `type` so the compiler
// enforces that replace_week carries a Week, append_weeks carries Week[], etc.
// =============================================================================
export type ProposedPlanChange =
  | {
      type: "replace_week";
      weekNumber: number;
      week: Week;
      summary: string;
    }
  | {
      type: "replace_day";
      weekNumber: number;
      dayOfWeek: string;
      day: Day;
      summary: string;
    }
  | {
      // `weekNumber` here is the number of the FIRST appended week
      // (server-stamped before emitting to the client, so the UI can label
      // "New Week N, N+1, ..." correctly). The server is authoritative —
      // it always re-derives from current plan length at apply time.
      type: "append_weeks";
      weekNumber: number;
      weeks: Week[];
      summary: string;
    };
