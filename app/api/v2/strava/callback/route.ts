/**
 * Strava OAuth Callback
 *
 * Handles the OAuth callback from Strava, exchanges code for tokens,
 * stores them in Firestore, and kicks off an activity sync in the background.
 */

import { auth } from "@clerk/nextjs/server";
import { after, NextResponse } from "next/server";
import {
  exchangeToken,
  syncActivities,
  buildExperienceProfile,
} from "@/lib/strava";
import type { StravaTokens } from "@/lib/strava";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { buildAthleteSnapshot } from "@/lib/athlete-snapshot";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Parse state to get userId and returnTo
    const [stateUserId, returnTo = "home"] = (state || "").split(":");

    // Determine redirect destination
    const getRedirectUrl = (path: string, params?: Record<string, string>) => {
      const redirectUrl = new URL(path, url.origin);
      if (params) {
        Object.entries(params).forEach(([k, v]) => redirectUrl.searchParams.set(k, v));
      }
      return redirectUrl.toString();
    };

    const errorRedirect = returnTo === "onboarding" ? "/onboarding" : "/settings";

    // Check for OAuth errors
    if (error) {
      console.error("Strava OAuth error:", error);
      return NextResponse.redirect(
        getRedirectUrl(errorRedirect, { strava_error: error })
      );
    }

    // Verify user is authenticated
    if (!userId) {
      return NextResponse.redirect(getRedirectUrl("/sign-in"));
    }

    // Verify state matches userId
    if (stateUserId !== userId) {
      console.error("State mismatch:", { stateUserId, userId });
      return NextResponse.redirect(
        getRedirectUrl(errorRedirect, { strava_error: "invalid_state" })
      );
    }

    // Verify we have an authorization code
    if (!code) {
      return NextResponse.redirect(
        getRedirectUrl(errorRedirect, { strava_error: "no_code" })
      );
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeToken(code);

    // Store tokens and athlete info in Firestore using Admin SDK
    const db = getAdminDb();
    const stravaRef = db.collection("users").doc(userId).collection("integrations").doc("strava");

    await stravaRef.set({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_at,
      athleteId: tokenResponse.athlete?.id,
      athleteName: tokenResponse.athlete
        ? `${tokenResponse.athlete.firstname} ${tokenResponse.athlete.lastname}`
        : null,
      athleteProfile: tokenResponse.athlete?.profile,
      connectedAt: FieldValue.serverTimestamp(),
      lastSyncAt: null,
      syncStatus: "syncing", // Signal that background sync is in progress
    });

    // Write stravaAthletes index for O(1) webhook user lookup
    if (tokenResponse.athlete?.id) {
      await db
        .collection("stravaAthletes")
        .doc(String(tokenResponse.athlete.id))
        .set({ userId });
    }

    // Kick off activity sync + snapshot build in the background
    // Runs after the response is sent so user isn't blocked
    const tokens: StravaTokens = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: tokenResponse.expires_at,
      token_type: "Bearer",
    };
    const athleteId = tokenResponse.athlete?.id;

    after(async () => {
      const bgStravaRef = db
        .collection("users")
        .doc(userId)
        .collection("integrations")
        .doc("strava");

      try {
        console.log(`[Strava callback] Starting background sync for user ${userId}`);

        const onTokenRefresh = async (newTokens: StravaTokens) => {
          await bgStravaRef.update({
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            expiresAt: newTokens.expires_at,
          });
        };

        // Sync 12 weeks of activities
        const result = await syncActivities(tokens, userId, {
          weeks: 12,
          onTokenRefresh,
        });

        // Store activities
        const activitiesRef = db.collection("users").doc(userId).collection("activities");
        const batch = db.batch();
        for (const activity of result.activities) {
          const activityRef = activitiesRef.doc(activity.id);
          const cleanActivity = Object.fromEntries(
            Object.entries(activity).filter(([, v]) => v !== undefined)
          );
          batch.set(activityRef, { ...cleanActivity, syncedAt: FieldValue.serverTimestamp() });
        }
        await batch.commit();

        // Store fitness profile
        const cleanProfile = Object.fromEntries(
          Object.entries(result.fitnessProfile).filter(([, v]) => v !== undefined)
        );
        await db.collection("users").doc(userId).collection("fitness").doc("profile").set({
          ...cleanProfile,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Build experience profile
        if (athleteId) {
          try {
            const exp = await buildExperienceProfile(tokens, userId, athleteId, { onTokenRefresh });
            await db.collection("users").doc(userId).collection("fitness").doc("experience").set({
              ...exp,
              updatedAt: FieldValue.serverTimestamp(),
            });
          } catch (err) {
            console.warn("[Strava callback] Experience profile failed:", err);
          }
        }

        // Mark sync complete + update last sync time
        await bgStravaRef.update({
          lastSyncAt: FieldValue.serverTimestamp(),
          syncStatus: "complete",
        });

        // Build athlete snapshot
        await buildAthleteSnapshot(userId);

        console.log(`[Strava callback] Background sync complete: ${result.syncedCount} activities`);
      } catch (err) {
        console.error("[Strava callback] Background sync failed:", err);
        try {
          await bgStravaRef.update({ syncStatus: "error" });
        } catch { /* ignore */ }
      }
    });

    // Redirect based on where user came from
    const successRedirect = returnTo === "onboarding" ? "/onboarding" : "/home";
    return NextResponse.redirect(
      getRedirectUrl(successRedirect, { strava_connected: "true" })
    );
  } catch (error) {
    console.error("Error handling Strava callback:", error);
    const url = new URL(request.url);
    return NextResponse.redirect(
      `${url.origin}/settings?strava_error=exchange_failed`
    );
  }
}
