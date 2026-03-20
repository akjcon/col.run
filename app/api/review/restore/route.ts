import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

initializeFirebaseAdmin();

/**
 * POST /api/review/restore
 * Restores the previous plan that was active before impersonation.
 * Deletes the impersonated plan and reactivates the previous one.
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getFirestore();
    const planRef = db.collection("users").doc(userId).collection("trainingPlans");

    // Find the current active plan (should be the impersonated one)
    const activePlans = await planRef.where("isActive", "==", true).get();
    if (activePlans.empty) {
      return NextResponse.json({ error: "No active plan" }, { status: 400 });
    }

    const activePlan = activePlans.docs[0];
    const activeData = activePlan.data();
    const previousPlanId = activeData.previousPlanId;

    if (!previousPlanId) {
      return NextResponse.json({ error: "No previous plan to restore" }, { status: 400 });
    }

    const batch = db.batch();

    // Deactivate (and delete) the impersonated plan
    batch.delete(activePlan.ref);

    // Reactivate the previous plan
    const prevPlanRef = planRef.doc(previousPlanId);
    batch.update(prevPlanRef, { isActive: true });

    await batch.commit();

    return NextResponse.json({
      success: true,
      restoredPlanId: previousPlanId,
    });
  } catch (error) {
    console.error("[Restore] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore plan" },
      { status: 500 }
    );
  }
}
