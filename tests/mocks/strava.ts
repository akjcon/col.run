import { vi } from "vitest";

// Strava API types
export interface StravaActivity {
  id: number;
  name: string;
  type: "Run" | "Trail Run" | "Virtual Run" | "Workout";
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
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  city: string;
  state: string;
  country: string;
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: "Bearer";
}

// Generate mock activities for testing
export function generateMockActivities(
  weeks: number = 12,
  pattern: "consistent" | "building" | "overtraining" | "inconsistent" = "consistent"
): StravaActivity[] {
  const activities: StravaActivity[] = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;

  for (let week = 0; week < weeks; week++) {
    const runsThisWeek = pattern === "inconsistent" ? Math.floor(Math.random() * 5) + 1 : 4;

    for (let run = 0; run < runsThisWeek; run++) {
      const dayOffset = Math.floor(run * (7 / runsThisWeek));
      const date = new Date(now - (weeks - week) * oneWeek + dayOffset * oneDay);

      let baseMiles: number;
      switch (pattern) {
        case "building":
          baseMiles = 4 + week * 0.5; // Gradual increase
          break;
        case "overtraining":
          baseMiles = 5 + week * 1.5; // Dangerous increase
          break;
        case "inconsistent":
          baseMiles = 3 + Math.random() * 8;
          break;
        default: // consistent
          baseMiles = 5 + Math.random() * 2;
      }

      const distance = baseMiles * 1609.34; // Convert to meters
      const pace = 8 + Math.random() * 2; // 8-10 min/mile
      const movingTime = (baseMiles * pace) * 60; // Convert to seconds

      activities.push({
        id: Math.floor(Math.random() * 10000000),
        name: run === runsThisWeek - 1 ? "Long Run" : "Morning Run",
        type: "Run",
        distance,
        moving_time: movingTime,
        elapsed_time: movingTime * 1.05,
        total_elevation_gain: baseMiles * 15, // ~50ft per mile
        start_date: date.toISOString(),
        start_date_local: date.toISOString(),
        average_speed: distance / movingTime,
        max_speed: (distance / movingTime) * 1.2,
        average_heartrate: 140 + Math.floor(Math.random() * 20),
        max_heartrate: 170 + Math.floor(Math.random() * 15),
        average_cadence: 165 + Math.floor(Math.random() * 10),
      });
    }
  }

  return activities.sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
}

// Mock Strava API client
export const mockStravaClient = {
  oauth: {
    getAuthorizationUrl: vi.fn().mockReturnValue(
      "https://www.strava.com/oauth/authorize?client_id=test&redirect_uri=http://localhost:3000/api/v2/strava/callback&response_type=code&scope=read,activity:read_all"
    ),
    exchangeToken: vi.fn().mockResolvedValue({
      access_token: "mock_access_token",
      refresh_token: "mock_refresh_token",
      expires_at: Math.floor(Date.now() / 1000) + 21600, // 6 hours from now
      token_type: "Bearer",
    } as StravaTokens),
    refreshToken: vi.fn().mockResolvedValue({
      access_token: "mock_refreshed_access_token",
      refresh_token: "mock_new_refresh_token",
      expires_at: Math.floor(Date.now() / 1000) + 21600,
      token_type: "Bearer",
    } as StravaTokens),
  },
  athlete: {
    get: vi.fn().mockResolvedValue({
      id: 12345,
      firstname: "Test",
      lastname: "Athlete",
      profile: "https://example.com/avatar.jpg",
      city: "San Francisco",
      state: "CA",
      country: "USA",
    } as StravaAthlete),
  },
  activities: {
    list: vi.fn().mockImplementation(async (params?: { page?: number; per_page?: number }) => {
      const allActivities = generateMockActivities(12, "consistent");
      const page = params?.page || 1;
      const perPage = params?.per_page || 30;
      const start = (page - 1) * perPage;
      return allActivities.slice(start, start + perPage);
    }),
    get: vi.fn().mockImplementation(async (id: number) => {
      return {
        id,
        name: "Mock Activity",
        type: "Run",
        distance: 8046.72,
        moving_time: 2700,
        elapsed_time: 2800,
        total_elevation_gain: 75,
        start_date: new Date().toISOString(),
        start_date_local: new Date().toISOString(),
        average_speed: 2.98,
        max_speed: 3.5,
        average_heartrate: 150,
        max_heartrate: 175,
      } as StravaActivity;
    }),
  },
};

// Set custom activities for testing
export function setMockActivities(activities: StravaActivity[]): void {
  mockStravaClient.activities.list.mockResolvedValue(activities);
}

// Simulate rate limiting
export function simulateRateLimit(): void {
  mockStravaClient.activities.list.mockRejectedValueOnce({
    message: "Rate Limit Exceeded",
    errors: [{ resource: "Application", code: "exceeded" }],
  });
}

// Reset all mocks
export function resetStravaMock(): void {
  Object.values(mockStravaClient.oauth).forEach((fn) => fn.mockClear());
  Object.values(mockStravaClient.athlete).forEach((fn) => fn.mockClear());
  Object.values(mockStravaClient.activities).forEach((fn) => fn.mockClear());
}
