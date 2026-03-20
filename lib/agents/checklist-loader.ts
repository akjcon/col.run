/**
 * Checklist Loader
 *
 * Loads the reviewer checklist from Firestore.
 * Used by the ReviewerAgent at runtime and by the checklist API.
 */

import { REVIEW_CHECKLIST } from "./review-checklist";
import type { ChecklistItem } from "./review-checklist";

/**
 * Load checklist from Firestore. Returns empty array if unavailable.
 * Uses dynamic import to avoid issues with Firebase Admin in edge runtime.
 */
export async function loadChecklistFromFirestore(): Promise<ChecklistItem[]> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    const doc = await db.doc("reviewChecklist/current").get();

    if (doc.exists && doc.data()?.items) {
      return doc.data()!.items as ChecklistItem[];
    }

    // Seed if missing
    await db.doc("reviewChecklist/current").set({
      items: REVIEW_CHECKLIST,
      updatedAt: Date.now(),
      version: 1,
    });

    return REVIEW_CHECKLIST;
  } catch {
    return [];
  }
}
