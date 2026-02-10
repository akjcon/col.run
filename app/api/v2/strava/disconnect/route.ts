/**
 * Strava Disconnect
 *
 * Revokes Strava access and removes stored tokens.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { deauthorize } from "@/lib/strava";
import { getAdminDb } from "@/lib/firebase-admin";

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
        { error: "Strava not connected" },
        { status: 400 }
      );
    }

    const stravaData = stravaSnap.data()!;

    // Revoke access on Strava's side
    try {
      await deauthorize(stravaData.accessToken);
    } catch (error) {
      // Continue even if deauth fails - token might already be invalid
      console.warn("Failed to deauthorize on Strava side:", error);
    }

    // Delete the stravaAthletes index for webhook lookup
    if (stravaData.athleteId) {
      try {
        await db
          .collection("stravaAthletes")
          .doc(String(stravaData.athleteId))
          .delete();
      } catch (err) {
        console.warn("Failed to delete stravaAthletes index:", err);
      }
    }

    // Delete the stored tokens
    await stravaRef.delete();

    return NextResponse.json({
      success: true,
      message: "Strava disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Strava:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Strava" },
      { status: 500 }
    );
  }
}
