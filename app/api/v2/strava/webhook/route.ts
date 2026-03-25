/**
 * Strava Webhook Endpoint
 *
 * GET  — Strava subscription verification (echo hub.challenge)
 * POST — Activity event processing (create/update)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncSingleActivity } from "@/lib/strava/sync";
import { processActivityWebhook } from "@/lib/strava/webhook-pipeline";
import type { StravaTokens } from "@/lib/strava";

const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || "col-run-strava";

/**
 * GET — Strava subscription verification
 * Strava sends a GET with hub.mode, hub.challenge, hub.verify_token
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");

  if (mode === "subscribe" && verifyToken === VERIFY_TOKEN && challenge) {
    console.log("Strava webhook subscription verified");
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Activity and athlete events from Strava
 */
export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    // Handle athlete deauthorization
    if (event.object_type === "athlete" && event.aspect_type === "update"
        && event.updates?.authorized === "false") {
      return handleDeauthorization(event.owner_id);
    }

    // Only handle activity create/update events
    if (event.object_type !== "activity") {
      return NextResponse.json({ ok: true });
    }
    if (event.aspect_type !== "create" && event.aspect_type !== "update") {
      return NextResponse.json({ ok: true });
    }

    const ownerId: number = event.owner_id;
    const activityId: number = event.object_id;

    console.log(
      `Strava webhook: ${event.aspect_type} activity ${activityId} from athlete ${ownerId}`
    );

    const db = getAdminDb();

    // Look up userId from stravaAthletes index
    const athleteDoc = await db
      .collection("stravaAthletes")
      .doc(String(ownerId))
      .get();

    if (!athleteDoc.exists) {
      console.warn(`No user found for Strava athlete ${ownerId}`);
      return NextResponse.json({ ok: true });
    }

    const userId: string = athleteDoc.data()!.userId;

    // Get Strava tokens
    const stravaRef = db
      .collection("users")
      .doc(userId)
      .collection("integrations")
      .doc("strava");
    const stravaSnap = await stravaRef.get();

    if (!stravaSnap.exists) {
      console.warn(`Strava not connected for user ${userId}`);
      return NextResponse.json({ ok: true });
    }

    const stravaData = stravaSnap.data()!;
    const tokens: StravaTokens = {
      access_token: stravaData.accessToken,
      refresh_token: stravaData.refreshToken,
      expires_at: stravaData.expiresAt,
      token_type: "Bearer",
    };

    const onTokenRefresh = async (newTokens: StravaTokens) => {
      await stravaRef.update({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: newTokens.expires_at,
      });
    };

    // Fetch the single activity from Strava
    const activity = await syncSingleActivity(tokens, userId, activityId, {
      onTokenRefresh,
    });

    // Process through shared pipeline: store → match → log → analyze → snapshot
    await processActivityWebhook(activity, userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Strava webhook error:", error);
    // Always return 200 to Strava to prevent retries
    return NextResponse.json({ ok: true });
  }
}

/**
 * Handle Strava deauthorization — user revoked access from Strava's side.
 * Cleans up stored tokens, activities, and athlete index.
 */
async function handleDeauthorization(ownerId: number) {
  console.log(`Strava webhook: deauthorization for athlete ${ownerId}`);

  try {
    const db = getAdminDb();

    // Look up userId from stravaAthletes index
    const athleteDoc = await db
      .collection("stravaAthletes")
      .doc(String(ownerId))
      .get();

    if (!athleteDoc.exists) {
      console.warn(`No user found for deauthorized Strava athlete ${ownerId}`);
      return NextResponse.json({ ok: true });
    }

    const userId: string = athleteDoc.data()!.userId;

    // Delete Strava integration tokens
    await db
      .collection("users")
      .doc(userId)
      .collection("integrations")
      .doc("strava")
      .delete();

    // Delete synced activities
    const activitiesSnap = await db
      .collection("users")
      .doc(userId)
      .collection("activities")
      .limit(500)
      .get();

    if (!activitiesSnap.empty) {
      const batch = db.batch();
      activitiesSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    // Delete fitness profile and experience derived from Strava
    const fitnessRef = db.collection("users").doc(userId).collection("fitness");
    const fitnessDocs = await fitnessRef.listDocuments();
    if (fitnessDocs.length > 0) {
      const batch = db.batch();
      fitnessDocs.forEach((doc) => batch.delete(doc));
      await batch.commit();
    }

    // Delete stravaAthletes index entry
    await db.collection("stravaAthletes").doc(String(ownerId)).delete();

    console.log(`Strava deauthorization complete for user ${userId} (athlete ${ownerId})`);
  } catch (error) {
    console.error("Strava deauthorization error:", error);
  }

  return NextResponse.json({ ok: true });
}
