import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildAthleteSnapshot } from "@/lib/athlete-snapshot";

export async function POST(req: NextRequest) {
  try {
    const { userId, thresholdPace } = await req.json();

    if (!userId || typeof thresholdPace !== "number") {
      return NextResponse.json(
        { error: "userId and thresholdPace are required" },
        { status: 400 }
      );
    }

    // Validate range
    const clamped = Math.max(4, Math.min(20, thresholdPace));

    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(userId);

    // Read the latest training background
    const bgSnap = await userRef
      .collection("backgrounds")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (bgSnap.empty) {
      return NextResponse.json(
        { error: "No training background found" },
        { status: 404 }
      );
    }

    // Update the existing background doc with the new threshold pace
    const bgDoc = bgSnap.docs[0];
    await bgDoc.ref.update({ thresholdPace: clamped });

    // Rebuild the athlete snapshot so the new threshold propagates everywhere
    await buildAthleteSnapshot(userId);

    return NextResponse.json({ success: true, thresholdPace: clamped });
  } catch (error) {
    console.error("Threshold pace update error:", error);
    return NextResponse.json(
      { error: "Failed to update threshold pace" },
      { status: 500 }
    );
  }
}
