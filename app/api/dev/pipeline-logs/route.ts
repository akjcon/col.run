import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAdminDb } from "@/lib/firebase-admin";

const ALLOWED_EMAILS = ["jconsenstein@gmail.com"];

/**
 * GET /api/dev/pipeline-logs?userId=xxx
 * GET /api/dev/pipeline-logs?userId=xxx&planId=yyy
 *
 * Returns pipeline logs (traces, review results, evaluation) for debugging.
 * Restricted to admin emails.
 */
export async function GET(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const email = user.primaryEmailAddress?.emailAddress;
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId") || clerkUserId;
  const planId = req.nextUrl.searchParams.get("planId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const db = getAdminDb();
  const logsRef = db.collection("users").doc(userId).collection("pipelineLogs");

  if (planId) {
    const doc = await logsRef.doc(planId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }
    return NextResponse.json(doc.data());
  }

  // List recent logs
  const snapshot = await logsRef.orderBy("createdAt", "desc").limit(10).get();
  const logs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({ logs });
}
