import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin, isAdminEmail } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const THREAD_MESSAGE_LIMIT = 500;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const db = getAdminDb();

  // Fetch the most recent N messages, then reverse to chronological order.
  // Using `asc` here would return the OLDEST N — useless for an active user.
  const [userDoc, msgSnap] = await Promise.all([
    db.collection("users").doc(userId).get(),
    db
      .collection("users")
      .doc(userId)
      .collection("chatHistory")
      .orderBy("timestamp", "desc")
      .limit(THREAD_MESSAGE_LIMIT)
      .get(),
  ]);

  if (!userDoc.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userData = userDoc.data() ?? {};
  const email = (userData.email as string) || "";
  if (isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = msgSnap.docs
    .map((doc) => {
      const data = doc.data() as {
        role: "user" | "assistant";
        content: string;
        timestamp: { toMillis: () => number };
      };
      return {
        id: doc.id,
        role: data.role,
        content: data.content,
        timestamp: data.timestamp.toMillis(),
      };
    })
    .reverse();

  return NextResponse.json({
    user: {
      userId,
      email,
      name: (userData.name as string) || "",
    },
    messages,
    truncated: messages.length === THREAD_MESSAGE_LIMIT,
  });
}
