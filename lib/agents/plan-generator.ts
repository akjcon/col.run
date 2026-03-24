/**
 * Single-Shot Plan Generator Agent
 *
 * Generates a complete training plan in one Opus call.
 * Replaces the two-tier orchestrator + week-generator architecture.
 */

import { BaseAgent, extractJSON } from "./base";
import { CONDENSED_METHODOLOGY } from "./methodology-condensed";
import type { Week, Day, Block, BlockType, BlockUnit, EffortLevel, Workout } from "@/lib/blocks";
import { getDefaultUnit } from "@/lib/blocks";
import { validateWeek } from "@/lib/blocks/validation";
import type { PhaseTarget } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface PlanGeneratorInput {
  athlete: {
    experience: "beginner" | "intermediate" | "advanced" | "elite";
    weeklyMileage: number;
    longestRun: number;
    ctl?: number;
    atl?: number;
    thresholdPace?: number;
    lifetimeMiles?: number;
    longestRunEver?: number;
    peakWeeklyMileage?: number;
    ultraExperience?: boolean;
    trailExperience?: boolean;
  };
  goal: {
    raceDistance: string;
    targetTime?: string;
    raceDate?: number;
    raceName?: string;
    elevation?: number;
    terrainType?: "road" | "trail" | "mountain" | "mixed";
  };
  planWeeks: number;
  raceDayOfWeek?: string; // e.g. "Saturday"
  constraints?: {
    requiredRestDays?: string[];
    preferredLongRunDay?: string;
    maxWeeklyHours?: number;
  };
  raceRequirements?: {
    distanceMiles: number;
    peakWeeklyMileage: { min: number; ideal: number; max: number };
    peakLongRun: { min: number; ideal: number; max: number };
    keyWorkouts: string[];
    considerations: string[];
  };
  feasibility?: {
    feasible: boolean;
    riskLevel: string;
    suggestedApproach: string;
    startingWeeklyMileage: number;
    targetPeakMileage: number;
    targetPeakLongRun: number;
    warnings: string[];
  };
  feedbackContext?: string;
}

export interface PlanGeneratorOutput {
  athleteAnalysis: {
    fitnessLevel: number;
    limiters: string[];
    strengths: string[];
    riskFactors: string[];
  };
  phases: PhaseTarget[];
  weeks: Week[];
}

// =============================================================================
// Plan Generator Agent
// =============================================================================

export class PlanGeneratorAgent extends BaseAgent<PlanGeneratorInput, PlanGeneratorOutput> {
  constructor() {
    super({
      name: "PlanGenerator",
      model: "claude-opus-4-20250514",
      maxTokens: 16000,
      temperature: 0.3,
    });
  }

  protected validateInput(input: PlanGeneratorInput): { valid: boolean; error?: string } {
    if (!input.athlete) return { valid: false, error: "Missing athlete profile" };
    if (!input.goal) return { valid: false, error: "Missing race goal" };
    if (!input.planWeeks || input.planWeeks < 4 || input.planWeeks > 52) {
      return { valid: false, error: "Plan weeks must be between 4 and 52" };
    }
    return { valid: true };
  }

