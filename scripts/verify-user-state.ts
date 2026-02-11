/**
 * Verify user state in Firestore — check what data exists for a user
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getAdminDb } from "../lib/firebase-admin";

const userId = process.argv[2] || "user_39S5oMAe7LfbLhu7XlREJBP64D9";

async function main() {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(userId);

  console.log(`\nChecking state for user: ${userId}\n`);

  // Check profile
  const profile = await userRef.get();
  console.log("Profile:", profile.exists ? "EXISTS" : "MISSING");

  // Check training background
  const bgSnap = await userRef.collection("backgrounds").orderBy("createdAt", "desc").limit(1).get();
  console.log("Training Background:", bgSnap.empty ? "MISSING" : "EXISTS");
  if (!bgSnap.empty) {
    const bg = bgSnap.docs[0].data();
    console.log("  Experience:", bg.experience, "| Weekly:", bg.weeklyMileage, "mi | Longest:", bg.longestRun, "mi");
  }

  // Check Strava integration
  const stravaSnap = await userRef.collection("integrations").doc("strava").get();
  console.log("Strava Integration:", stravaSnap.exists ? "CONNECTED" : "NOT CONNECTED");
  if (stravaSnap.exists) {
    const s = stravaSnap.data()!;
    console.log("  Athlete ID:", s.athleteId, "| Last Sync:", s.lastSyncAt || "never");
  }

  // Check activities
  const activitiesSnap = await userRef.collection("activities").limit(1).get();
  console.log("Activities:", activitiesSnap.empty ? "NONE (needs sync)" : "EXISTS");

  // Check fitness profile
  const fitnessSnap = await userRef.collection("fitness").doc("profile").get();
  console.log("Fitness Profile:", fitnessSnap.exists ? "EXISTS" : "MISSING");
  if (fitnessSnap.exists) {
    const f = fitnessSnap.data()!;
    console.log("  CTL:", f.ctl, "| ATL:", f.atl, "| TSB:", f.tsb);
  }

  // Check experience profile
  const expSnap = await userRef.collection("fitness").doc("experience").get();
  console.log("Experience Profile:", expSnap.exists ? "EXISTS" : "MISSING");

  // Check athlete snapshot
  const snapSnap = await userRef.collection("athleteSnapshot").doc("current").get();
  console.log("Athlete Snapshot:", snapSnap.exists ? "EXISTS" : "MISSING");
  if (snapSnap.exists) {
    console.log("  Snapshot data:", JSON.stringify(snapSnap.data(), null, 2));
  }

  // Check strava athlete index
  if (stravaSnap.exists) {
    const athleteId = stravaSnap.data()!.athleteId;
    if (athleteId) {
      const indexSnap = await db.collection("stravaAthletes").doc(String(athleteId)).get();
      console.log("Strava Athlete Index:", indexSnap.exists ? "EXISTS" : "MISSING");
    }
  }

  // Check training plan
  const planSnap = await userRef.collection("trainingPlans").where("isActive", "==", true).limit(1).get();
  console.log("Active Training Plan:", planSnap.empty ? "NONE" : "EXISTS");

  // Check workout logs
  const logsSnap = await userRef.collection("workoutLogs").limit(1).get();
  console.log("Workout Logs:", logsSnap.empty ? "NONE" : "EXISTS");
}

main().catch(console.error);
