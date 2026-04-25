import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

const ADMIN_EMAILS = ["jconsenstein@gmail.com"];

async function verifyAdmin() {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress;
  if (!email || !ADMIN_EMAILS.some((a) => email.startsWith(a.split("@")[0]))) {
    return null;
  }
  return userId;
}

/**
 * GET /api/dev/impersonate — list users for the impersonation picker
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("users").get();

    const users = snapshot.docs.map((doc) => ({
      userId: doc.id,
      name: doc.data().name || "",
      email: doc.data().email || "",
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Impersonate list error:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

/**
 * POST /api/dev/impersonate — get a Firebase custom token for the target user
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
    }

    // Verify target user exists in Firestore
    const db = getAdminDb();
    const userDoc = await db.doc(`users/${targetUserId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create Firebase custom token for the target user
    const firebaseToken = await getAuth().createCustomToken(targetUserId);

    return NextResponse.json({
      firebaseToken,
      user: {
        userId: userDoc.id,
        name: userDoc.data()?.name || "",
        email: userDoc.data()?.email || "",
      },
    });
  } catch (error) {
    console.error("Impersonate token error:", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
