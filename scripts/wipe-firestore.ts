#!/usr/bin/env npx tsx
/**
 * Wipe all data from Firestore.
 * Recursively deletes all documents in all collections.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  } as ServiceAccount;

  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function deleteCollection(collectionPath: string): Promise<number> {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.listDocuments();
  let count = 0;

  for (const docRef of snapshot) {
    // Recursively delete subcollections first
    const subcollections = await docRef.listCollections();
    for (const sub of subcollections) {
      count += await deleteCollection(sub.path);
    }

    await docRef.delete();
    count++;
  }

  return count;
}

async function main() {
  console.log(`🔥 Wiping Firestore database: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

  // List all root collections
  const collections = await db.listCollections();
  const collectionNames = collections.map((c) => c.id);

  console.log(`Found ${collectionNames.length} root collections: ${collectionNames.join(", ")}`);

  let totalDeleted = 0;
  for (const col of collections) {
    const deleted = await deleteCollection(col.path);
    console.log(`  ✓ ${col.id}: ${deleted} documents deleted`);
    totalDeleted += deleted;
  }

  console.log(`\n✅ Done. Deleted ${totalDeleted} total documents.`);
}

main().catch(console.error);
