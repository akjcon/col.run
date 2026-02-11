/**
 * Strava API Client
 *
 * Handles OAuth flow and API requests to Strava.
 */

import type {
  StravaActivity,
  StravaAthlete,
  StravaTokens,
  StravaTokenResponse,
  StravaAthleteStats,
} from "./types";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_BASE = "https://www.strava.com/oauth";

// =============================================================================
// Configuration
// =============================================================================

function getConfig() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET environment variables");
  }

  return { clientId, clientSecret };
}

// =============================================================================
// OAuth Functions
// =============================================================================

/**
 * Generate the Strava OAuth authorization URL
 */
export function getAuthorizationUrl(redirectUri: string, state?: string): string {
  const { clientId } = getConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,activity:read_all",
    approval_prompt: "auto",
  });

  if (state) {
    params.set("state", state);
  }

  return `${STRAVA_OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeToken(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getConfig();

  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange token: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshToken(refreshToken: string): Promise<StravaTokens> {
  const { clientId, clientSecret } = getConfig();

  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

/**
 * Revoke access (disconnect)
 */
export async function deauthorize(accessToken: string): Promise<void> {
  const response = await fetch(`${STRAVA_OAUTH_BASE}/deauthorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to deauthorize: ${error}`);
  }
}

// =============================================================================
// API Client
// =============================================================================

export class StravaClient {
  private accessToken: string;
  private refreshTokenValue: string;
  private expiresAt: number;
  private onTokenRefresh?: (tokens: StravaTokens) => Promise<void>;

  constructor(
    tokens: StravaTokens,
    onTokenRefresh?: (tokens: StravaTokens) => Promise<void>
  ) {
    this.accessToken = tokens.access_token;
    this.refreshTokenValue = tokens.refresh_token;
    this.expiresAt = tokens.expires_at;
    this.onTokenRefresh = onTokenRefresh;
  }

  /**
   * Ensure we have a valid access token, refreshing if needed
   */
  private async ensureValidToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // Refresh if token expires in less than 5 minutes
    if (this.expiresAt - now < 300) {
      const newTokens = await refreshToken(this.refreshTokenValue);
      this.accessToken = newTokens.access_token;
      this.refreshTokenValue = newTokens.refresh_token;
      this.expiresAt = newTokens.expires_at;

      if (this.onTokenRefresh) {
        await this.onTokenRefresh(newTokens);
      }
    }

    return this.accessToken;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await this.ensureValidToken();

    const response = await fetch(`${STRAVA_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Strava rate limit exceeded. Please try again later.");
      }
      const error = await response.text();
      throw new Error(`Strava API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Get authenticated athlete
   */
  async getAthlete(): Promise<StravaAthlete> {
    return this.request<StravaAthlete>("/athlete");
  }

  /**
   * Get activities with pagination
   */
  async getActivities(params?: {
    before?: number; // Unix timestamp
    after?: number; // Unix timestamp
    page?: number;
    per_page?: number;
  }): Promise<StravaActivity[]> {
    const searchParams = new URLSearchParams();

    if (params?.before) searchParams.set("before", params.before.toString());
    if (params?.after) searchParams.set("after", params.after.toString());
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.per_page) searchParams.set("per_page", params.per_page.toString());

    const query = searchParams.toString();
    return this.request<StravaActivity[]>(`/athlete/activities${query ? `?${query}` : ""}`);
  }

  /**
   * Get all activities since a date (handles pagination)
   */
  async getAllActivitiesSince(afterDate: Date): Promise<StravaActivity[]> {
    const after = Math.floor(afterDate.getTime() / 1000);
    const allActivities: StravaActivity[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const activities = await this.getActivities({
        after,
        page,
        per_page: perPage,
      });

      if (activities.length === 0) break;

      allActivities.push(...activities);

      if (activities.length < perPage) break;
      page++;

      // Safety limit
      if (page > 20) {
        console.warn("Reached pagination limit (2000 activities)");
        break;
      }
    }

    return allActivities;
  }

  /**
   * Get a single activity by ID
   */
  async getActivity(id: number): Promise<StravaActivity> {
    return this.request<StravaActivity>(`/activities/${id}`);
  }

  /**
   * Get athlete stats (all-time, YTD, recent totals)
   */
  async getAthleteStats(athleteId: number): Promise<StravaAthleteStats> {
    return this.request<StravaAthleteStats>(`/athletes/${athleteId}/stats`);
  }

  /**
   * Get detailed athlete profile (includes shoes, weight, etc.)
   */
  async getDetailedAthlete(): Promise<StravaAthlete> {
    return this.request<StravaAthlete>("/athlete");
  }
}
