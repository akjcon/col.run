import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
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

async function getBookContent(): Promise<string> {
  try {
    const bookPath = join(process.cwd(), "lib", "optimized_book.md");
    const content = await readFile(bookPath, "utf-8");
    console.log("✅ Successfully loaded book content");
    return content;
  } catch (error) {
    console.error("❌ Error loading book content:", error);
    throw error;
  }
}

async function extendTrainingPlan() {
  const userId = process.argv[2];
  const planId = process.argv[3] || "default-plan";

  if (!userId) {
    console.error("Usage: npm run extend-plan <userId> [planId]");
    process.exit(1);
  }

  console.log(
    `\n📋 Extending training plan for user: ${userId}, plan: ${planId}\n`
  );

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
    console.log(
      `   Current weeks: ${currentPlan.weeks.length} of ${currentPlan.totalWeeks}`
    );

    if (currentPlan.weeks.length >= currentPlan.totalWeeks) {
      console.log("✅ Plan is already complete!");
      return;
    }

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

    // 3. Get book content
    console.log("\n3️⃣ Loading training book content...");
    const bookContent = await getBookContent();

    // 4. Prepare the prompt for extending the plan
    console.log("\n4️⃣ Generating extension prompt...");
    const existingWeeksCount = currentPlan.weeks.length;
    const remainingWeeks = currentPlan.totalWeeks - existingWeeksCount;

    const extensionPrompt = `You are an expert trail running coach extending an existing training plan based on "Training for the Uphill Athlete" principles.

EXISTING PLAN CONTEXT:
- Plan Type: ${currentPlan.planType}
- Total Weeks: ${currentPlan.totalWeeks}
- Weeks Already Completed: ${existingWeeksCount}
- Weeks to Generate: ${remainingWeeks} (weeks ${existingWeeksCount + 1} through ${currentPlan.totalWeeks})

USER PROFILE:
- Experience: ${background.experience}
- Current weekly mileage: ${background.weeklyMileage} miles
- Longest run: ${background.longestRun} miles
- Marathon PR: ${background.marathonPR || "Not provided"}
- Current fitness: ${background.currentFitness || "Not provided"}
- Athletic background: ${background.background || "Not provided"}
- Race goal: ${background.goals.raceDistance}
- Target time: ${background.goals.targetTime || "Not specified"}

TRAINING ZONES (maintain these):
${JSON.stringify(currentPlan.zones, null, 2)}

TRAINING PHASES (follow this structure):
${JSON.stringify(currentPlan.phases, null, 2)}

EXISTING WEEKS (for context and progression):
${JSON.stringify(currentPlan.weeks.slice(-2), null, 2)}

TASK: Generate weeks ${existingWeeksCount + 1} through ${currentPlan.totalWeeks} of the training plan.

CRITICAL REQUIREMENTS:
1. Continue the progression naturally from the last completed week
2. Follow the phase structure defined above
3. Ensure proper build-up towards race day in week ${currentPlan.totalWeeks}
4. Week ${currentPlan.totalWeeks} should be race week with appropriate taper
5. Maintain consistency with the workout structure and naming conventions used in existing weeks

IMPORTANT: Return ONLY a valid JSON array with NO other text before or after. No explanations, no markdown, just the raw JSON array.

Return a JSON array of WeekPlan objects for the remaining ${remainingWeeks} weeks. Each week should follow this exact format:
[
  {
    "weekNumber": ${existingWeeksCount + 1},
    "phase": "appropriate phase name",
    "targetMiles": "X-Y",
    "targetVertical": "X,XXX-Y,YYY ft",
    "workouts": [
      {
        "day": "Monday",
        "type": "workout type",
        "zone": "zone name",
        "description": "workout description",
        "details": ["detail 1", "detail 2"],
        "notes": "optional notes"
      }
      // ... all 7 days
    ]
  }
  // ... continue for all remaining weeks
]`;

    // 5. Call the LLM
    console.log("\n5️⃣ Calling Anthropic to generate remaining weeks...");
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      temperature: 0.3,
      system: `${extensionPrompt}\n\nBOOK REFERENCE:\n${bookContent}`,
      messages: [
        {
          role: "user",
          content:
            "Generate the remaining weeks of my training plan. Return ONLY the JSON array starting with [ and ending with ]. No other text.",
        },
      ],
    });

    const messageContent =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // 6. Parse the new weeks
    console.log("\n6️⃣ Parsing generated weeks...");

    // Save raw response for debugging
    const debugFile = `debug-response-${Date.now()}.txt`;
    try {
      await writeFile(debugFile, messageContent, "utf-8");
      console.log(`   💾 Raw response saved to: ${debugFile}`);
    } catch {
      // Ignore file write errors
    }

    let newWeeks;
    try {
      // Try to extract JSON from the response
      // Look for array brackets and extract everything between them
      const jsonMatch = messageContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }

      let jsonString = jsonMatch[0];

      // Try to fix common JSON issues
      console.log("   🔧 Attempting to parse JSON...");

      // First attempt: parse as-is
      try {
        newWeeks = JSON.parse(jsonString);
        console.log(`✅ Successfully parsed ${newWeeks.length} new weeks`);
      } catch {
        console.log("   ⚠️  Initial parse failed, attempting to fix JSON...");

        // Common fixes for JSON issues
        // Remove trailing commas before closing brackets/braces
        jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

        // Try to find where the JSON might be truncated and close it properly
        const openBraces = (jsonString.match(/\{/g) || []).length;
        const closeBraces = (jsonString.match(/\}/g) || []).length;
        const openBrackets = (jsonString.match(/\[/g) || []).length;
        const closeBrackets = (jsonString.match(/\]/g) || []).length;

        // Add missing closing braces/brackets
        let fixedJson = jsonString;
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += "}";
        }
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += "]";
        }

        try {
          newWeeks = JSON.parse(fixedJson);
          console.log(`✅ Fixed and parsed ${newWeeks.length} new weeks`);
        } catch (secondError) {
          // Try to extract complete weeks only
          console.log(
            "   ⚠️  Fix attempt failed, extracting complete weeks..."
          );

          // Match individual week objects
          const weekMatches = jsonString.matchAll(
            /\{\s*"weekNumber"\s*:\s*(\d+)[\s\S]*?"workouts"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g
          );
          const extractedWeeks = [];

          for (const match of weekMatches) {
            try {
              const weekObj = JSON.parse(match[0]);
              extractedWeeks.push(weekObj);
              console.log(`   ✅ Extracted week ${weekObj.weekNumber}`);
            } catch {
              // Skip malformed weeks
            }
          }

          if (extractedWeeks.length > 0) {
            newWeeks = extractedWeeks;
            console.log(`✅ Extracted ${newWeeks.length} complete weeks`);
          } else {
            throw secondError;
          }
        }
      }

      // Check if we got all expected weeks
      if (newWeeks.length < remainingWeeks) {
        console.warn(
          `⚠️  Warning: Expected ${remainingWeeks} weeks but only got ${newWeeks.length}`
        );
        console.warn(
          "The response may have been truncated. Retrying with adjusted parameters..."
        );

        // Retry with a more focused prompt for remaining weeks
        const stillMissingWeeks = remainingWeeks - newWeeks.length;
        const lastGeneratedWeek = existingWeeksCount + newWeeks.length;

        console.log(
          `\n🔄 Retrying to generate weeks ${lastGeneratedWeek + 1} through ${currentPlan.totalWeeks}...`
        );

        const retryResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          temperature: 0.3,
          system: extensionPrompt,
          messages: [
            {
              role: "user",
              content: `Generate ONLY weeks ${lastGeneratedWeek + 1} through ${currentPlan.totalWeeks} (${stillMissingWeeks} weeks total). Return ONLY the JSON array with no other text. Start the array with week ${lastGeneratedWeek + 1}.`,
            },
          ],
        });

        const retryContent =
          retryResponse.content[0]?.type === "text"
            ? retryResponse.content[0].text
            : "";
        const retryJsonMatch = retryContent.match(/\[\s*\{[\s\S]*\}\s*\]/);

        if (retryJsonMatch) {
          const additionalWeeks = JSON.parse(retryJsonMatch[0]);
          newWeeks = [...newWeeks, ...additionalWeeks];
          console.log(
            `✅ Successfully generated remaining ${additionalWeeks.length} weeks`
          );
        }
      }
    } catch (parseError) {
      console.error("❌ Failed to parse LLM response:", parseError);
      console.error(
        "Response preview:",
        messageContent.substring(0, 500) + "..."
      );
      throw new Error("Invalid JSON response from LLM");
    }

    // 7. Validate the new weeks
    console.log("\n7️⃣ Validating new weeks...");
    if (!Array.isArray(newWeeks) || newWeeks.length !== remainingWeeks) {
      throw new Error(
        `Expected ${remainingWeeks} weeks, got ${newWeeks.length}`
      );
    }

    // Check week numbers are sequential
    for (let i = 0; i < newWeeks.length; i++) {
      const expectedWeekNumber = existingWeeksCount + i + 1;
      if (newWeeks[i].weekNumber !== expectedWeekNumber) {
        throw new Error(
          `Week ${i} has incorrect weekNumber: ${newWeeks[i].weekNumber}, expected ${expectedWeekNumber}`
        );
      }
    }

    // 8. Merge with existing weeks
    console.log("\n8️⃣ Merging with existing plan...");
    const updatedWeeks = [...currentPlan.weeks, ...newWeeks];

    // 9. Update Firebase
    console.log("\n9️⃣ Updating Firebase...");
    await planDoc.ref.update({
      weeks: updatedWeeks,
      lastExtendedAt: new Date().toISOString(),
    });

    console.log("\n✅ SUCCESS! Training plan extended:");
    console.log(`   - Previous weeks: ${existingWeeksCount}`);
    console.log(`   - New weeks added: ${newWeeks.length}`);
    console.log(`   - Total weeks now: ${updatedWeeks.length}`);
    console.log(`\n📊 New week summary:`);
    newWeeks.forEach((week) => {
      console.log(
        `   Week ${week.weekNumber} (${week.phase}): ${week.targetMiles} miles, ${week.targetVertical} vertical`
      );
    });
  } catch (error) {
    console.error("\n❌ Error extending training plan:", error);
    console.log("\n💡 Tips:");
    console.log(
      "   - If you see partial weeks in the output above, the generation worked but parsing/saving failed"
    );
    console.log("   - Try running the script again - it may succeed on retry");
    console.log(
      "   - Check if any weeks were saved to Firebase before the error"
    );
    process.exit(1);
  }
}

// Run the script
extendTrainingPlan()
  .then(() => {
    console.log("\n👋 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