  protected buildSystemPrompt(input: PlanGeneratorInput): string {
    const raceWeekInstructions = input.raceDayOfWeek
      ? `
RACE WEEK (final week):
The race is on ${input.raceDayOfWeek}. This is the final week.
- ${input.raceDayOfWeek} is RACE DAY — schedule it as a rest day (the race is not part of the training plan)
- The day before the race: a short 1-2 mile shakeout jog at z1 with 4-6 strides (10-15 sec pickups) to stay sharp. Optional for low-volume athletes (<20mi/week).
- 2-3 days before race day: complete rest
- Earlier in the week: at most 1-2 short easy shakeout runs (2-3 miles max, z1-z2)
- NO tempo, NO intervals, NO long runs
- Total volume should be 20-30% of peak week at most`
      : "";

    return `You are an expert trail running coach generating a COMPLETE training plan based on "Training for the Uphill Athlete" principles.

You will produce the ENTIRE plan — every phase, every week, every day, every workout block — in a single response. The plan must be coherent from week 1 to race day.

TRAINING METHODOLOGY:
${CONDENSED_METHODOLOGY}

VOLUME PROGRESSION — CRITICAL RULES:
- Start from the athlete's CURRENT weekly mileage. Week 1 should be close to their current volume.
- Never increase volume more than 15% from one week to the next. This applies to EVERY week, including the first few weeks. If the athlete runs 25mi/week, week 2 can be at most 29mi. Week 3 at most 33mi. Do the math.
- EXCEPTION: After a recovery week, you may return to the volume of the last non-recovery week. This is not a "jump" — it's returning to the established training load.
- THIS IS THE MOST COMMON MISTAKE: Do NOT jump from 25mi to 35mi+ in the first few weeks. Even if the athlete has high lifetime mileage, the progression must be gradual.
- Volume should build SMOOTHLY — no erratic jumps or drops between consecutive weeks
- The plan should read as a steady upward progression with periodic recovery dips
- If you can't reach the target peak mileage with 15% weekly increases, that's OK — a safe plan that peaks lower is better than an aggressive plan that causes injury

RECOVERY WEEKS — NON-NEGOTIABLE:
Schedule a recovery week every 3rd or 4th week. Each recovery week:
- Has 60-75% of the previous build week's volume
- Is labeled with phase name "Recovery"
- Is its own phase in the phases array (phases must be sequential, non-overlapping)

Example phase structure for 18 weeks:
  Base(1-3), Recovery(4), Base(5-7), Recovery(8), Build(9-11), Recovery(12), Peak(13-15), Taper(16-18)

TAPER:
- 2-3 weeks before race, reduce to 70-80% then 40-50% of peak volume
- No long runs during taper (max 60-70% of normal long run)
- Taper replaces recovery — no separate recovery week needed during taper
${raceWeekInstructions}

BACK-TO-BACK WEEKENDS (for ultras 50k+):
Replace a single very long run with TWO SHORTER runs on consecutive days.
Split using 60/40 to 70/30 ratio (first day longer). Neither day should exceed a normal long run.

WORKOUT STRUCTURE:
Each workout has a "title" (short descriptive name) and "blocks" array.

Block types and their units:
- easy: MILES (whole numbers). Easy aerobic run. No warmup/cooldown needed.
- longRun: MILES (whole numbers). Extended aerobic run. No warmup/cooldown needed.
- warmUp: MINUTES. Pre-workout warmup. Only before tempo/intervals.
- coolDown: MINUTES. Post-workout cooldown. Only after tempo/intervals.
- tempo: MINUTES. Sustained threshold effort.
- intervals: MINUTES or SECONDS. High intensity repeats. Use "repeat" field.
- recovery: MINUTES. Recovery jog between efforts.
- rest: value=0, unit="minutes". Complete rest day.

Each block has: type, value, unit ("miles"/"minutes"/"seconds"), effortLevel ("z1"-"z5"), optional notes, optional repeat.

Repeat structure (for intervals): { "times": 6, "restBetween": { "value": 90, "unit": "seconds", "effortLevel": "z1" } }

Good workout titles: "Easy Run", "Hill Sprints", "Tempo Run", "Long Run", "Recovery Run", "Rest Day", "Track Intervals", "Progression Run"

ROUNDING: Miles = whole numbers only. Minutes = round to nearest 5.

CORE PRINCIPLES:
- 80% of training at z1-z2, 20% at z3-z5
- Never schedule hard workouts on consecutive days
- Long runs on weekends (Saturday or Sunday), followed by easy/rest
- EVERY week MUST have at least one complete rest day. No exceptions, even at high mileage (70+ mi/week).
- For high-volume weeks where you need more training time, use two workouts in one day (AM/PM doubles) rather than eliminating rest days. A day can have multiple workouts in the "workouts" array — e.g., an AM easy run and a PM strength/strides session.
- Introduce intensity gradually — moderate tempo before hard intervals

OUTPUT FORMAT:
Return ONLY a JSON object with this exact structure:
{
  "athleteAnalysis": {
    "fitnessLevel": 6,
    "limiters": ["limited recent volume"],
    "strengths": ["ultra experience"],
    "riskFactors": ["coming back from low mileage"]
  },
  "phases": [
    { "name": "Base", "startWeek": 1, "endWeek": 3, "focus": "Aerobic development", "weeklyVolumeRange": [150, 200], "keyWorkouts": ["long run", "easy runs"] },
    { "name": "Recovery", "startWeek": 4, "endWeek": 4, "focus": "Adaptation", "weeklyVolumeRange": [100, 130], "keyWorkouts": ["easy runs"] }
  ],
  "weeks": [
    {
      "weekNumber": 1,
      "phase": "Base",
      "days": [
        { "dayOfWeek": "Monday", "workouts": [{ "title": "Rest Day", "blocks": [{ "type": "rest", "value": 0, "unit": "minutes", "effortLevel": "z1" }] }] },
        { "dayOfWeek": "Tuesday", "workouts": [{ "title": "Easy Run", "blocks": [{ "type": "easy", "value": 5, "unit": "miles", "effortLevel": "z2" }] }] },
        { "dayOfWeek": "Wednesday", "workouts": [{ "title": "Hill Sprints", "blocks": [{ "type": "warmUp", "value": 10, "unit": "minutes", "effortLevel": "z1" }, { "type": "intervals", "value": 20, "unit": "seconds", "effortLevel": "z5", "notes": "steep hill", "repeat": { "times": 8, "restBetween": { "value": 90, "unit": "seconds", "effortLevel": "z1" } } }, { "type": "coolDown", "value": 10, "unit": "minutes", "effortLevel": "z1" }] }] },
        { "dayOfWeek": "Thursday", "workouts": [{ "title": "Easy Run", "blocks": [{ "type": "easy", "value": 4, "unit": "miles", "effortLevel": "z2" }] }] },
        { "dayOfWeek": "Friday", "workouts": [{ "title": "Rest Day", "blocks": [{ "type": "rest", "value": 0, "unit": "minutes", "effortLevel": "z1" }] }] },
        { "dayOfWeek": "Saturday", "workouts": [{ "title": "Long Run", "blocks": [{ "type": "longRun", "value": 10, "unit": "miles", "effortLevel": "z2" }] }] },
        { "dayOfWeek": "Sunday", "workouts": [{ "title": "Recovery Run", "blocks": [{ "type": "easy", "value": 3, "unit": "miles", "effortLevel": "z1" }] }] }
      ]
    }
  ]
}

CRITICAL: Include ALL ${input.planWeeks} weeks with ALL 7 days each. Every week must have weekNumber and phase. Every day must have dayOfWeek and workouts.`;
  }

