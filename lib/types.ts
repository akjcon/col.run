// User Profile Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: number; // epoch timestamp
  completedOnboarding: boolean;
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
import type { Week } from "@/lib/blocks/types";
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

  // From TrainingBackground
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
  estimatedThresholdPace?: number;
  thresholdPace?: number; // resolved: manual entry > Strava estimate

  // From ExperienceProfile (Strava, lifetime)
  lifetimeMiles?: number;
  peakWeeklyMileage?: number;
  experienceLevel?: string;
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
