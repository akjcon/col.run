import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { TrainingPlan } from "../lib/types";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Initialize Firebase Admin
let app;
try {
  app = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
} catch (error) {
  console.error("Error initializing Firebase:", error);
  process.exit(1);
}

const db = getFirestore(app);

async function backupTrainingPlan() {
  const userId = process.argv[2];
  const planId = process.argv[3] || "default-plan";

  if (!userId) {
    console.error("Usage: npm run backup-plan <userId> [planId]");
    process.exit(1);
  }

  console.log(
    `\n💾 Backing up training plan for user: ${userId}, plan: ${planId}\n`
  );

  try {
    // Fetch the current plan
    const plansRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans");

    const planQuery = await plansRef.where("id", "==", planId).limit(1).get();

    if (planQuery.empty) {
      throw new Error(`Plan with id '${planId}' not found for user ${userId}`);
    }

    const plan = planQuery.docs[0].data() as TrainingPlan;

    // Create backups directory if it doesn't exist
    const backupsDir = join(process.cwd(), "backups");
    await mkdir(backupsDir, { recursive: true });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `training-plan-${userId}-${planId}-${timestamp}.json`;
    const filepath = join(backupsDir, filename);

    // Save to file
    await writeFile(filepath, JSON.stringify(plan, null, 2), "utf-8");

    console.log("✅ Backup created successfully!");
    console.log(`📁 File: ${filepath}`);
    console.log(`📊 Plan: ${plan.planType}`);
    console.log(`📅 Weeks: ${plan.weeks.length} of ${plan.totalWeeks}`);

    // Also create a "latest" symlink for easy access
    const latestPath = join(
      backupsDir,
      `training-plan-${userId}-${planId}-latest.json`
    );
    try {
      await writeFile(latestPath, JSON.stringify(plan, null, 2), "utf-8");
      console.log(`🔗 Latest backup: ${latestPath}`);
    } catch {
      // Ignore symlink errors on Windows
    }
  } catch (error) {
    console.error("\n❌ Error backing up training plan:", error);
    process.exit(1);
  }
}

// Run the script
backupTrainingPlan()
  .then(() => {
    console.log("\n✅ Backup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
