import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

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

    return NextResponse.json({
      success: true,
      feedbackId: docRef.id,
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
