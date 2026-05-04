/**
 * Coach Memory — persistent notes about athletes across chat sessions
 *
 * Pure CRUD logic is separated from Firestore I/O for testability.
 */

import { getAdminDb } from "@/lib/firebase-admin";
import type { CoachMemoryEntry } from "@/lib/types";

export interface CoachMemoryUpdate {
  additions?: string[];
  updates?: { id: string; content: string }[];
  removals?: string[];
}

const MAX_ENTRIES = 30;

/**
 * Pure function: apply additions, updates, and removals to an entries array.
 * Returns a new array — does not mutate the input.
 */
export function applyMemoryUpdate(
  entries: CoachMemoryEntry[],
  input: CoachMemoryUpdate,
  now = Date.now()
): CoachMemoryEntry[] {
  let result = [...entries];

  // Process removals
  if (input.removals?.length) {
    const removeSet = new Set(input.removals);
    result = result.filter((e) => !removeSet.has(e.id));
  }

  // Process updates
  if (input.updates?.length) {
    for (const update of input.updates) {
      const idx = result.findIndex((e) => e.id === update.id);
      if (idx !== -1) {
        result[idx] = { ...result[idx], content: update.content, updatedAt: now };
      }
    }
  }

  // Process additions (cap at MAX_ENTRIES)
  if (input.additions?.length) {
    for (const content of input.additions) {
      if (result.length >= MAX_ENTRIES) break;
      result.push({
        id: `m_${now}_${Math.random().toString(36).slice(2, 8)}`,
        content,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return result;
}

// =============================================================================
// Firestore I/O
// =============================================================================

export async function readCoachMemory(userId: string): Promise<CoachMemoryEntry[]> {
  try {
    const db = getAdminDb();
    const doc = await db
      .collection("users")
      .doc(userId)
      .collection("coachMemory")
      .doc("notes")
      .get();

    if (!doc.exists) return [];
    const data = doc.data()!;
    return (data.entries as CoachMemoryEntry[]) || [];
  } catch (error) {
    console.warn("Could not read coach memory:", error);
    return [];
  }
}

export async function executeCoachMemoryUpdate(
  userId: string,
  input: CoachMemoryUpdate
): Promise<string> {
  try {
    const db = getAdminDb();
    const docRef = db
      .collection("users")
      .doc(userId)
      .collection("coachMemory")
      .doc("notes");

    const doc = await docRef.get();
    const existing: CoachMemoryEntry[] = doc.exists
      ? (doc.data()!.entries as CoachMemoryEntry[]) || []
      : [];

    const entries = applyMemoryUpdate(existing, input);

    await docRef.set({ entries, updatedAt: Date.now() });
    return JSON.stringify({ success: true, totalNotes: entries.length });
  } catch (error) {
    console.error("Failed to update coach memory:", error);
    return JSON.stringify({ error: String(error) });
  }
}
