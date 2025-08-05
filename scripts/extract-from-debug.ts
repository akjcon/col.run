import { readFile, writeFile } from "fs/promises";

async function extractFromDebug() {
  const debugFile = process.argv[2];

  if (!debugFile) {
    console.error("Usage: npm run extract-debug <debug-file>");
    console.error(
      "\nExample: npm run extract-debug debug-response-1754426233145.txt"
    );
    process.exit(1);
  }

  try {
    console.log(`\n📋 Extracting weeks from: ${debugFile}\n`);

    // Read the debug file
    const content = await readFile(debugFile, "utf-8");

    // Try to extract JSON array
    const jsonMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);

    if (!jsonMatch) {
      console.error("❌ No JSON array found in debug file");
      process.exit(1);
    }

    let jsonString = jsonMatch[0];

    // Try to parse and extract complete weeks
    const weeks = [];

    // More robust regex to match complete week objects
    const weekPattern =
      /\{\s*"weekNumber"\s*:\s*(\d+),\s*"phase"[^}]*?"workouts"\s*:\s*\[(?:[^[\]]*|\[(?:[^[\]]*|\[[^[\]]*\])*\])*\][^}]*?\}/g;

    let match;
    while ((match = weekPattern.exec(jsonString)) !== null) {
      try {
        const weekObj = JSON.parse(match[0]);
        weeks.push(weekObj);
        console.log(
          `✅ Extracted week ${weekObj.weekNumber}: ${weekObj.phase}`
        );
      } catch {
        console.log(
          `⚠️  Failed to parse week starting at position ${match.index}`
        );
      }
    }

    if (weeks.length === 0) {
      // Fallback: try to fix the JSON and parse it
      console.log("Attempting to fix and parse the entire JSON...");

      // Remove trailing commas
      jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

      // Count brackets to see if we need to close them
      const openBraces = (jsonString.match(/\{/g) || []).length;
      const closeBraces = (jsonString.match(/\}/g) || []).length;
      const openBrackets = (jsonString.match(/\[/g) || []).length;
      const closeBrackets = (jsonString.match(/\]/g) || []).length;

      // Add missing closing brackets
      for (let i = 0; i < openBraces - closeBraces; i++) {
        jsonString += "}";
      }
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        jsonString += "]";
      }

      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
          weeks.push(...parsed);
          console.log(
            `✅ Successfully parsed ${parsed.length} weeks from fixed JSON`
          );
        }
      } catch {
        console.log("❌ Could not parse even after fixing attempts");
      }
    }

    if (weeks.length > 0) {
      // Save the extracted weeks
      const outputFile = `extracted-weeks-${Date.now()}.json`;
      await writeFile(outputFile, JSON.stringify(weeks, null, 2), "utf-8");

      console.log(
        `\n✅ Extracted ${weeks.length} weeks and saved to: ${outputFile}`
      );
      console.log("\nWeek summary:");
      weeks.forEach((week) => {
        console.log(
          `  Week ${week.weekNumber}: ${week.phase} - ${week.targetMiles} miles`
        );
      });

      console.log(`\n📌 Next steps:`);
      console.log(`1. Review the weeks in ${outputFile}`);
      console.log(
        `2. Add them to your plan: npm run parse-partial user_2zbjUKRVRuJbPggLxvbHbHcDQWz default-plan ${outputFile}`
      );
      console.log(`3. Then generate the remaining weeks (10-12)`);
    } else {
      console.log("\n❌ No valid weeks could be extracted");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

extractFromDebug()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
