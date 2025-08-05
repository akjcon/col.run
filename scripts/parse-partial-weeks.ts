import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "fs/promises";
import { TrainingPlan, WeekPlan } from "../lib/types";
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

async function parsePartialWeeks() {
  const userId = process.argv[2];
  const planId = process.argv[3] || "default-plan";
  const jsonFile = process.argv[4];

  if (!userId || !jsonFile) {
    console.error("Usage: npm run parse-partial <userId> [planId] <json-file>");
    console.error(
      "\nExample: npm run parse-partial user123 default-plan partial-weeks.json"
    );
    console.error("\nTo create the JSON file:");
    console.error(
      "1. Copy the JSON array from the failed output (starting with [ and ending with ])"
    );
    console.error("2. Save it to a file (e.g., partial-weeks.json)");
    console.error("3. Run this script with the file path");
    process.exit(1);
  }

  console.log(
    `\n📋 Parsing partial weeks for user: ${userId}, plan: ${planId}\n`
  );

  try {
    // 1. Read the JSON file
    console.log("1️⃣ Reading JSON file...");
    const jsonContent = await readFile(jsonFile, "utf-8");

    // Try to parse it
    let partialWeeks: WeekPlan[];
    try {
      partialWeeks = JSON.parse(jsonContent);
      console.log(`✅ Successfully parsed ${partialWeeks.length} weeks`);
    } catch {
      // Try to extract JSON array if there's extra text
      const jsonMatch = jsonContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON array found in file");
      }
      partialWeeks = JSON.parse(jsonMatch[0]);
      console.log(`✅ Extracted and parsed ${partialWeeks.length} weeks`);
    }

    // 2. Validate the weeks
    console.log("\n2️⃣ Validating weeks...");
    partialWeeks.forEach((week, index) => {
      if (!week.weekNumber || !week.workouts || week.workouts.length !== 7) {
        throw new Error(`Week ${index} is invalid`);
      }
      console.log(
        `   ✅ Week ${week.weekNumber}: ${week.phase} - ${week.targetMiles} miles`
      );
    });

    // 3. Fetch the current plan
    console.log("\n3️⃣ Fetching current plan...");
    const plansRef = db
      .collection("users")
      .doc(userId)
      .collection("trainingPlans");

    const planQuery = await plansRef.where("id", "==", planId).limit(1).get();

    if (planQuery.empty) {
      throw new Error(`Plan with id '${planId}' not found for user ${userId}`);
    }

    const planDoc = planQuery.docs[0];
    const currentPlan = planDoc.data() as TrainingPlan;
    console.log(`✅ Found plan: ${currentPlan.planType}`);
    console.log(
      `   Current weeks: ${currentPlan.weeks.length} of ${currentPlan.totalWeeks}`
    );

    // 4. Check if we can add these weeks
    const firstNewWeek = partialWeeks[0].weekNumber;
    const expectedNextWeek = currentPlan.weeks.length + 1;

    if (firstNewWeek !== expectedNextWeek) {
      console.warn(
        `⚠️  Warning: First new week is ${firstNewWeek}, expected ${expectedNextWeek}`
      );
      console.log(
        "   Do you want to continue anyway? The weeks might not be sequential."
      );
    }

    // 5. Merge with existing weeks
    console.log("\n4️⃣ Merging weeks...");
    const updatedWeeks = [...currentPlan.weeks, ...partialWeeks];
    console.log(`   Total weeks after merge: ${updatedWeeks.length}`);

    // 6. Update Firebase
    console.log("\n5️⃣ Updating Firebase...");
    await planDoc.ref.update({
      weeks: updatedWeeks,
      lastExtendedAt: new Date().toISOString(),
      partialExtension: true, // Mark that this was a partial extension
    });

    console.log("\n✅ SUCCESS! Partial weeks added to training plan:");
    console.log(`   - Previous weeks: ${currentPlan.weeks.length}`);
    console.log(`   - New weeks added: ${partialWeeks.length}`);
    console.log(`   - Total weeks now: ${updatedWeeks.length}`);

    if (updatedWeeks.length < currentPlan.totalWeeks) {
      console.log(
        `\n⚠️  Plan is still incomplete. Missing ${currentPlan.totalWeeks - updatedWeeks.length} weeks.`
      );
      console.log(
        "   Run 'npm run extend-plan' again to generate the remaining weeks."
      );
    }
  } catch (error) {
    console.error("\n❌ Error parsing partial weeks:", error);
    process.exit(1);
  }
}

// Run the script
parsePartialWeeks()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
