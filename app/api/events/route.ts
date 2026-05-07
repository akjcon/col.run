import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { isAdminClerkUserId } from "@/lib/admin-auth";
import { EVENT_TYPES, getDeployEnv, type ClientEvent } from "@/lib/events";

const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES);

// Firestore caps batched writes at 500. We're stricter — events should be
// trickling in, not arriving by the thousand from one client.
const MAX_BATCH_EVENTS = 100;

export async function POST(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { events?: ClientEvent[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) {
    return NextResponse.json({ written: 0 });
  }
  if (events.length > MAX_BATCH_EVENTS) {
    return NextResponse.json(
      { error: `Too many events (max ${MAX_BATCH_EVENTS})` },
      { status: 413 }
    );
  }

  const valid = events.filter(
    (e) =>
      e &&
      typeof e.userId === "string" &&
      e.userId.length > 0 &&
      typeof e.eventType === "string" &&
      EVENT_TYPE_SET.has(e.eventType)
  );

  if (valid.length === 0) {
    return NextResponse.json({ written: 0 });
  }

  // Impersonation lives in client-side localStorage, so the server can't see
  // it directly — but we can verify it: any event whose userId differs from
  // the Clerk session must come from an admin (the only role allowed to
  // impersonate). This blocks non-admin clients from spoofing events for
  // other users and prevents anyone from forging the isImpersonating flag.
  const hasMismatch = valid.some((e) => e.userId !== clerkUserId);
  if (hasMismatch && !(await isAdminClerkUserId(clerkUserId))) {
    return NextResponse.json(
      { error: "Cannot write events for another user" },
      { status: 403 }
    );
  }

  const env = getDeployEnv();
  const timestamp = Date.now();

  const db = getAdminDb();
  const batch = db.batch();
  const col = db.collection("userEvents");

  for (const e of valid) {
    const isImpersonating = e.userId !== clerkUserId;
    const ref = col.doc();
    batch.set(ref, {
      userId: e.userId,
      eventType: e.eventType,
      isImpersonating,
      ...(e.metadata ? { metadata: e.metadata } : {}),
      timestamp,
      env,
      realUserId: clerkUserId,
    });
  }

  await batch.commit();

  return NextResponse.json({ written: valid.length });
}
