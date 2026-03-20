import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdminDb } from "@/lib/firebase-admin";

const SUBCOLLECTIONS = [
  "backgrounds",
  "trainingPlans",
  "chatHistory",
  "workoutLogs",
  "integrations",
  "stravaAthletes",
];

async function deleteCollection(
  db: FirebaseFirestore.Firestore,
  collectionPath: string
): Promise<number> {
  const snapshot = await db.collection(collectionPath).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    let deleted = 0;

    // Delete all subcollections
    for (const sub of SUBCOLLECTIONS) {
      deleted += await deleteCollection(db, `users/${userId}/${sub}`);
    }

    // Delete the user profile document itself
    const userDoc = db.doc(`users/${userId}`);
    const userSnap = await userDoc.get();
    if (userSnap.exists) {
      await userDoc.delete();
      deleted += 1;
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Dev reset error:", error);
    return NextResponse.json(
      { error: "Reset failed" },
      { status: 500 }
    );
  }
}
