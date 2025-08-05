import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";
import { writeFile } from "fs/promises";
import { TrainingPlan, TrainingBackground } from "../lib/types";
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

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function manualExtend() {
  const userId = process.argv[2];
  const planId = process.argv[3] || "default-plan";
  const startWeek = parseInt(process.argv[4]) || 0;
  const endWeek = parseInt(process.argv[5]) || 0;

  if (!userId || !startWeek || !endWeek) {
    console.error(
      "Usage: npm run manual-extend <userId> [planId] <startWeek> <endWeek>"
    );
    console.error("\nExample: npm run manual-extend user123 default-plan 6 12");
    console.error("This will generate weeks 6 through 12");
    process.exit(1);
  }

  console.log(`\n📋 Manual extension for user: ${userId}, plan: ${planId}`);
  console.log(`   Generating weeks ${startWeek} through ${endWeek}\n`);

  try {
    // 1. Fetch the current plan
    console.log("1️⃣ Fetching current training plan...");
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

    // 2. Fetch user's training background
    console.log("\n2️⃣ Fetching user's training background...");
    const backgroundSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("backgrounds")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (backgroundSnapshot.empty) {
      throw new Error("No training background found for user");
    }

    const background = backgroundSnapshot.docs[0].data() as TrainingBackground;
    console.log("✅ Found training background");

    // 3. Skip book content for simpler approach
    // We'll use a more focused prompt without the full book

    // 4. Create a simpler, more focused prompt
    const weeksToGenerate = endWeek - startWeek + 1;
    const lastTwoWeeks = currentPlan.weeks.slice(-2);

    const prompt = `Generate exactly ${weeksToGenerate} weeks (week ${startWeek} through week ${endWeek}) of a 50K trail running plan.

CONTEXT:
- User is advanced level, former D1 Nordic skier
- Currently running ${background.weeklyMileage} miles/week
- Race is 50K trail run
- These are weeks ${startWeek}-${endWeek} of a 12-week plan
- Week 12 should be race week with proper taper

ZONES TO USE:
Zone 1: 120-135 bpm (Recovery)
Zone 2: 130-140 bpm (Easy aerobic)
Zone 3: 140-165 bpm (Threshold)
Zone 4: 165-175 bpm (VO2max)
Zone 5: 175+ bpm (Anaerobic)

LAST 2 WEEKS FOR CONTEXT:
${JSON.stringify(lastTwoWeeks, null, 2)}

IMPORTANT: Return ONLY a valid JSON array. No text before or after. The array should contain exactly ${weeksToGenerate} week objects.

Each week object must have this exact structure:
{
  "weekNumber": number,
  "phase": "phase name",
  "targetMiles": "X-Y",
  "targetVertical": "X,XXX-Y,YYY ft",
  "workouts": [7 workout objects, one for each day]
}

Start your response with [ and end with ]`;

    // 5. Call the LLM with a simpler approach
    console.log("\n4️⃣ Calling Anthropic...");
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000, // Reduced to avoid truncation
      temperature: 0.2, // Lower temperature for more consistent output
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const messageContent =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // 6. Save the response
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFile = `weeks-${startWeek}-${endWeek}-${timestamp}.json`;

    await writeFile(outputFile, messageContent, "utf-8");
    console.log(`\n✅ Response saved to: ${outputFile}`);

    // Try to parse it
    try {
      const weeks = JSON.parse(messageContent);
      console.log(`✅ Valid JSON! Generated ${weeks.length} weeks`);
      console.log("\nWeeks summary:");
      weeks.forEach(
        (week: { weekNumber: number; phase: string; targetMiles: string }) => {
          console.log(
            `  Week ${week.weekNumber}: ${week.phase} - ${week.targetMiles} miles`
          );
        }
      );

      console.log(`\n📌 Next steps:`);
      console.log(`1. Review the generated weeks in ${outputFile}`);
      console.log(
        `2. If they look good, run: npm run parse-partial ${userId} ${planId} ${outputFile}`
      );
    } catch {
      console.log(
        "\n⚠️  The response is not valid JSON, but it's saved to the file."
      );
      console.log("You can manually fix any JSON issues and then run:");
      console.log(`npm run parse-partial ${userId} ${planId} ${outputFile}`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
manualExtend()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
