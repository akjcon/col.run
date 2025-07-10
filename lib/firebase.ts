import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  // These will be environment variables
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth (we'll use this for custom tokens from Clerk)
export const auth = getAuth(app);

// Connect to emulator in development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  const isEmulatorConnected = localStorage.getItem(
    "firebase-emulator-connected"
  );

  if (!isEmulatorConnected) {
    try {
      connectFirestoreEmulator(db, "localhost", 8080);
      connectAuthEmulator(auth, "http://localhost:9099");
      localStorage.setItem("firebase-emulator-connected", "true");
    } catch (error) {
      // Emulator connection failed, continue with production
      console.log("Firebase emulator not running, using production:", error);
    }
  }
}

export default app;
