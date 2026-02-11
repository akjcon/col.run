/**
 * Strava OAuth Connect
 *
 * Initiates the OAuth flow by returning the Strava authorization URL.
 * Accepts an optional `returnTo` query param to redirect after callback.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/strava";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const origin = url.origin;
    const returnTo = url.searchParams.get("returnTo") || "home";
    const redirectUri = `${origin}/api/v2/strava/callback`;

    // Encode userId and returnTo in state (separated by :)
    const state = `${userId}:${returnTo}`;
    const authUrl = getAuthorizationUrl(redirectUri, state);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error initiating Strava OAuth:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
