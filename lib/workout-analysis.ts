/**
 * Workout Analysis
 *
 * LLM-powered analysis that compares actual Strava activity data
 * against the planned workout, producing adherence classification
 * and coaching feedback.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Activity } from "@/lib/strava/types";
import type { Day, Week } from "@/lib/blocks/types";
import type { AthleteSnapshot, WorkoutLog } from "@/lib/types";
import { formatBlock } from "@/lib/workout-display";
import { calculatePaceZones, formatPace, formatPaceRange } from "@/lib/pace-zones";
import {
  calculateDayTotalMiles,
  calculateDayTotal,
  getDayBlocks,
  isRestBlock,
} from "@/lib/blocks/calculations";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================================================
// Types
// =============================================================================

export interface MatchedAnalysis {
  adherence: WorkoutLog["adherence"];
  coachingNote: string;
}

export interface UnplannedAnalysis {
  affectsPlan: boolean;
  coachingNote: string;
}

// =============================================================================
// Matched Workout Analysis
// =============================================================================

/**
 * Analyze a matched workout — compare actual activity data to planned day.
 */
export async function analyzeMatchedWorkout(
  activity: Activity,
  plannedDay: Day,
  week: Week,
  snapshot: AthleteSnapshot | null
): Promise<MatchedAnalysis> {
  const blocks = getDayBlocks(plannedDay).filter((b) => !isRestBlock(b));
  const plannedMiles = calculateDayTotalMiles(plannedDay);
  const plannedMinutes = calculateDayTotal(plannedDay);
  const thresholdPace = snapshot?.thresholdPace ?? snapshot?.estimatedThresholdPace;

  // Build block descriptions with pace ranges
  const blockDescriptions = blocks.map((b) => {
    let desc = formatBlock(b);
    if (thresholdPace) {
      const zones = calculatePaceZones(thresholdPace);
      const range = zones[b.effortLevel];
      desc += ` (target: ${formatPaceRange(range)})`;
    }
    return desc;
  });

  // Build athlete context
  const athleteContext = snapshot
    ? [
        `Experience: ${snapshot.experience}`,
        snapshot.thresholdPace
          ? `Threshold pace: ${formatPace(snapshot.thresholdPace)}/mi`
          : null,
        snapshot.ctl != null ? `CTL: ${snapshot.ctl}` : null,
        snapshot.tsb != null ? `TSB: ${snapshot.tsb}` : null,
        snapshot.injuries ? `Injuries/notes: ${snapshot.injuries}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No athlete profile available.";

  const prompt = `You are a running coach analyzing a completed workout. Compare the actual activity to the planned workout and provide feedback.

## Planned Workout (Week ${week.weekNumber}, ${week.phase})
- Blocks: ${blockDescriptions.join(" → ")}
- Total planned: ${plannedMiles.toFixed(1)} miles, ~${Math.round(plannedMinutes)} minutes

## Actual Activity
- Name: ${activity.name}
- Distance: ${activity.distance} miles
- Duration: ${activity.duration.toFixed(1)} minutes
- Avg pace: ${formatPace(activity.avgPace)}/mi
${activity.avgHeartRate ? `- Avg HR: ${activity.avgHeartRate} bpm` : ""}
${activity.maxHeartRate ? `- Max HR: ${activity.maxHeartRate} bpm` : ""}
${activity.elevation ? `- Elevation: ${activity.elevation} ft` : ""}

## Athlete Context
${athleteContext}

## Instructions
Respond with valid JSON only, no markdown:
{
  "adherence": "on_target" | "over" | "under",
  "coachingNote": "1-3 sentences of coaching feedback"
}

Rules for adherence:
- "on_target": distance within ±15% of planned AND effort/HR appropriate for the prescribed zones
- "over": ran significantly farther than planned (>15% over) OR ran at a much harder effort than prescribed (e.g., Zone 2 run done at Zone 4 HR)
- "under": ran significantly less than planned (>15% under) OR effort was well below prescribed zones

For the coaching note:
- Be specific: reference actual numbers vs planned
- Be encouraging but honest
- If HR data is available and the prescribed zone was easy (Z1/Z2), flag if avg HR was too high
- Keep it concise (1-3 sentences)`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 4096,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    return {
      adherence: parsed.adherence || "on_target",
      coachingNote: parsed.coachingNote || "",
    };
  } catch (error) {
    console.error("Workout analysis failed:", error);
    // Fallback: simple distance-based adherence
    const ratio = activity.distance / (plannedMiles || 1);
    let adherence: WorkoutLog["adherence"] = "on_target";
    if (ratio > 1.15) adherence = "over";
    else if (ratio < 0.85) adherence = "under";

    return {
      adherence,
      coachingNote: "",
    };
  }
}

// =============================================================================
// Unplanned Workout Analysis
// =============================================================================

/**
 * Analyze an unplanned workout — activity that doesn't match any planned day.
 */
export async function analyzeUnplannedWorkout(
  activity: Activity,
  todayPlannedDay: Day | null,
  week: Week | null,
  snapshot: AthleteSnapshot | null
): Promise<UnplannedAnalysis> {
  const isRestDayPlanned =
    todayPlannedDay === null ||
    getDayBlocks(todayPlannedDay).filter((b) => !isRestBlock(b)).length === 0;

  const athleteContext = snapshot
    ? [
        `Experience: ${snapshot.experience}`,
        snapshot.ctl != null ? `CTL: ${snapshot.ctl}` : null,
        snapshot.tsb != null ? `TSB: ${snapshot.tsb}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No athlete profile available.";

  const prompt = `You are a running coach. An athlete completed an activity that wasn't in their training plan.

## Activity
- Name: ${activity.name}
- Distance: ${activity.distance} miles
- Duration: ${activity.duration.toFixed(1)} minutes
- Avg pace: ${formatPace(activity.avgPace)}/mi
${activity.avgHeartRate ? `- Avg HR: ${activity.avgHeartRate} bpm` : ""}
${activity.elevation ? `- Elevation: ${activity.elevation} ft` : ""}

## Today's Plan
${isRestDayPlanned ? "Rest day / no workout planned" : `Planned workout exists for today but this activity didn't match it.`}
${week ? `Current training week: ${week.weekNumber} (${week.phase})` : ""}

## Athlete Context
${athleteContext}

## Instructions
Respond with valid JSON only, no markdown:
{
  "affectsPlan": true/false,
  "coachingNote": "1-2 sentences"
}

Rules:
- affectsPlan = true only if this was a hard effort (high HR, fast pace, long distance) on what was supposed to be a rest/easy day, which could compromise upcoming workouts
- affectsPlan = false for easy shakeout runs, cross-training, or short recovery jogs
- Keep the coaching note brief and supportive`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 4096,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    return {
      affectsPlan: parsed.affectsPlan ?? false,
      coachingNote: parsed.coachingNote || "",
    };
  } catch (error) {
    console.error("Unplanned workout analysis failed:", error);
    return {
      affectsPlan: false,
      coachingNote: "",
    };
  }
}
