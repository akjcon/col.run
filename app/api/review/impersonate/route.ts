import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

initializeFirebaseAdmin();

/**
 * POST /api/review/impersonate
 * Copies a plan from generatedPlans into the current user's trainingPlans
 * and sets it as the active plan.
 *
 * Body: { planId: string }
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();
    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const db = getFirestore();

    // Fetch the generated plan
    const genDoc = await db.collection("generatedPlans").doc(planId).get();
    if (!genDoc.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const genData = genDoc.data()!;
    const planData = genData.plan;
    const raceGoal = genData.raceGoal;

    if (!planData || !planData.weeks) {
      return NextResponse.json({ error: "Plan has no weeks" }, { status: 400 });
    }

    // Find and deactivate existing plans, save the previous active plan ID
    const planRef = db.collection("users").doc(userId).collection("trainingPlans");
    const existingPlans = await planRef.where("isActive", "==", true).get();
    const previousPlanId = existingPlans.docs.length > 0 ? existingPlans.docs[0].id : null;

    const batch = db.batch();
    existingPlans.docs.forEach((doc) => {
      batch.update(doc.ref, { isActive: false });
    });

    // Create the new plan
    const newPlanRef = planRef.doc();
    batch.set(newPlanRef, {
      id: newPlanRef.id,
      userId,
      totalWeeks: planData.totalWeeks,
      weeks: planData.weeks,
      phases: planData.phases || [],
      startDate: Date.now(),
      generatedAt: Date.now(),
      raceDate: raceGoal?.raceDate || null,
      raceName: raceGoal?.raceName || null,
      isActive: true,
      impersonatedFrom: planId,
      previousPlanId: previousPlanId,
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      newPlanId: newPlanRef.id,
      previousPlanId,
    });
  } catch (error) {
    console.error("[Impersonate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to impersonate plan" },
      { status: 500 }
    );
  }
}
