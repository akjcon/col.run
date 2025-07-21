/**
 * User Data Migration Script - REVERSE MIGRATION
 *
 * This script migrates all data from one user to another in Firestore.
 *
 * Source User: user_2zbjUKRVRuJbPggLxvbHbHcDQWz (dev)
 * Target User: user_2zhDTlKzaI69yf4zsqkTSc8eveB (prod - RESTORING)
 *
 * Usage:
 *   npm run migrate-user migrate              # Copy data from source to target
 *   npm run migrate-user cleanup --confirm    # Delete source user data after verification
 */

import { config } from "dotenv";
import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Initialize Firebase Admin SDK
if (!getApps().length) {
  // Validate required environment variables
  const requiredEnvVars = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
  };

  // Check if any required env vars are missing
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  const serviceAccount = {
    type: "service_account",
    project_id: requiredEnvVars.projectId!,
    private_key_id: requiredEnvVars.privateKeyId!,
    private_key: requiredEnvVars.privateKey!.replace(/\\n/g, "\n"),
    client_email: requiredEnvVars.clientEmail!,
    client_id: requiredEnvVars.clientId!,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${requiredEnvVars.clientEmail}`,
  };

  initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
    projectId: requiredEnvVars.projectId,
  });
}

const db = getFirestore();

const OLD_USER_ID = "user_2zbjUKRVRuJbPggLxvbHbHcDQWz"; // dev user (source)
const NEW_USER_ID = "user_2zhDTlKzaI69yf4zsqkTSc8eveB"; // prod user (target - restoring)

async function migrateUserData() {
  console.log(`🔄 Starting migration from ${OLD_USER_ID} to ${NEW_USER_ID}`);

  try {
    // Step 1: Copy main user document
    console.log("📄 Copying main user document...");
    const oldUserRef = db.collection("users").doc(OLD_USER_ID);
    const oldUserSnap = await oldUserRef.get();

    if (oldUserSnap.exists) {
      const userData = oldUserSnap.data();

      // Update the user ID in the data
      const newUserData = {
        ...userData,
        id: NEW_USER_ID,
      };

      const newUserRef = db.collection("users").doc(NEW_USER_ID);
      await newUserRef.set(newUserData);
      console.log("✅ Main user document copied");
    } else {
      console.log("❌ Main user document not found");
    }

    // Step 2: Copy subcollections
    const subcollections = [
      "backgrounds",
      "trainingPlans",
      "chatHistory",
      "workoutCompletions",
    ];

    for (const subcollectionName of subcollections) {
      console.log(`📁 Copying ${subcollectionName}...`);

      const oldCollectionRef = oldUserRef.collection(subcollectionName);
      const oldCollectionSnap = await oldCollectionRef.get();

      if (!oldCollectionSnap.empty) {
        const batch = db.batch();
        let docCount = 0;

        oldCollectionSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();

          // Update userId in the data if it exists
          const newData = {
            ...data,
            ...(data.userId && { userId: NEW_USER_ID }),
          };

          const newDocRef = db
            .collection("users")
            .doc(NEW_USER_ID)
            .collection(subcollectionName)
            .doc(docSnap.id);
          batch.set(newDocRef, newData);
          docCount++;
        });

        await batch.commit();
        console.log(
          `✅ Copied ${docCount} documents from ${subcollectionName}`
        );
      } else {
        console.log(`ℹ️  No documents found in ${subcollectionName}`);
      }
    }

    console.log("🎉 Migration completed successfully!");
    console.log(
      "🔍 Please verify the data in the Firebase console before running cleanup."
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

async function cleanupOldUser() {
  console.log(`🧹 Starting cleanup of old user ${OLD_USER_ID}`);

  try {
    // Delete subcollections first
    const subcollections = [
      "backgrounds",
      "trainingPlans",
      "chatHistory",
      "workoutCompletions",
    ];

    const oldUserRef = db.collection("users").doc(OLD_USER_ID);

    for (const subcollectionName of subcollections) {
      console.log(`🗑️  Deleting ${subcollectionName}...`);

      const oldCollectionRef = oldUserRef.collection(subcollectionName);
      const oldCollectionSnap = await oldCollectionRef.get();

      if (!oldCollectionSnap.empty) {
        const batch = db.batch();

        oldCollectionSnap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        await batch.commit();
        console.log(
          `✅ Deleted ${oldCollectionSnap.size} documents from ${subcollectionName}`
        );
      }
    }

    // Delete main user document
    console.log("🗑️  Deleting main user document...");
    await oldUserRef.delete();
    console.log("✅ Main user document deleted");

    console.log("🎉 Cleanup completed!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "migrate") {
    await migrateUserData();
  } else if (command === "cleanup") {
    const confirm = args[1];
    if (confirm === "--confirm") {
      await cleanupOldUser();
    } else {
      console.log(
        "⚠️  To cleanup old user data, run: npm run migrate-user cleanup --confirm"
      );
      console.log(
        "⚠️  WARNING: This will permanently delete the old user's data!"
      );
    }
  } else {
    console.log("Usage:");
    console.log(
      "  npm run migrate-user migrate    # Copy data from old user to new user"
    );
    console.log(
      "  npm run migrate-user cleanup --confirm   # Delete old user data (after verification)"
    );
  }
}

main().catch(console.error);
