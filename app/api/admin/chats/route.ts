import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin, isAdminEmail } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const RECENT_MESSAGES_SCAN = 500;

interface ChatSummary {
  userId: string;
  email: string;
  name: string;
  messageCount: number;
  lastMessageAt: number;
  lastUserMessage: string | null;
}

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();

  // Bounded scan: a chatty user with 500 recent messages can crowd out other
  // users from the list — acceptable trade-off for keeping this cheap.
  const [usersSnap, msgSnap] = await Promise.all([
    db.collection("users").select("email", "name").get(),
    db
      .collectionGroup("chatHistory")
      .orderBy("timestamp", "desc")
      .limit(RECENT_MESSAGES_SCAN)
      .get(),
  ]);

  const profiles = new Map<string, { email: string; name: string }>();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    profiles.set(doc.id, {
      email: (data.email as string) || "",
      name: (data.name as string) || "",
    });
  }

  const summaries = new Map<string, ChatSummary>();
  for (const doc of msgSnap.docs) {
    const userId = doc.ref.parent.parent?.id;
    if (!userId) continue;
    const profile = profiles.get(userId);
    if (!profile) continue;
    if (isAdminEmail(profile.email)) continue;

    const data = doc.data() as {
      role?: string;
      content?: string;
      timestamp?: { toMillis: () => number };
    };
    const ts = data.timestamp?.toMillis() ?? 0;

    let summary = summaries.get(userId);
    if (!summary) {
      summary = {
        userId,
        email: profile.email,
        name: profile.name,
        messageCount: 0,
        lastMessageAt: 0,
        lastUserMessage: null,
      };
      summaries.set(userId, summary);
    }
    summary.messageCount++;
    if (ts > summary.lastMessageAt) summary.lastMessageAt = ts;
    if (
      summary.lastUserMessage === null &&
      data.role === "user" &&
      typeof data.content === "string"
    ) {
      summary.lastUserMessage = data.content;
    }
  }

  const list = Array.from(summaries.values()).sort(
    (a, b) => b.lastMessageAt - a.lastMessageAt
  );

  return NextResponse.json({
    users: list,
    scanned: msgSnap.size,
    truncated: msgSnap.size === RECENT_MESSAGES_SCAN,
  });
}
