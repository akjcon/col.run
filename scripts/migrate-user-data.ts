import { config } from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Firebase config - make sure to use your production config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OLD_USER_ID = "user_2zbjUKRVRuJbPggLxvbHbHcDQWz";
const NEW_USER_ID = "user_2zhDTlKzaI69yf4zsqkTSc8eveB";

async function migrateUserData() {
  console.log(`🔄 Starting migration from ${OLD_USER_ID} to ${NEW_USER_ID}`);

  try {
    // Step 1: Copy main user document
    console.log("📄 Copying main user document...");
    const oldUserRef = doc(db, "users", OLD_USER_ID);
    const oldUserSnap = await getDoc(oldUserRef);

    if (oldUserSnap.exists()) {
      const userData = oldUserSnap.data();

      // Update the user ID in the data
      const newUserData = {
        ...userData,
        id: NEW_USER_ID,
      };

      const newUserRef = doc(db, "users", NEW_USER_ID);
      await setDoc(newUserRef, newUserData);
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

      const oldCollectionRef = collection(
        db,
        "users",
        OLD_USER_ID,
        subcollectionName
      );
      const oldCollectionSnap = await getDocs(oldCollectionRef);

      if (!oldCollectionSnap.empty) {
        const batch = writeBatch(db);
        let docCount = 0;

        oldCollectionSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();

          // Update userId in the data if it exists
          const newData = {
            ...data,
            ...(data.userId && { userId: NEW_USER_ID }),
          };

          const newDocRef = doc(
            db,
            "users",
            NEW_USER_ID,
            subcollectionName,
            docSnap.id
          );
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

    for (const subcollectionName of subcollections) {
      console.log(`🗑️  Deleting ${subcollectionName}...`);

      const oldCollectionRef = collection(
        db,
        "users",
        OLD_USER_ID,
        subcollectionName
      );
      const oldCollectionSnap = await getDocs(oldCollectionRef);

      if (!oldCollectionSnap.empty) {
        const batch = writeBatch(db);

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
    const oldUserRef = doc(db, "users", OLD_USER_ID);
    await deleteDoc(oldUserRef);
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
