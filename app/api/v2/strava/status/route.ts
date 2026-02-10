/**
 * Strava Connection Status
 *
 * Returns the current Strava connection status and basic info.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();

    // Check for Strava integration
    const stravaRef = db.collection("users").doc(userId).collection("integrations").doc("strava");
    const stravaSnap = await stravaRef.get();

    if (!stravaSnap.exists) {
      return NextResponse.json({
        connected: false,
      });
    }

    const stravaData = stravaSnap.data()!;

    // Get fitness profile if available
    const fitnessRef = db.collection("users").doc(userId).collection("fitness").doc("profile");
    const fitnessSnap = await fitnessRef.get();
    const fitnessData = fitnessSnap.exists ? fitnessSnap.data() : null;

    return NextResponse.json({
      connected: true,
      athleteId: stravaData.athleteId,
      athleteName: stravaData.athleteName,
      athleteProfile: stravaData.athleteProfile,
      connectedAt: stravaData.connectedAt?.toDate?.() || stravaData.connectedAt,
      lastSyncAt: stravaData.lastSyncAt?.toDate?.() || stravaData.lastSyncAt,
      fitnessProfile: fitnessData
        ? {
            ctl: fitnessData.ctl,
            atl: fitnessData.atl,
            tsb: fitnessData.tsb,
            weeklyMileage: fitnessData.weeklyMileage,
            weeklyVolume: fitnessData.weeklyVolume,
            longestRun: fitnessData.longestRun,
            avgPace: fitnessData.avgPace,
          }
        : null,
    });
  } catch (error) {
    console.error("Error checking Strava status:", error);
    return NextResponse.json(
      { error: "Failed to check Strava status" },
      { status: 500 }
    );
  }
}
