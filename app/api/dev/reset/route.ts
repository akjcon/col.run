import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// Per-user subcollections to wipe. Top-level cleanup (stravaAthletes mapping,
// userEvents) is handled separately below.
const SUBCOLLECTIONS = [
  "backgrounds",
  "trainingPlans",
  "chatHistory",
  "workoutLogs",
  "integrations",
  "activities",
  "athleteSnapshot",
  "fitness",
  "coachMemory",
  "pipelineLogs",
];

export async function POST() {
  try {
    const userId = await verifyAdmin();
    if (!userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getAdminDb();

    // Look up the Strava athleteId BEFORE we wipe integrations — otherwise we
    // can't clean up the top-level stravaAthletes/{athleteId} → userId mapping,
    // which would let a re-connect re-attach activities to a ghost account.
    const stravaIntegrationSnap = await db
      .collection("users")
      .doc(userId)
      .collection("integrations")
      .doc("strava")
      .get();
    const athleteId = stravaIntegrationSnap.data()?.athleteId as
      | number
      | string
      | undefined;

    // Wipe per-user subcollections in parallel. recursiveDelete handles
    // pagination (>500 docs) and nested subcollections automatically — the
    // old batched approach would have silently failed on users with a real
    // Strava history once `activities` was added to the list.
    await Promise.all(
      SUBCOLLECTIONS.map((sub) =>
        db.recursiveDelete(
          db.collection("users").doc(userId).collection(sub)
        )
      )
    );

    // Top-level cleanup: stravaAthletes mapping (keyed by athleteId, not userId).
    if (athleteId !== undefined) {
      await db
        .collection("stravaAthletes")
        .doc(String(athleteId))
        .delete()
        .catch(() => {});
    }

    // Delete the user profile document itself.
    await db.doc(`users/${userId}`).delete().catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dev reset error:", error);
    return NextResponse.json(
      { error: "Reset failed" },
      { status: 500 }
    );
  }
}
