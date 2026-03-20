import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { REVIEW_CHECKLIST } from "@/lib/agents/review-checklist";
import type { ChecklistItem } from "@/lib/agents/review-checklist";

initializeFirebaseAdmin();

const CHECKLIST_DOC = "reviewChecklist/current";

/**
 * GET /api/review/checklist
 * Returns the current reviewer checklist from Firestore.
 * Seeds from the static file if it doesn't exist yet.
 */
export async function GET() {
  try {
    const db = getFirestore();
    const doc = await db.doc(CHECKLIST_DOC).get();

    if (doc.exists) {
      return NextResponse.json({ items: doc.data()!.items });
    }

    // Seed from static checklist
    await db.doc(CHECKLIST_DOC).set({
      items: REVIEW_CHECKLIST,
      updatedAt: Date.now(),
      version: 1,
    });

    return NextResponse.json({ items: REVIEW_CHECKLIST });
  } catch (error) {
    console.error("Error fetching checklist:", error);
    return NextResponse.json({ error: "Failed to fetch checklist" }, { status: 500 });
  }
}

/**
 * PUT /api/review/checklist
 * Updates the reviewer checklist in Firestore.
 */
export async function PUT(request: Request) {
  try {
    const { items } = (await request.json()) as { items: ChecklistItem[] };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing items array" }, { status: 400 });
    }

    const db = getFirestore();
    const doc = await db.doc(CHECKLIST_DOC).get();
    const currentVersion = doc.exists ? (doc.data()!.version || 0) : 0;

    await db.doc(CHECKLIST_DOC).set({
      items,
      updatedAt: Date.now(),
      version: currentVersion + 1,
    });

    return NextResponse.json({ success: true, version: currentVersion + 1 });
  } catch (error) {
    console.error("Error updating checklist:", error);
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}
