import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

// Initialize Firebase Admin
initializeFirebaseAdmin();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getFirestore();

    const snapshot = await db
      .collection("generatedPlans")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const plans = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        athleteName: data.athleteName,
        raceGoal: data.raceGoal,
        evaluation: {
          overall: data.evaluation?.overall || 0,
        },
        createdAt: data.createdAt,
        generationTimeMs: data.generationTimeMs || 0,
        status: data.status || "complete",
      };
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
