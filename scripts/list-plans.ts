import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { TrainingPlan } from "../lib/types";
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

async function listTrainingPlans() {
  const userId = process.argv[2];

  if (!userId) {
    console.error("Usage: npm run list-plans <userId>");
    process.exit(1);
  }

  console.log(`\n📋 Listing all training plans for user: ${userId}\n`);

  try {
    const plansRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans");

    const snapshot = await plansRef.get();

    if (snapshot.empty) {
      console.log("No training plans found for this user.");
      return;
    }

    console.log(`Found ${snapshot.size} plan(s):\n`);

    let index = 0;
    snapshot.forEach((doc) => {
      const plan = doc.data() as TrainingPlan;
      console.log(`${index + 1}. Document ID: ${doc.id}`);
      console.log(`   Plan ID: ${plan.id}`);
      console.log(`   Type: ${plan.planType}`);
      console.log(`   Total Weeks: ${plan.totalWeeks}`);
      console.log(`   Weeks Generated: ${plan.weeks?.length || 0}`);
      console.log(
        `   Start Date: ${plan.startDate ? new Date(plan.startDate).toLocaleDateString() : "N/A"}`
      );
      console.log(
        `   Generated At: ${plan.generatedAt ? new Date(plan.generatedAt).toLocaleDateString() : "N/A"}`
      );
      console.log(`   Active: ${doc.data().isActive || false}`);
      console.log(`   Last Extended: ${doc.data().lastExtendedAt || "Never"}`);
      console.log();
      index++;
    });

    console.log("💡 To analyze a specific plan, use:");
    console.log(`   npm run analyze-plan ${userId} <plan-id>`);
    console.log(
      "\nNote: Use the 'Plan ID' value (not Document ID) when running other scripts."
    );
  } catch (error) {
    console.error("\n❌ Error listing training plans:", error);
    process.exit(1);
  }
}

// Run the script
listTrainingPlans()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
