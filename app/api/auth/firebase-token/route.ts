import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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

export async function POST() {
  try {
    // Verify the user is authenticated with Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a Firebase custom token for this user
    const adminAuth = getAuth();
    const customToken = await adminAuth.createCustomToken(userId);

    return NextResponse.json({
      firebaseToken: customToken,
    });
  } catch (error) {
    console.error("Error creating Firebase custom token:", error);
    return NextResponse.json(
      { error: "Failed to create Firebase token" },
      { status: 500 }
    );
  }
}
