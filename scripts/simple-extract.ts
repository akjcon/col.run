import { readFile, writeFile } from "fs/promises";

async function simpleExtract() {
  const debugFile = process.argv[2];

  if (!debugFile) {
    console.error("Usage: npm run simple-extract <debug-file>");
    console.error(
      "\nExample: npm run simple-extract debug-response-1754426233145.txt"
    );
    process.exit(1);
  }

  try {
    console.log(`\n📋 Reading: ${debugFile}\n`);

    // Read the debug file
    const content = await readFile(debugFile, "utf-8");
    console.log(`File size: ${content.length} characters`);

    // Find the start of the JSON array
    const startIdx = content.indexOf("[");
    if (startIdx === -1) {
      console.error("❌ No JSON array found (no '[' character)");
      process.exit(1);
    }

    console.log(`Found JSON array starting at position ${startIdx}`);

    // Extract from the start
    const jsonContent = content.substring(startIdx);

    // Try different lengths to find valid JSON
    const weeks = [];

    // Since we know it parsed 4 weeks, let's try to find where each week ends
    // by looking for the pattern "}," after "workouts" array closes
    console.log("\nTrying to extract individual weeks...");

    // Simple approach: find each weekNumber and extract up to the next weekNumber
    const weekStarts = [];
    let searchPos = 0;
    while (true) {
      const weekPos = jsonContent.indexOf('"weekNumber"', searchPos);
      if (weekPos === -1) break;
      weekStarts.push(weekPos);
      searchPos = weekPos + 1;
    }

    console.log(`Found ${weekStarts.length} week markers`);

    // Try to extract each week
    for (let i = 0; i < Math.min(weekStarts.length, 10); i++) {
      const start = weekStarts[i];
      const end = weekStarts[i + 1] || jsonContent.length;

      // Find the opening brace before weekNumber
      let openBrace = start;
      while (openBrace > 0 && jsonContent[openBrace] !== "{") {
        openBrace--;
      }

      // Find a reasonable closing brace after the week
      const segment = jsonContent.substring(openBrace, end);

      // Count braces to find where this week object ends
      let braceCount = 0;
      let closeBrace = -1;
      for (let j = 0; j < segment.length; j++) {
        if (segment[j] === "{") braceCount++;
        if (segment[j] === "}") {
          braceCount--;
          if (braceCount === 0) {
            closeBrace = j;
            break;
          }
        }
      }

      if (closeBrace !== -1) {
        const weekJson = segment.substring(0, closeBrace + 1);
        try {
          const week = JSON.parse(weekJson);
          if (week.weekNumber && week.workouts) {
            weeks.push(week);
            console.log(
              `✅ Extracted week ${week.weekNumber}: ${week.phase || "Unknown phase"}`
            );
          }
        } catch {
          console.log(`⚠️  Failed to parse week ${i + 1}`);
        }
      }
    }

    if (weeks.length === 0) {
      // Fallback: try to parse the whole thing with fixes
      console.log("\nFallback: Trying to fix and parse entire JSON...");

      // Truncate at a reasonable point (before it gets corrupted)
      // We know it failed at position 10510, so let's try before that
      const truncated = jsonContent.substring(0, 10000);

      // Close any open arrays/objects
      let fixed = truncated;

      // Count brackets
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;

      // Add missing closers
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += "}";
      }
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += "]";
      }

      try {
        const parsed = JSON.parse(fixed);
        if (Array.isArray(parsed)) {
          weeks.push(...parsed);
          console.log(`✅ Parsed ${parsed.length} weeks from truncated JSON`);
        }
      } catch {
        console.log("❌ Fallback parsing also failed");
      }
    }

    if (weeks.length > 0) {
      // Save the extracted weeks
      const outputFile = `extracted-weeks-${Date.now()}.json`;
      await writeFile(outputFile, JSON.stringify(weeks, null, 2), "utf-8");

      console.log(`\n✅ SUCCESS! Extracted ${weeks.length} weeks`);
      console.log("\nWeek summary:");
      weeks.forEach((week) => {
        console.log(
          `  Week ${week.weekNumber}: ${week.phase} - ${week.targetMiles} miles`
        );
      });

      console.log(`\n📁 Saved to: ${outputFile}`);
      console.log(`\n📌 Next step:`);
      console.log(
        `npm run parse-partial user_2zbjUKRVRuJbPggLxvbHbHcDQWz default-plan ${outputFile}`
      );
    } else {
      console.log("\n❌ Could not extract any valid weeks");
      console.log("Try using the partial-weeks-example.json file instead:");
      console.log(
        "npm run parse-partial user_2zbjUKRVRuJbPggLxvbHcDQWz default-plan partial-weeks-example.json"
      );
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

simpleExtract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
