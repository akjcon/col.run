/**
 * Strava Activity Sync
 *
 * Syncs activities from Strava and calculates fitness metrics.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { syncActivities, buildExperienceProfile } from "@/lib/strava";
import type { StravaTokens } from "@/lib/strava";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { buildAthleteSnapshot } from "@/lib/athlete-snapshot";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();

    // Get Strava tokens from Firestore
    const stravaRef = db.collection("users").doc(userId).collection("integrations").doc("strava");
    const stravaSnap = await stravaRef.get();

    if (!stravaSnap.exists) {
      return NextResponse.json(
        { error: "Strava not connected. Please connect your Strava account." },
        { status: 400 }
      );
    }

    const stravaData = stravaSnap.data()!;
    const tokens: StravaTokens = {
      access_token: stravaData.accessToken,
      refresh_token: stravaData.refreshToken,
      expires_at: stravaData.expiresAt,
      token_type: "Bearer",
    };

    // Callback to update tokens if they're refreshed
    const onTokenRefresh = async (newTokens: StravaTokens) => {
      await stravaRef.update({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: newTokens.expires_at,
      });
    };

    // Mark sync in progress
    await stravaRef.update({ syncStatus: "syncing" });

    // Sync activities
    const result = await syncActivities(tokens, userId, {
      weeks: 12,
      onTokenRefresh,
    });

    // Store activities in Firestore using batched writes
    const activitiesRef = db.collection("users").doc(userId).collection("activities");
    const batch = db.batch();

    for (const activity of result.activities) {
      const activityRef = activitiesRef.doc(activity.id);
      // Remove undefined values (Firestore doesn't accept them)
      const cleanActivity = Object.fromEntries(
        Object.entries(activity).filter(([, v]) => v !== undefined)
      );
      batch.set(activityRef, {
        ...cleanActivity,
        syncedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // Store fitness profile
    const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
    await fitnessRef.set({
      ...result.fitnessProfile,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Build experience profile from Strava lifetime stats
    if (stravaData.athleteId) {
      try {
        const experienceProfile = await buildExperienceProfile(
          tokens,
          userId,
          stravaData.athleteId,
          { onTokenRefresh }
        );
        const expRef = db
          .collection("users")
          .doc(userId)
          .collection("fitness")
          .doc("experience");
        await expRef.set({
          ...experienceProfile,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.warn("Could not build experience profile:", err);
      }
    }

    // Mark sync complete + update last sync time
    await stravaRef.update({
      lastSyncAt: FieldValue.serverTimestamp(),
      syncStatus: "complete",
    });

    // Rebuild athlete snapshot with all new data
    try {
      await buildAthleteSnapshot(userId);
    } catch (err) {
      console.warn("Could not rebuild athlete snapshot:", err);
    }

    return NextResponse.json({
      success: true,
      syncedCount: result.syncedCount,
      totalStravaActivities: result.totalStravaActivities,
      fitnessProfile: {
        ctl: result.fitnessProfile.ctl,
        atl: result.fitnessProfile.atl,
        tsb: result.fitnessProfile.tsb,
        weeklyMileage: result.fitnessProfile.weeklyMileage,
        longestRun: result.fitnessProfile.longestRun,
      },
    });
  } catch (error) {
    console.error("Error syncing Strava activities:", error);
    return NextResponse.json(
      { error: "Failed to sync activities" },
      { status: 500 }
    );
  }
}
