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

async function analyzeTrainingPlan() {
  const userId = process.argv[2];
  const planId = process.argv[3] || "default-plan";

  if (!userId) {
    console.error("Usage: npm run analyze-plan <userId> [planId]");
    process.exit(1);
  }

  console.log(
    `\n📊 Analyzing training plan for user: ${userId}, plan: ${planId}\n`
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

    console.log("📋 PLAN OVERVIEW");
    console.log("================");
    console.log(`Type: ${plan.planType}`);
    console.log(`Total Weeks: ${plan.totalWeeks}`);
    console.log(`Current Week: ${plan.currentWeek}`);
    console.log(`Weeks Generated: ${plan.weeks.length}`);
    console.log(`Start Date: ${new Date(plan.startDate).toLocaleDateString()}`);
    console.log(
      `Generated At: ${new Date(plan.generatedAt).toLocaleDateString()}`
    );

    console.log("\n🎯 TRAINING ZONES");
    console.log("=================");
    plan.zones.forEach((zone, index) => {
      console.log(
        `${index + 1}. ${zone.zone}: ${zone.heartRate} - ${zone.description}`
      );
    });

    console.log("\n📅 TRAINING PHASES");
    console.log("==================");
    plan.phases.forEach((phase, index) => {
      console.log(`${index + 1}. ${phase.phase} (Weeks ${phase.weeks})`);
      console.log(`   Miles: ${phase.miles}, Vertical: ${phase.vertical}`);
      console.log(`   Focus: ${phase.focus}`);
    });

    console.log("\n📊 WEEKS BREAKDOWN");
    console.log("==================");
    plan.weeks.forEach((week) => {
      console.log(`\nWeek ${week.weekNumber} - ${week.phase}`);
      console.log(
        `Target: ${week.targetMiles} miles, ${week.targetVertical} vertical`
      );
      console.log("Workouts:");
      week.workouts.forEach((workout) => {
        console.log(`  ${workout.day}: ${workout.type} (${workout.zone})`);
      });
    });

    if (plan.weeks.length < plan.totalWeeks) {
      console.log("\n⚠️  PLAN INCOMPLETE");
      console.log("===================");
      console.log(
        `Missing ${plan.totalWeeks - plan.weeks.length} weeks (${plan.weeks.length + 1}-${plan.totalWeeks})`
      );
      console.log("Run 'npm run extend-plan' to generate the remaining weeks.");
    }

    // Check for data consistency
    console.log("\n✅ DATA VALIDATION");
    console.log("==================");

    // Check week numbers are sequential
    let isSequential = true;
    for (let i = 0; i < plan.weeks.length; i++) {
      if (plan.weeks[i].weekNumber !== i + 1) {
        isSequential = false;
        console.log(
          `❌ Week ${i + 1} has incorrect weekNumber: ${plan.weeks[i].weekNumber}`
        );
      }
    }
    if (isSequential) {
      console.log("✅ Week numbers are sequential");
    }

    // Check all weeks have 7 days
    let allHave7Days = true;
    plan.weeks.forEach((week) => {
      if (week.workouts.length !== 7) {
        allHave7Days = false;
        console.log(
          `❌ Week ${week.weekNumber} has ${week.workouts.length} days instead of 7`
        );
      }
    });
    if (allHave7Days) {
      console.log("✅ All weeks have 7 days of workouts");
    }

    // Summary stats
    console.log("\n📈 TRAINING STATS");
    console.log("=================");
    const totalWorkouts = plan.weeks.reduce(
      (sum, week) => sum + week.workouts.length,
      0
    );
    const workoutTypes = new Map<string, number>();

    plan.weeks.forEach((week) => {
      week.workouts.forEach((workout) => {
        const count = workoutTypes.get(workout.type) || 0;
        workoutTypes.set(workout.type, count + 1);
      });
    });

    console.log(`Total Workouts Planned: ${totalWorkouts}`);
    console.log("\nWorkout Type Distribution:");
    Array.from(workoutTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(
          `  ${type}: ${count} (${Math.round((count / totalWorkouts) * 100)}%)`
        );
      });
  } catch (error) {
    console.error("\n❌ Error analyzing training plan:", error);
    process.exit(1);
  }
}

// Run the script
analyzeTrainingPlan()
  .then(() => {
    console.log("\n✅ Analysis complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
