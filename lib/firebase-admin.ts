/**
 * Firebase Admin SDK
 *
 * Server-side Firebase access with admin privileges.
 */

import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
  App,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Cache the Firestore instance on globalThis so it survives Next.js dev
// hot-reloads and module-scope isolation across route bundles. Calling
// `settings()` twice on the same Firestore instance throws, which is what
// happened when different API routes each tried to re-initialize.
const globalForFirebase = globalThis as typeof globalThis & {
  __colrunAdminApp?: App;
  __colrunAdminDb?: Firestore;
};

function getAdminApp(): App {
  if (globalForFirebase.__colrunAdminApp) return globalForFirebase.__colrunAdminApp;

  if (getApps().length > 0) {
    globalForFirebase.__colrunAdminApp = getApps()[0];
    return globalForFirebase.__colrunAdminApp;
  }

  const requiredEnvVars = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
  };

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

  globalForFirebase.__colrunAdminApp = initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
    projectId: requiredEnvVars.projectId,
  });

  return globalForFirebase.__colrunAdminApp;
}

export function getAdminDb(): Firestore {
  if (globalForFirebase.__colrunAdminDb) return globalForFirebase.__colrunAdminDb;
  getAdminApp();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  globalForFirebase.__colrunAdminDb = db;
  return db;
}

/**
 * Initialize Firebase Admin SDK (call once at startup)
 */
export function initializeFirebaseAdmin(): void {
  getAdminApp();
}
