import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";

// Initialize Firebase Admin
initializeFirebaseAdmin();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const db = getFirestore();

    const doc = await db.collection("generatedPlans").doc(planId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const data = doc.data();

    return NextResponse.json({
      plan: {
        id: doc.id,
        ...data,
      },
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
