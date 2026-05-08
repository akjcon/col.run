import { getAdminDb } from "@/lib/firebase-admin";
import { getDeployEnv, type EventType } from "@/lib/events";

interface RecordServerEventParams {
  userId: string;
  eventType: EventType;
  realUserId: string | null;
  metadata?: Record<string, unknown>;
}

// Best-effort: failures here should never break the request that triggered them.
export async function recordServerEvent({
  userId,
  eventType,
  realUserId,
  metadata,
}: RecordServerEventParams): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection("userEvents").add({
      userId,
      eventType,
      isImpersonating: realUserId !== null && realUserId !== userId,
      ...(metadata ? { metadata } : {}),
      timestamp: Date.now(),
      env: getDeployEnv(),
      realUserId,
    });
  } catch (err) {
    console.error("Failed to record server event:", err);
  }
}