  protected buildUserMessage(input: PlanGeneratorInput): string {
    const { athlete, goal, planWeeks, constraints, raceRequirements, feasibility, feedbackContext } = input;

    const experienceSection = athlete.lifetimeMiles ? `
LIFETIME EXPERIENCE:
- Lifetime miles: ${athlete.lifetimeMiles.toLocaleString()}
- Longest run ever: ${athlete.longestRunEver || "Unknown"} miles
- Peak weekly mileage: ${athlete.peakWeeklyMileage || "Unknown"} miles
- Ultra experience: ${athlete.ultraExperience ? "Yes" : "No"}
- Trail experience: ${athlete.trailExperience ? "Yes" : "No"}` : "";

    const requirementsSection = raceRequirements ? `
RACE REQUIREMENTS (evidence-based targets for ${goal.raceDistance}):
- Distance: ${raceRequirements.distanceMiles} miles
- Peak weekly mileage: ${raceRequirements.peakWeeklyMileage.min}-${raceRequirements.peakWeeklyMileage.ideal}-${raceRequirements.peakWeeklyMileage.max} miles
- Peak long run: ${raceRequirements.peakLongRun.min}-${raceRequirements.peakLongRun.ideal}-${raceRequirements.peakLongRun.max} miles
- Key workouts: ${raceRequirements.keyWorkouts.join(", ")}` : "";

    const feasibilitySection = feasibility ? `
FEASIBILITY ANALYSIS:
- Risk level: ${feasibility.riskLevel.toUpperCase()}
- Starting mileage: ${feasibility.startingWeeklyMileage} miles/week
- Target peak: ${feasibility.targetPeakMileage} miles/week
- Target peak long run: ${feasibility.targetPeakLongRun} miles
- Approach: ${feasibility.suggestedApproach}
${feasibility.warnings.length > 0 ? `- Warnings: ${feasibility.warnings.join("; ")}` : ""}

Use these targets from the feasibility analysis.` : "";

    return `Generate a complete ${planWeeks}-week training plan:

CURRENT FITNESS:
- Experience: ${athlete.experience}
- Weekly mileage: ${athlete.weeklyMileage} miles
- Longest recent run: ${athlete.longestRun} miles
- CTL (fitness): ${athlete.ctl || "N/A"}
- Threshold pace: ${athlete.thresholdPace ? `${Math.floor(athlete.thresholdPace)}:${String(Math.round((athlete.thresholdPace % 1) * 60)).padStart(2, "0")}/mi` : "N/A"}
${experienceSection}

RACE GOAL:
- Race: ${goal.raceName || goal.raceDistance}
- Distance: ${goal.raceDistance}
- Target time: ${goal.targetTime || "Not specified"}
- Elevation: ${goal.elevation ? `${goal.elevation.toLocaleString()} ft gain` : "Not specified"}
- Terrain: ${goal.terrainType || "trail"}
${requirementsSection}
${feasibilitySection}

${constraints ? `CONSTRAINTS:
- Rest days: ${constraints.requiredRestDays?.join(", ") || "None"}
- Long run day: ${constraints.preferredLongRunDay || "Saturday"}
- Max weekly hours: ${constraints.maxWeeklyHours || "Not specified"}` : ""}
${feedbackContext ? `\n${feedbackContext}` : ""}

Return ONLY the JSON object with athleteAnalysis, phases, and all ${planWeeks} weeks.`;
  }

