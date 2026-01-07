import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables
process.env.ANTHROPIC_API_KEY = "test-api-key";
process.env.STRAVA_CLIENT_ID = "test-client-id";
process.env.STRAVA_CLIENT_SECRET = "test-client-secret";

// Mock Firebase Admin (we'll mock the actual Firebase module separately)
vi.mock("firebase-admin", () => ({
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
  },
  firestore: vi.fn(() => ({
    collection: vi.fn(),
    doc: vi.fn(),
  })),
}));

// Global test utilities
declare global {
  var testUtils: {
    createMockPlan: typeof createMockPlan;
    createMockActivity: typeof createMockActivity;
    createMockAthlete: typeof createMockAthlete;
  };
}

// Helper to create mock training plan
function createMockPlan(overrides: Partial<any> = {}): any {
  return {
    id: "test-plan-id",
    userId: "test-user-id",
    totalWeeks: 12,
    weeks: Array.from({ length: 12 }, (_, i) => ({
      weekNumber: i + 1,
      phase: i < 6 ? "base" : i < 10 ? "build" : "taper",
      days: Array.from({ length: 7 }, (_, d) => ({
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ][d],
        blocks: d === 0 ? [{ type: "rest", value: 0, effortLevel: "z1" }] : [],
      })),
    })),
    ...overrides,
  };
}

// Helper to create mock Strava activity
function createMockActivity(overrides: Partial<any> = {}): any {
  return {
    id: Math.floor(Math.random() * 1000000),
    name: "Morning Run",
    type: "Run",
    distance: 8046.72, // 5 miles in meters
    moving_time: 2700, // 45 minutes
    elapsed_time: 2800,
    total_elevation_gain: 50,
    start_date: new Date().toISOString(),
    average_heartrate: 145,
    max_heartrate: 165,
    average_speed: 2.98, // ~8:00/mile
    ...overrides,
  };
}

// Helper to create mock athlete profile
function createMockAthlete(overrides: Partial<any> = {}): any {
  return {
    id: "test-athlete-id",
    experience: "intermediate",
    weeklyMileage: 35,
    longestRun: 15,
    goals: {
      raceDistance: "Marathon",
      targetTime: "3:30:00",
    },
    ...overrides,
  };
}

// Make helpers globally available
globalThis.testUtils = {
  createMockPlan,
  createMockActivity,
  createMockAthlete,
};
