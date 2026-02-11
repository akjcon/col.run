/**
 * Strava API Types
 */

export interface StravaActivity {
  id: number;
  name: string;
  type: "Run" | "Trail Run" | "Virtual Run" | "Workout" | string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  start_date: string;
  start_date_local: string;
  average_speed: number; // meters/second
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  elev_high?: number;
  elev_low?: number;
  suffer_score?: number;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  created_at?: string;
  premium?: boolean;
  weight?: number; // kg
  ftp?: number; // Functional Threshold Power
  shoes?: StravaGear[];
}

export interface StravaGear {
  id: string;
  name: string;
  primary: boolean;
  distance: number; // meters
  resource_state: number;
}

export interface StravaActivityTotals {
  count: number;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  elevation_gain: number; // meters
  achievement_count?: number;
}

export interface StravaAthleteStats {
  all_run_totals: StravaActivityTotals;
  all_ride_totals: StravaActivityTotals;
  all_swim_totals: StravaActivityTotals;
  recent_run_totals: StravaActivityTotals;
  recent_ride_totals: StravaActivityTotals;
  recent_swim_totals: StravaActivityTotals;
  ytd_run_totals: StravaActivityTotals;
  ytd_ride_totals: StravaActivityTotals;
  ytd_swim_totals: StravaActivityTotals;
  biggest_ride_distance: number; // meters
  biggest_climb_elevation_gain: number; // meters
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in seconds
  token_type: "Bearer";
}

export interface StravaTokenResponse extends StravaTokens {
  athlete?: StravaAthlete;
}

// Our internal format for storing activities
export interface Activity {
  id: string;
  stravaId: number;
  userId: string;
  name: string;
  type: string;
  date: number; // Unix timestamp ms
  distance: number; // miles
  duration: number; // minutes
  elevation: number; // feet
  avgPace: number; // min/mile
  avgHeartRate?: number;
  maxHeartRate?: number;
  tss?: number; // Training Stress Score
}

// Fitness metrics (current state - last 12 weeks)
export interface FitnessProfile {
  userId: string;
  updatedAt: number;
  ctl: number; // Chronic Training Load (42-day)
  atl: number; // Acute Training Load (7-day)
  tsb: number; // Training Stress Balance (CTL - ATL)
  weeklyVolume: number; // minutes
  weeklyMileage: number; // miles
  longestRun: number; // miles (last 12 weeks)
  avgPace: number; // min/mile
  estimatedThresholdHR?: number;
  estimatedThresholdPace?: number; // min/mile
}

// Experience profile (lifetime data - what they're capable of)
export interface ExperienceProfile {
  userId: string;
  updatedAt: number;

  // Lifetime totals
  lifetimeMiles: number;
  lifetimeRuns: number;
  lifetimeElevationFeet: number;
  accountAgeYears: number;

  // Peak performances (from extended history)
  longestRunEver: number; // miles
  peakWeeklyMileage: number; // miles
  peakMonthlyMileage: number; // miles
  biggestClimbFeet: number;

  // Derived experience level
  experienceLevel: "beginner" | "intermediate" | "advanced" | "elite";
  ultraExperience: boolean; // Has runs > 26.2 miles
  trailExperience: boolean; // Has significant trail/elevation runs

  // Shoe data (proxy for recent training volume)
  totalShoeMileage: number; // Sum of all shoe distances
}
