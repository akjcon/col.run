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

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

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

  // Build pace zone table if threshold is available
  let paceZoneTable = "";
  if (thresholdPace) {
    const zones = calculatePaceZones(thresholdPace);
    paceZoneTable = `
## Pace Zone Reference (based on ${formatPace(thresholdPace)}/mi threshold)
| Zone | Pace Range | Purpose |
|------|-----------|---------|
| Z1 | ${formatPaceRange(zones.z1)} | Recovery |
| Z2 | ${formatPaceRange(zones.z2)} | Aerobic base |
| Z3 | ${formatPaceRange(zones.z3)} | Tempo/Threshold |
| Z4 | ${formatPaceRange(zones.z4)} | VO2max |
| Z5 | ${formatPaceRange(zones.z5)} | Anaerobic |

Use these ranges to judge whether the athlete's avg pace was appropriate for the prescribed zone.`;
  }

  // Build rich athlete context
  const athleteContext = snapshot
    ? [
        `Experience: ${snapshot.experienceLevel ?? snapshot.experience}`,
        snapshot.weeklyMileage
          ? `Typical weekly mileage: ${snapshot.weeklyMileage} mi`
          : null,
        snapshot.currentWeeklyMileage
          ? `Recent weekly mileage: ${snapshot.currentWeeklyMileage} mi`
          : null,
        snapshot.ctl ? `Fitness load (CTL): ${snapshot.ctl}` : null,
        snapshot.lifetimeMiles
          ? `Lifetime miles: ${Math.round(snapshot.lifetimeMiles)}`
          : null,
        snapshot.trailExperience ? `Trail runner: yes` : null,
        snapshot.thresholdPace
          ? `Threshold pace: ${formatPace(snapshot.thresholdPace)}/mi`
          : null,
        snapshot.injuries ? `Injuries/notes: ${snapshot.injuries}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No athlete profile available.";

  const prompt = `You are a running coach reviewing a completed workout. Compare the actual activity to the planned workout and return feedback.

## Planned Workout (Week ${week.weekNumber}, ${week.phase})
- Blocks: ${blockDescriptions.join(" → ")}
- Total planned: ${plannedMiles.toFixed(1)} miles, ~${Math.round(plannedMinutes)} minutes
${paceZoneTable}

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
You MUST respond with ONLY a JSON object. No preamble, no explanation, no markdown. Start your response with "{".
{
  "adherence": "on_target" | "over" | "under",
  "coachingNote": "string (MUST be under 280 characters)"
}

Rules for adherence:
- "on_target": distance within ±15% of planned AND effort/pace appropriate for the prescribed zone (compare avg pace to the zone table above)
- "over": distance >15% over planned, OR effort was significantly harder than prescribed (e.g. Z2 run done at Z3/Z4 pace or HR)
- "under": distance >15% under planned, OR effort was well below prescribed zones
- For hilly runs (>1500 ft elevation): pace will be slower — judge effort by HR and elevation context, not pace alone
- For multi-block workouts (warmup+tempo+cooldown): judge the overall session, not just average pace

Rules for coachingNote (CRITICAL — follow exactly):
- MUST be 1-2 sentences, under 280 characters total. This is a hard limit.
- Lead with acknowledgment of what went right, then pivot to what to adjust (if anything)
- Do NOT repeat stats the athlete can already see (distance, pace, HR numbers). Talk about what it means.
- Do NOT use hollow praise: "great job", "awesome", "fantastic", "well done", "nice work", "love the consistency"
- Avoid em dashes (—). Use them sparingly at most; prefer commas or periods.
- Do NOT start sentences with "But", "However", or "That said". Connect ideas naturally or just start a new thought.
- Vary your openers. Avoid leaning on the same word repeatedly (e.g. don't start every note with "Solid").
- If something was off, name it plainly and offer a suggestion, not a lecture
- If it went well, say something specific about why it matters for their training

Good examples (notice: short, natural phrasing, no stats):
- "Right where you want to be on an easy day. This kind of discipline builds the base for everything harder."
- "Effort crept above what was prescribed, so try cueing off feel rather than chasing a pace next time."
- "All that climbing earned the slower pace. Real mountain work that flat long runs can't replicate."
- "Came up short on distance today. If something felt off, flag it; otherwise just aim for the full volume next time."`;

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const text = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(text);

    return {
      adherence: parsed.adherence || "on_target",
      coachingNote: parsed.coachingNote || "",
    };
  } catch (error) {
    console.error("[workout-analysis] Matched analysis failed:", error);
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
        `Experience: ${snapshot.experienceLevel ?? snapshot.experience}`,
        snapshot.weeklyMileage
          ? `Typical weekly mileage: ${snapshot.weeklyMileage} mi`
          : null,
        snapshot.ctl ? `Fitness load (CTL): ${snapshot.ctl}` : null,
        snapshot.thresholdPace
          ? `Threshold pace: ${formatPace(snapshot.thresholdPace)}/mi`
          : null,
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
You MUST respond with ONLY a JSON object. No preamble, no explanation, no markdown. Start your response with "{".
{
  "affectsPlan": true/false,
  "coachingNote": "string (MUST be under 280 characters)"
}

Rules for affectsPlan:
- true if this was a hard effort (high HR >160, fast pace near/above threshold, long distance >6mi) on a rest/easy day, which could compromise upcoming workouts
- false for easy shakeout runs (<3mi, low HR), cross-training, or short recovery jogs

Rules for coachingNote (CRITICAL — follow exactly):
- MUST be 1-2 sentences, under 280 characters total
- Acknowledge the activity first, then note any concerns
- Do NOT use hollow praise: "great job", "awesome", "fantastic", "well done", "nice work"
- Avoid em dashes (—). Use them sparingly at most; prefer commas or periods.
- Do NOT start sentences with "But", "However", or "That said"
- Do NOT repeat stats the athlete can already see`;

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const text = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
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