  protected parseResponse(response: string): PlanGeneratorOutput {
    const parsed = extractJSON<PlanGeneratorOutput>(response);

    if (!parsed.athleteAnalysis) {
      throw new Error("Missing athleteAnalysis");
    }
    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      throw new Error("Missing or invalid phases array");
    }
    if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
      throw new Error("Missing or invalid weeks array");
    }

    // Normalize all weeks
    parsed.weeks = parsed.weeks.map((week, i) => {
      // Ensure weekNumber is set
      if (!week.weekNumber) week.weekNumber = i + 1;
      return normalizeWeek(week);
    });

    return parsed;
  }

  protected validateOutput(output: PlanGeneratorOutput): { valid: boolean; error?: string } {
    // Fix phase boundary issues (same as orchestrator)
    for (let i = 1; i < output.phases.length; i++) {
      const prev = output.phases[i - 1];
      const curr = output.phases[i];

      if (curr.startWeek === prev.endWeek) {
        curr.startWeek = prev.endWeek + 1;
      } else if (curr.startWeek > prev.endWeek + 1) {
        prev.endWeek = curr.startWeek - 1;
      }

      if (curr.startWeek <= prev.endWeek) {
        return {
          valid: false,
          error: `Phases overlap: ${prev.name} ends at week ${prev.endWeek}, ${curr.name} starts at week ${curr.startWeek}`,
        };
      }
    }

    // Validate each week structurally
    const weekErrors: string[] = [];
    for (const week of output.weeks) {
      const validation = validateWeek(week);
      if (!validation.valid) {
        weekErrors.push(`Week ${week.weekNumber}: ${validation.errors.join("; ")}`);
      }
    }

    if (weekErrors.length > 3) {
      return { valid: false, error: `Too many structural errors: ${weekErrors.slice(0, 3).join(" | ")}` };
    }

    // Log warnings for minor issues but don't fail
    if (weekErrors.length > 0) {
      console.warn(`[PlanGenerator] Week warnings: ${weekErrors.join("; ")}`);
    }

    return { valid: true };
  }
}

// =============================================================================
// Normalization (extracted from week-generator.ts)
// =============================================================================

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function normalizeWeek(week: Week): Week {
  const normalizedDays: Day[] = DAY_ORDER.map((dayOfWeek) => {
    const existingDay = week.days.find((d) => d.dayOfWeek === dayOfWeek);
    if (existingDay) {
      return {
        ...existingDay,
        workouts: existingDay.workouts.map(normalizeWorkout),
      };
    }
    return {
      dayOfWeek,
      workouts: [
        {
          blocks: [
            { type: "rest" as BlockType, value: 0, unit: "minutes" as BlockUnit, effortLevel: "z1" as EffortLevel },
          ],
        },
      ],
    };
  });

  return { weekNumber: week.weekNumber, phase: week.phase, days: normalizedDays };
}

function normalizeWorkout(workout: Workout): Workout {
  return {
    title: workout.title,
    blocks: workout.blocks.map(normalizeBlock),
  };
}

function normalizeBlock(block: Block): Block {
  const unit: BlockUnit = block.unit || getDefaultUnit(block.type);

  let value: number;
  if (block.type === "rest") {
    value = 0;
  } else if (unit === "miles") {
    value = Math.max(1, Math.round(block.value));
  } else {
    value = Math.max(5, Math.round(block.value / 5) * 5);
  }

  const normalized: Block = {
    type: block.type,
    value,
    unit,
    effortLevel: block.effortLevel,
  };

  if (block.notes) normalized.notes = block.notes;
  if (block.repeat) normalized.repeat = block.repeat;

  return normalized;
}
