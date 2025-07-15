import { config } from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
} from "firebase/firestore";

// Load environment variables from .env.local
config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("🔥 Firebase Config:");
console.log("Project ID:", firebaseConfig.projectId);
console.log("Auth Domain:", firebaseConfig.authDomain);
console.log(
  "API Key:",
  firebaseConfig.apiKey ? "✅ Set" : "❌ Missing"
);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testConnection() {
  try {
    console.log("\n🔍 Testing connection to old user...");
    const oldUserRef = doc(
      db,
      "users",
      "user_2zbjUKRVRuJbPggLxvbHbHcDQWz"
    );
    const oldUserSnap = await getDoc(oldUserRef);

    if (oldUserSnap.exists()) {
      console.log("✅ Old user document found!");
      console.log(
        "Data keys:",
        Object.keys(oldUserSnap.data())
      );
    } else {
      console.log("❌ Old user document not found");
    }

    console.log("\n🔍 Testing connection to new user...");
    const newUserRef = doc(
      db,
      "users",
      "user_2zhDTlKzaI69yf4zsqkTSc8eveB"
    );
    const newUserSnap = await getDoc(newUserRef);

    if (newUserSnap.exists()) {
      console.log("✅ New user document found!");
      console.log(
        "Data keys:",
        Object.keys(newUserSnap.data())
      );
    } else {
      console.log(
        "ℹ️  New user document not found (this is expected)"
      );
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error);
  }
}

testConnection();
