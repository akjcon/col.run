/**
 * Orchestrator Agent
 *
 * Strategic planning agent with full book context.
 * Analyzes athlete, designs phase structure, sets weekly targets.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { BaseAgent, extractJSON } from "./base";
import { CONDENSED_METHODOLOGY } from "./methodology-condensed";
import type {
  OrchestratorInput,
  OrchestratorOutput,
} from "./types";

// =============================================================================
// Book Content Cache
// =============================================================================

let bookContentCache: string | null = null;
let useCondensedMethodology = true; // Full book is 130k tokens, exceeds 30k/min rate limit

async function getBookContent(): Promise<string> {
  // Use condensed methodology by default to avoid rate limits
  if (useCondensedMethodology) {
    return CONDENSED_METHODOLOGY;
  }

  if (bookContentCache) {
    return bookContentCache;
  }

  const possiblePaths = [
    join(process.cwd(), "lib", "optimized_book.md"),
    join(process.cwd(), "optimized_book.md"),
  ];

  for (const path of possiblePaths) {
    try {
      const content = await readFile(path, "utf-8");
      bookContentCache = content;
      return content;
    } catch {
      continue;
    }
  }

  throw new Error("Could not find book content");
}

// For testing - allow injecting book content
export function setBookContentForTesting(content: string): void {
  bookContentCache = content;
}

export function clearBookContentCache(): void {
  bookContentCache = null;
}

// Toggle between full book and condensed methodology
export function setUseCondensedMethodology(useCondensed: boolean): void {
  useCondensedMethodology = useCondensed;
}

// =============================================================================
// Orchestrator Agent
// =============================================================================

export class OrchestratorAgent extends BaseAgent<OrchestratorInput, OrchestratorOutput> {
  private bookContent: string = "";

  constructor() {
    super({
      name: "Orchestrator",
      model: "claude-sonnet-4-20250514",
      maxTokens: 8000,
      temperature: 0.3,
    });
  }

  /**
   * Load book content before execution
   */
  async loadBookContent(): Promise<void> {
    this.bookContent = await getBookContent();
  }

  protected validateInput(input: OrchestratorInput): { valid: boolean; error?: string } {
    if (!input.athlete) {
      return { valid: false, error: "Missing athlete profile" };
    }
    if (!input.goal) {
      return { valid: false, error: "Missing race goal" };
    }
    if (!input.planWeeks || input.planWeeks < 4 || input.planWeeks > 52) {
      return { valid: false, error: "Plan weeks must be between 4 and 52" };
    }
    return { valid: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected buildSystemPrompt(_input: OrchestratorInput): string {
    return `You are an expert trail running coach designing a training plan based on "Training for the Uphill Athlete" principles.

Your role is STRATEGIC PLANNING. You will:
1. Analyze the athlete and design the phase structure
2. Set realistic weekly volume targets
3. Write detailed instructions for each week (workouts, structure, rationale)

TRAINING METHODOLOGY REFERENCE:
${this.bookContent}

VOLUME PROGRESSION RULES:
- Start from athlete's current fitness (use feasibility targets if provided)
- Never increase volume more than 10% week-over-week
- Taper: 2-3 weeks before race, 70-80% then 40-50% of peak
- Taper replaces recovery - no separate recovery week needed during taper

RECOVERY WEEKS — THIS IS NON-NEGOTIABLE:
You MUST schedule a recovery week every 3rd or 4th week. No exceptions.
A recovery week has 60-75% of the previous build week's volume. Never below 50% of current weekly mileage.

CRITICAL: Each phase in the "phases" array must be SEQUENTIAL and NON-OVERLAPPING.
Recovery weeks are their OWN phase. You must SPLIT training phases around recovery weeks.

Example for an 18-week plan — the phases array should look like:
  Base (1-3), Recovery (4-4), Base (5-7), Recovery (8-8), Build (9-11), Recovery (12-12), Peak (13-15), Taper (16-18)
NOT: Base (1-8), Recovery (4-4) ← WRONG, this overlaps!

Example for a 12-week plan:
  Base (1-3), Recovery (4-4), Build (5-7), Recovery (8-8), Peak (9-10), Taper (11-12)

Count your weeks and lay out the phases BEFORE writing weekly targets.

BACK-TO-BACK WEEKENDS (for ultras):
Replace a single very long run with TWO SHORTER runs on consecutive days.
Split the total long run volume across Saturday and Sunday using a 60/40 to 70/30 ratio (first day longer).
WRONG: 20mi Saturday + 8mi Sunday (too lopsided — 71/29 split)
WRONG: 25mi Saturday + 11mi Sunday (Saturday is still massive)
CORRECT: 16mi Saturday + 12mi Sunday = 28mi total (57/43 split — neither day extreme)
CORRECT: 18mi Saturday + 10mi Sunday = 28mi total (64/36 split — first day longer but manageable)
Rule: The longer day should be 60-70% of the total, the shorter day 30-40%. Neither day should exceed what a normal long run would be for that training week.

TAPER GUIDELINES:
- No long runs during taper (max 60-70% of normal long run)
- Race week: light running only, no hard workouts
- Taper IS recovery - reduced volume provides rest

PER-WEEK INSTRUCTIONS - include:
- Specific workout prescriptions (intervals, tempo, hill work)
- Long run details (distance, pace, any special structure)
- Effort zone guidance
- Rationale for the week's structure

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "athleteAnalysis": {
    "fitnessLevel": <1-10 scale>,
    "limiters": ["list of current limiters"],
    "strengths": ["list of strengths"],
    "riskFactors": ["injury risks, overtraining risks, etc."]
  },
  "phases": [
    {
      "name": "Base",
      "startWeek": 1,
      "endWeek": 3,
      "focus": "Aerobic development",
      "weeklyVolumeRange": [150, 180],
      "keyWorkouts": ["long run", "easy runs"]
    },
    {
      "name": "Recovery",
      "startWeek": 4,
      "endWeek": 4,
      "focus": "Adaptation and recovery",
      "weeklyVolumeRange": [130, 140],
      "keyWorkouts": ["easy runs only"]
    }
  ],
  "weeklyTargets": [
    {
      "weekNumber": 1,
      "phase": "Base",
      "targetVolume": 150,
      "keyWorkoutType": "longRun",
      "notes": "First week, focus on consistency",
      "instructions": "Easy aerobic week to establish baseline. Long run should be 10-12 miles at z2. Include 4-6 hill strides (20-30sec each) after one easy run to maintain leg turnover."
    },
    {
      "weekNumber": 4,
      "phase": "Recovery",
      "targetVolume": 135,
      "keyWorkoutType": null,
      "notes": "Recovery week",
      "instructions": "Reduced volume for adaptation. All runs at z1-z2. No hard workouts. Long run capped at 8 miles."
    },
    {
      "weekNumber": 10,
      "phase": "Race-Specific",
      "targetVolume": 450,
      "keyWorkoutType": "backToBack",
      "notes": "Back-to-back weekend replacing single long run",
      "instructions": "BACK-TO-BACK WEEKEND: Instead of one 26mi long run, do 16mi Saturday + 12mi Sunday = 28mi total. CRITICAL: Neither day exceeds 18mi - the stress reduction comes from shorter individual runs. Saturday at steady z2, Sunday easier (z1-z2) on tired legs. Include one tempo session mid-week (4x8min z3 with 3min recovery)."
    }
  ],
  "methodology": "Key excerpts from the book relevant to this athlete and plan..."
}`;
  }

  protected buildUserMessage(input: OrchestratorInput): string {
    const { athlete, goal, planWeeks, constraints, raceRequirements, feasibility, feedbackContext } = input;

    // Build experience section if we have lifetime data
    const experienceSection = athlete.lifetimeMiles ? `
LIFETIME EXPERIENCE (what they're capable of):
- Lifetime miles: ${athlete.lifetimeMiles.toLocaleString()} miles
- Longest run EVER: ${athlete.longestRunEver || "Unknown"} miles
- Peak weekly mileage: ${athlete.peakWeeklyMileage || "Unknown"} miles
- Ultra experience: ${athlete.ultraExperience ? "Yes" : "No"}
- Trail experience: ${athlete.trailExperience ? "Yes" : "No"}

IMPORTANT: This athlete is ${athlete.experience.toUpperCase()} level based on lifetime data.
They are currently in a low-volume phase but have significant experience.` : "";

    // Build race requirements section if provided
    const requirementsSection = raceRequirements ? `
RACE REQUIREMENTS (evidence-based targets for ${goal.raceDistance}):
- Race distance: ${raceRequirements.distanceMiles} miles
- Peak weekly mileage needed: ${raceRequirements.peakWeeklyMileage.min}-${raceRequirements.peakWeeklyMileage.ideal}-${raceRequirements.peakWeeklyMileage.max} miles
- Peak long run needed: ${raceRequirements.peakLongRun.min}-${raceRequirements.peakLongRun.ideal}-${raceRequirements.peakLongRun.max} miles
- Key workouts: ${raceRequirements.keyWorkouts.join(", ")}
- Considerations: ${raceRequirements.considerations.slice(0, 3).join("; ")}` : "";

    // Build feasibility section if provided
    const feasibilitySection = feasibility ? `
FEASIBILITY ANALYSIS (pre-computed):
- Risk level: ${feasibility.riskLevel.toUpperCase()}
- Recommended starting mileage: ${feasibility.startingWeeklyMileage} miles/week
- Target peak mileage: ${feasibility.targetPeakMileage} miles/week (${Math.round(feasibility.targetPeakMileage * 9)} min at 9min/mi)
- Target peak long run: ${feasibility.targetPeakLongRun} miles
- Approach: ${feasibility.suggestedApproach}
${feasibility.warnings.length > 0 ? `- Warnings: ${feasibility.warnings.join("; ")}` : ""}

CRITICAL: Use these targets from the feasibility analysis. They account for the athlete's experience
and the race requirements. Convert miles to minutes using appropriate pace for their level.` : "";

    return `Design a ${planWeeks}-week training plan structure for this athlete:

CURRENT FITNESS (last 12 weeks):
- Experience level: ${athlete.experience}
- Current weekly mileage: ${athlete.weeklyMileage} miles
- Longest recent run: ${athlete.longestRun} miles
- CTL (fitness): ${athlete.ctl || "Not provided"}
- Threshold pace: ${athlete.thresholdPace ? `${Math.floor(athlete.thresholdPace)}:${String(Math.round((athlete.thresholdPace % 1) * 60)).padStart(2, '0')}/mi` : "Not provided"}
${experienceSection}

RACE GOAL:
- Race: ${goal.raceName || goal.raceDistance}
- Distance: ${goal.raceDistance}
- Target time: ${goal.targetTime || "Not specified"}
- Race date: ${goal.raceDate ? new Date(goal.raceDate).toLocaleDateString() : "Not specified"}
- Elevation: ${goal.elevation ? `${goal.elevation.toLocaleString()} ft gain` : "Not specified"}
- Terrain: ${goal.terrainType || "trail"}
${requirementsSection}
${feasibilitySection}

${constraints ? `CONSTRAINTS:
- Required rest days: ${constraints.requiredRestDays?.join(", ") || "None"}
- Preferred long run day: ${constraints.preferredLongRunDay || "Not specified"}
- Max weekly hours: ${constraints.maxWeeklyHours || "Not specified"}` : ""}
${feedbackContext ? `\n${feedbackContext}` : ""}

Return ONLY the JSON object, no additional text.`;
  }

  protected parseResponse(response: string): OrchestratorOutput {
    const parsed = extractJSON<OrchestratorOutput>(response);

    // Validate required fields
    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      throw new Error("Missing or invalid phases array");
    }
    if (!parsed.weeklyTargets || !Array.isArray(parsed.weeklyTargets)) {
      throw new Error("Missing or invalid weeklyTargets array");
    }
    if (!parsed.athleteAnalysis) {
      throw new Error("Missing athleteAnalysis");
    }
    if (!parsed.methodology) {
      throw new Error("Missing methodology excerpts");
    }

    return parsed;
  }

  protected validateOutput(output: OrchestratorOutput): { valid: boolean; error?: string } {
    // Fix and validate phase sequencing
    // LLMs often produce phases with boundary issues. Auto-correct common problems:
    // 1. Off-by-one overlap (Base: 1-6, Build: 6-12 → fix Build to start at 7)
    // 2. Gaps (Base: 1-5, Build: 7-12 → extend Base to end at 6)
    for (let i = 1; i < output.phases.length; i++) {
      const prev = output.phases[i - 1];
      const curr = output.phases[i];

      if (curr.startWeek === prev.endWeek) {
        // Off-by-one overlap: bump startWeek
        curr.startWeek = prev.endWeek + 1;
      } else if (curr.startWeek > prev.endWeek + 1) {
        // Gap between phases: extend previous phase to close the gap
        prev.endWeek = curr.startWeek - 1;
      }

      if (curr.startWeek <= prev.endWeek) {
        return { valid: false, error: `Phases overlap: ${prev.name} ends at week ${prev.endWeek}, ${curr.name} starts at week ${curr.startWeek}` };
      }
    }

    // Check weekly targets match plan length
    const expectedWeeks = output.weeklyTargets.length;
    const lastPhaseEnd = output.phases[output.phases.length - 1]?.endWeek;
    if (lastPhaseEnd !== expectedWeeks) {
      return { valid: false, error: `Phase end week (${lastPhaseEnd}) doesn't match target count (${expectedWeeks})` };
    }

    // Volume progression check - warn but don't block for testing
    // This lets us see what plans are actually generated
    let recentPeak = output.weeklyTargets[0].targetVolume;
    const warnings: string[] = [];

    for (let i = 1; i < output.weeklyTargets.length; i++) {
      const prev = output.weeklyTargets[i - 1].targetVolume;
      const curr = output.weeklyTargets[i].targetVolume;

      if (prev > recentPeak) {
        recentPeak = prev;
      }

      if (prev < recentPeak) {
        const maxAllowed = recentPeak * 1.20; // 20% hard limit for post-recovery
        if (curr > maxAllowed) {
          warnings.push(`Week ${i + 1} volume (${curr}) exceeds post-recovery limit (${Math.round(maxAllowed)})`);
        }
      } else {
        const increase = (curr - prev) / prev;
        if (increase > 0.20) { // 20% hard limit
          warnings.push(`Week ${i + 1} has ${Math.round(increase * 100)}% volume increase`);
        }
      }
    }

    // Log warnings but don't fail - we want to see the full pipeline output
    if (warnings.length > 0) {
      console.warn(`[Orchestrator] Volume warnings: ${warnings.join("; ")}`);
    }

    return { valid: true };
  }

  /**
   * Execute with book content pre-loaded
   */
  async execute(input: OrchestratorInput) {
    if (!this.bookContent) {
      await this.loadBookContent();
    }
    return super.execute(input);
  }
}
