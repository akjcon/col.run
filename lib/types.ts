// User Profile Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
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
    raceDate?: Date;
    targetTime?: string;
  };
  background?: string; // e.g., "Former D1 Nordic skier"
  specialNotes?: string;
}

export interface TrainingZone {
  zone: string;
  heartRate: string;
  pace: string;
  description: string;
  color: string;
}

export interface TrainingPhase {
  weeks: string;
  phase: string;
  miles: string;
  vertical: string;
  focus: string;
}

export interface Workout {
  day: string;
  type: string;
  zone: string;
  description: string;
  details?: string[];
  notes?: string;
}

export interface WeekPlan {
  weekNumber: number;
  phase: string;
  targetMiles: string;
  targetVertical: string;
  workouts: Workout[];
}

export interface TrainingPlan {
  id: string;
  userId: string;
  planType: string; // e.g., "12-week 50K"
  startDate: Date;
  currentWeek: number;
  totalWeeks: number;
  zones: TrainingZone[];
  phases: TrainingPhase[];
  weeks: WeekPlan[];
  coachingNotes: string[];
  generatedAt: Date;
}

export interface GeneratedProfile {
  fitnessAssessment: string;
  recommendedPlan: TrainingPlan;
  strengths: string[];
  focusAreas: string[];
  aiAnalysis: string;
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
  generatedProfile?: GeneratedProfile;
  chatHistory: ChatMessage[];
}

// Workout Tracking Types
export interface WorkoutCompletion {
  id: string;
  workoutDay: string; // e.g., "Monday"
  workoutType: string; // e.g., "Zone 1-2 Run + Strength"
  weekNumber: number; // e.g., 1
  completedAt: Date; // when they marked it complete
  feelingRating: number; // 1-10 slider value
  feelingNotes?: string; // optional text when rating ≤3 or ≥8
  userId: string;
}
