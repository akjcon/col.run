/**
 * Race Requirements
 *
 * Defines what different race types actually need in terms of training.
 * These are evidence-based targets from running literature.
 */

// =============================================================================
// Race Requirement Profiles
// =============================================================================

export interface RaceRequirements {
  /** Race type identifier */
  raceType: string;
  /** Race distance in miles */
  distanceMiles: number;
  /** Target peak weekly mileage (experienced runner) */
  peakWeeklyMileage: { min: number; ideal: number; max: number };
  /** Target peak long run distance */
  peakLongRun: { min: number; ideal: number; max: number };
  /** Minimum weeks needed for proper preparation */
  minWeeksNeeded: {
    fromScratch: number; // Starting from low/no base
    withBase: number; // Already has solid base
    maintenance: number; // Already at race fitness
  };
  /** Key workouts required */
  keyWorkouts: string[];
  /** Special considerations */
  considerations: string[];
}

export const RACE_REQUIREMENTS: Record<string, RaceRequirements> = {
  "5k": {
    raceType: "5k",
    distanceMiles: 3.1,
    peakWeeklyMileage: { min: 15, ideal: 25, max: 40 },
    peakLongRun: { min: 6, ideal: 8, max: 12 },
    minWeeksNeeded: { fromScratch: 8, withBase: 6, maintenance: 4 },
    keyWorkouts: ["intervals", "tempo", "strides"],
    considerations: ["Speed-focused", "VO2max development important"],
  },

  "10k": {
    raceType: "10k",
    distanceMiles: 6.2,
    peakWeeklyMileage: { min: 20, ideal: 35, max: 50 },
    peakLongRun: { min: 8, ideal: 12, max: 16 },
    minWeeksNeeded: { fromScratch: 10, withBase: 8, maintenance: 4 },
    keyWorkouts: ["tempo", "intervals", "progression runs"],
    considerations: ["Balance of speed and endurance"],
  },

  half: {
    raceType: "half marathon",
    distanceMiles: 13.1,
    peakWeeklyMileage: { min: 25, ideal: 40, max: 60 },
    peakLongRun: { min: 10, ideal: 14, max: 16 },
    minWeeksNeeded: { fromScratch: 12, withBase: 10, maintenance: 6 },
    keyWorkouts: ["tempo", "long run", "marathon pace work"],
    considerations: ["Aerobic endurance focus", "Threshold development"],
  },

  marathon: {
    raceType: "marathon",
    distanceMiles: 26.2,
    peakWeeklyMileage: { min: 35, ideal: 50, max: 80 },
    peakLongRun: { min: 16, ideal: 20, max: 23 },
    minWeeksNeeded: { fromScratch: 18, withBase: 12, maintenance: 8 },
    keyWorkouts: ["long run", "marathon pace", "progressive long runs"],
    considerations: ["High aerobic volume", "Fueling practice", "Mental prep"],
  },

  "50k": {
    raceType: "50k",
    distanceMiles: 31,
    peakWeeklyMileage: { min: 35, ideal: 45, max: 55 },
    peakLongRun: { min: 16, ideal: 20, max: 22 },
    minWeeksNeeded: { fromScratch: 20, withBase: 14, maintenance: 10 },
    keyWorkouts: ["long run", "back-to-back long runs", "hill training"],
    considerations: [
      "Time on feet more important than pace",
      "Back-to-back weekends: split long run across Sat+Sun",
    ],
  },

  "50mi": {
    raceType: "50 mile",
    distanceMiles: 50,
    peakWeeklyMileage: { min: 50, ideal: 70, max: 100 },
    peakLongRun: { min: 22, ideal: 28, max: 35 },
    minWeeksNeeded: { fromScratch: 24, withBase: 16, maintenance: 12 },
    keyWorkouts: ["long run", "back-to-back long runs", "night running", "vert training"],
    considerations: [
      "Time on feet paramount",
      "Back-to-back weekends essential",
      "Practice race-day nutrition",
      "Crew/aid station strategy",
    ],
  },

  "100k": {
    raceType: "100k",
    distanceMiles: 62,
    peakWeeklyMileage: { min: 55, ideal: 75, max: 110 },
    peakLongRun: { min: 26, ideal: 32, max: 40 },
    minWeeksNeeded: { fromScratch: 30, withBase: 20, maintenance: 14 },
    keyWorkouts: ["long run", "back-to-back long runs", "overnight training"],
    considerations: [
      "Multi-day recovery important",
      "Night running experience needed",
      "Extensive fueling strategy",
    ],
  },

  "100mi": {
    raceType: "100 mile",
    distanceMiles: 100,
    peakWeeklyMileage: { min: 60, ideal: 80, max: 120 },
    peakLongRun: { min: 28, ideal: 35, max: 50 },
    minWeeksNeeded: { fromScratch: 36, withBase: 24, maintenance: 16 },
    keyWorkouts: ["long run", "back-to-back long runs", "overnight runs", "multi-day efforts"],
    considerations: [
      "Previous ultra experience strongly recommended",
      "Sleep deprivation training",
      "Crew management skills",
      "Mental fortitude training",
    ],
  },
};

/**
 * Get race requirements for a given race type
 */
export function getRaceRequirements(raceType: string): RaceRequirements | undefined {
  const normalized = raceType.toLowerCase().replace(/\s+/g, "").replace("marathon", "");

  // Direct match
  if (RACE_REQUIREMENTS[normalized]) {
    return RACE_REQUIREMENTS[normalized];
  }

  // Try common variations
  if (normalized.includes("50k") || normalized === "50km") {
    return RACE_REQUIREMENTS["50k"];
  }
  if (normalized.includes("50mi") || normalized.includes("50mile")) {
    return RACE_REQUIREMENTS["50mi"];
  }
  if (normalized.includes("100k") || normalized === "100km") {
    return RACE_REQUIREMENTS["100k"];
  }
  if (normalized.includes("100mi") || normalized.includes("100mile")) {
    return RACE_REQUIREMENTS["100mi"];
  }
  if (normalized.includes("half") || normalized === "13.1") {
    return RACE_REQUIREMENTS["half"];
  }
  if (normalized.includes("marathon") || normalized === "26.2" || normalized === "full") {
    return RACE_REQUIREMENTS["marathon"];
  }
  if (normalized === "10k" || normalized === "10km") {
    return RACE_REQUIREMENTS["10k"];
  }
  if (normalized === "5k" || normalized === "5km") {
    return RACE_REQUIREMENTS["5k"];
  }

  return undefined;
}

/**
 * Adjust race requirements based on elevation
 * Note: We DON'T increase mileage requirements for elevation.
 * Hill training is about specificity (hill workouts), not more volume.
 */
export function adjustForElevation(
  requirements: RaceRequirements,
  elevationGain: number
): RaceRequirements {
  // Don't increase volume for elevation - just add considerations
  return {
    ...requirements,
    considerations: [
      ...requirements.considerations,
      `${elevationGain.toLocaleString()}ft elevation - include hill-specific training`,
    ],
  };
}
