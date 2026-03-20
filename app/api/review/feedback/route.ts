import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { processReviewFeedback } from "@/lib/agents/checklist-updater";
import { loadChecklistFromFirestore } from "@/lib/agents/checklist-loader";

// Initialize Firebase Admin
initializeFirebaseAdmin();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      planId,
      overallRating,
      volumeAssessment,
      longRunAssessment,
      recoveryAssessment,
      notes,
      athleteExperience,
      raceType,
    } = body;

    if (!planId || !overallRating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getFirestore();

    const feedbackDoc = {
      planId,
      createdAt: Date.now(),
      overallRating,
      volumeAssessment: volumeAssessment || "appropriate",
      longRunAssessment: longRunAssessment || "appropriate",
      recoveryAssessment: recoveryAssessment || "appropriate",
      notes: notes || "",
      athleteExperience: athleteExperience || "unknown",
      raceType: raceType || "unknown",
    };

    const docRef = await db.collection("planFeedback").add(feedbackDoc);

    // Process feedback through LLM to potentially update reviewer checklist
    let checklistUpdated = false;
    let updateCount = 0;
    try {
      const currentChecklist = await loadChecklistFromFirestore();
      const result = await processReviewFeedback(
        {
          overallRating,
          volumeAssessment: volumeAssessment || "appropriate",
          longRunAssessment: longRunAssessment || "appropriate",
          recoveryAssessment: recoveryAssessment || "appropriate",
          notes: notes || "",
          athleteExperience: athleteExperience || "unknown",
          raceType: raceType || "unknown",
        },
        currentChecklist
      );

      if (result.changed) {
        const checklistDoc = await db.doc("reviewChecklist/current").get();
        const currentVersion = checklistDoc.exists ? (checklistDoc.data()?.version || 0) : 0;

        await db.doc("reviewChecklist/current").set({
          items: result.items,
          updatedAt: Date.now(),
          version: currentVersion + 1,
          lastUpdateReason: result.reasoning,
        });

        checklistUpdated = true;
        updateCount = result.items.length - currentChecklist.length;
        console.log(`[Feedback] Checklist updated: ${result.reasoning}`);
      } else {
        console.log(`[Feedback] No checklist changes: ${result.reasoning}`);
      }
    } catch (err) {
      // Non-fatal — feedback is saved even if checklist update fails
      console.warn("[Feedback] Checklist update failed:", err);
    }

    return NextResponse.json({
      success: true,
      feedbackId: docRef.id,
      checklistUpdated,
      checklistUpdateCount: updateCount,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch feedback for aggregation
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const db = getFirestore();

    const snapshot = await db
      .collection("planFeedback")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const feedback = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
