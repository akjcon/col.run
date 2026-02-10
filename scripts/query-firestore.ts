#!/usr/bin/env npx tsx
/**
 * Firestore Query Tool
 *
 * Usage:
 *   npx tsx scripts/query-firestore.ts <collection-path> [--limit N]
 *
 * Examples:
 *   npx tsx scripts/query-firestore.ts users
 *   npx tsx scripts/query-firestore.ts users/USER_ID/integrations
 *   npx tsx scripts/query-firestore.ts users/USER_ID/activities --limit 5
 *   npx tsx scripts/query-firestore.ts users/USER_ID/fitness/profile
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

// Initialize Firebase Admin
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
  };

  initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log(`
Firestore Query Tool

Usage:
  npx tsx scripts/query-firestore.ts <path> [options]

Options:
  --limit N    Limit results (for collections)
  --json       Output raw JSON

Examples:
  npx tsx scripts/query-firestore.ts users
  npx tsx scripts/query-firestore.ts users/USER_ID/integrations/strava
  npx tsx scripts/query-firestore.ts users/USER_ID/activities --limit 5
`);
    process.exit(0);
  }

  const path = args[0];
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 20;
  const jsonOutput = args.includes("--json");

  const pathParts = path.split("/").filter(Boolean);
  const isDocument = pathParts.length % 2 === 0;

  try {
    if (isDocument) {
      // Query a document
      const docRef = db.doc(path);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`Document not found: ${path}`);
        process.exit(1);
      }

      const data = doc.data();
      if (jsonOutput) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`\n📄 Document: ${path}\n`);
        console.log(formatData(data));
      }
    } else {
      // Query a collection
      const colRef = db.collection(path);
      const snapshot = await colRef.limit(limit).get();

      if (snapshot.empty) {
        console.log(`No documents in collection: ${path}`);
        process.exit(0);
      }

      if (jsonOutput) {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(JSON.stringify(docs, null, 2));
      } else {
        console.log(`\n📁 Collection: ${path} (${snapshot.size} documents)\n`);
        for (const doc of snapshot.docs) {
          console.log(`--- ${doc.id} ---`);
          console.log(formatData(doc.data()));
          console.log();
        }
      }
    }
  } catch (error) {
    console.error("Error querying Firestore:", error);
    process.exit(1);
  }
}

function formatData(data: any, indent = 0): string {
  if (!data) return "null";

  const pad = "  ".repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      lines.push(`${pad}${key}: null`);
    } else if (typeof value === "object" && value.constructor?.name === "Timestamp") {
      lines.push(`${pad}${key}: ${(value as any).toDate().toISOString()}`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      lines.push(formatData(value, indent + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${pad}${key}: [${value.length} items]`);
    } else {
      const displayValue = typeof value === "string" && value.length > 100
        ? value.substring(0, 100) + "..."
        : value;
      lines.push(`${pad}${key}: ${displayValue}`);
    }
  }

  return lines.join("\n");
}

main();
