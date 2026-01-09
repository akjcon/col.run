/**
 * Mock Athlete Profiles for Pipeline Testing
 *
 * Covers diverse scenarios:
 * - Different experience levels
 * - Various goal distances
 * - Different time horizons
 * - Various constraints
 */

import type { AthleteProfile, RaceGoal, PlanConstraints } from "@/lib/agents/types";

export interface TestAthlete {
  id: string;
  name: string;
  description: string;
  profile: AthleteProfile;
  goal: RaceGoal;
  constraints?: PlanConstraints;
}

// =============================================================================
// Test Athletes
// =============================================================================

export const testAthletes: TestAthlete[] = [
  {
    id: "beginner-half",
    name: "Sarah - Beginner Half Marathon",
    description: "New runner, 6 months of consistent running, wants to complete first half marathon in 12 weeks",
    profile: {
      experience: "beginner",
      weeklyMileage: 15,
      longestRun: 6,
      background: "Former soccer player, good general fitness but new to distance running",
      injuries: "None",
    },
    goal: {
      raceDistance: "Half Marathon",
      raceName: "Local Half Marathon",
      raceDate: Date.now() + 12 * 7 * 24 * 60 * 60 * 1000, // 12 weeks
      terrainType: "road",
    },
    constraints: {
      requiredRestDays: ["Sunday"],
      preferredLongRunDay: "Saturday",
    },
  },

  {
    id: "intermediate-marathon",
    name: "Mike - Intermediate Marathon",
    description: "2 years running, several halfs completed, training for first marathon in 16 weeks",
    profile: {
      experience: "intermediate",
      weeklyMileage: 30,
      longestRun: 14,
      marathonPR: undefined, // First marathon
      currentFitness: "Good aerobic base, completed 1:45 half marathon 2 months ago",
      background: "Ran cross country in high school, picked it back up 2 years ago",
      injuries: "Occasional IT band tightness, managed with stretching",
    },
    goal: {
      raceDistance: "Marathon",
      targetTime: "3:45:00",
      raceName: "Chicago Marathon",
      raceDate: Date.now() + 16 * 7 * 24 * 60 * 60 * 1000, // 16 weeks
      terrainType: "road",
    },
    constraints: {
      preferredLongRunDay: "Sunday",
      maxWeeklyHours: 10,
    },
  },

  {
    id: "advanced-50k",
    name: "Elena - Advanced 50K Ultra",
    description: "Experienced trail runner, multiple marathons, training for first 50K in 14 weeks",
    profile: {
      experience: "advanced",
      weeklyMileage: 50,
      longestRun: 22,
      marathonPR: "3:15:00",
      currentFitness: "Strong aerobic base, just finished marathon block 4 weeks ago",
      background: "5 years of running, 3 marathons, regular trail running on weekends",
      injuries: "Plantar fasciitis 2 years ago, fully recovered",
    },
    goal: {
      raceDistance: "50K",
      targetTime: "5:30:00",
      raceName: "Mountain Lakes 50K",
      raceDate: Date.now() + 14 * 7 * 24 * 60 * 60 * 1000, // 14 weeks
      elevation: 6500,
      terrainType: "trail",
    },
    constraints: {
      preferredLongRunDay: "Saturday",
    },
  },

  {
    id: "comeback-10k",
    name: "James - Comeback Runner",
    description: "Former competitive runner returning after knee surgery, conservative 10K goal in 10 weeks",
    profile: {
      experience: "intermediate",
      weeklyMileage: 12,
      longestRun: 5,
      marathonPR: "3:05:00", // From before injury
      currentFitness: "Rebuilding after 6 months off from knee surgery",
      background: "Ran competitively in college, 10+ years experience before injury",
      injuries: "ACL reconstruction 8 months ago, cleared for full activity 2 months ago",
    },
    goal: {
      raceDistance: "10K",
      targetTime: "45:00", // Conservative given history
      raceName: "Comeback 10K",
      raceDate: Date.now() + 10 * 7 * 24 * 60 * 60 * 1000, // 10 weeks
      terrainType: "road",
    },
    constraints: {
      requiredRestDays: ["Monday", "Friday"], // Extra recovery
      maxWeeklyHours: 6,
    },
  },

  {
    id: "busy-professional",
    name: "Lisa - Time-Crunched Professional",
    description: "Busy executive, limited time but motivated, wants to run a half marathon in 10 weeks",
    profile: {
      experience: "intermediate",
      weeklyMileage: 20,
      longestRun: 8,
      currentFitness: "Decent base but inconsistent due to work travel",
      background: "Running for 3 years, mostly short runs before work",
      injuries: "None",
    },
    goal: {
      raceDistance: "Half Marathon",
      targetTime: "2:00:00",
      raceName: "Corporate Challenge Half",
      raceDate: Date.now() + 10 * 7 * 24 * 60 * 60 * 1000, // 10 weeks
      terrainType: "road",
    },
    constraints: {
      maxWeeklyHours: 5, // Very limited time
      preferredLongRunDay: "Sunday",
      requiredRestDays: ["Wednesday"], // Travel day
    },
  },

  {
    id: "base-builder",
    name: "Tom - Just Get Faster",
    description: "No specific race, just wants to improve overall fitness and get faster over 8 weeks",
    profile: {
      experience: "beginner",
      weeklyMileage: 18,
      longestRun: 7,
      background: "Started running during pandemic, enjoys it but wants structure",
      injuries: "None",
    },
    goal: {
      raceDistance: "General Fitness", // No specific race
      terrainType: "mixed",
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getAthleteById(id: string): TestAthlete | undefined {
  return testAthletes.find(a => a.id === id);
}

export function getAthletesByExperience(level: "beginner" | "intermediate" | "advanced"): TestAthlete[] {
  return testAthletes.filter(a => a.profile.experience === level);
}
