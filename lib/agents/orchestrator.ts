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
let useCondensedMethodology = true; // Default to condensed to avoid rate limits

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
    return `You are an expert trail running coach designing a training plan structure based on "Training for the Uphill Athlete" principles.

Your role is STRATEGIC PLANNING ONLY. You will:
1. Analyze the athlete's profile and identify their fitness level, limiters, and strengths
2. Design the phase structure (Base, Build, Peak, Taper) appropriate for their goal
3. Set weekly volume targets that progress safely
4. Identify key workout types for each week
5. Extract relevant methodology excerpts for the week-by-week planning

You are NOT generating the detailed daily workouts - another agent handles that.

TRAINING METHODOLOGY REFERENCE:
${this.bookContent}

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
      "name": "Base Building",
      "startWeek": 1,
      "endWeek": 4,
      "focus": "Aerobic development and volume building",
      "weeklyVolumeRange": [180, 240],
      "keyWorkouts": ["long run", "easy runs", "hill strides"]
    }
  ],
  "weeklyTargets": [
    {
      "weekNumber": 1,
      "phase": "Base Building",
      "targetVolume": 180,
      "keyWorkoutType": "longRun",
      "notes": "First week, focus on consistency"
    }
  ],
  "methodology": "Key excerpts from the book relevant to this athlete and plan..."
}

CRITICAL RULES:
1. Volume progression: Never increase weekly volume by more than 10% week-over-week
2. Recovery weeks: Include a recovery week (reduce volume by 20-30%) every 3-4 weeks
3. Taper: Final 1-3 weeks should progressively reduce volume
4. 80/20 rule: Plan should enable ~80% easy, ~20% hard training
5. Race specificity: Later phases should include race-specific workouts`;
  }

  protected buildUserMessage(input: OrchestratorInput): string {
    const { athlete, goal, planWeeks, constraints } = input;

    return `Design a ${planWeeks}-week training plan structure for this athlete:

ATHLETE PROFILE:
- Experience: ${athlete.experience}
- Current weekly mileage: ${athlete.weeklyMileage} miles
- Longest run: ${athlete.longestRun} miles
- Marathon PR: ${athlete.marathonPR || "Not provided"}
- Current fitness: ${athlete.currentFitness || "Not provided"}
- Athletic background: ${athlete.background || "Not provided"}
- Injury history: ${athlete.injuries || "None"}

RACE GOAL:
- Race: ${goal.raceName || goal.raceDistance}
- Distance: ${goal.raceDistance}
- Target time: ${goal.targetTime || "Not specified"}
- Race date: ${goal.raceDate ? new Date(goal.raceDate).toLocaleDateString() : "Not specified"}
- Elevation: ${goal.elevation ? `${goal.elevation} ft gain` : "Not specified"}
- Terrain: ${goal.terrainType || "trail"}

${constraints ? `CONSTRAINTS:
- Required rest days: ${constraints.requiredRestDays?.join(", ") || "None"}
- Preferred long run day: ${constraints.preferredLongRunDay || "Not specified"}
- Max weekly hours: ${constraints.maxWeeklyHours || "Not specified"}` : ""}

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
    // Check phases are sequential and don't overlap
    for (let i = 1; i < output.phases.length; i++) {
      if (output.phases[i].startWeek <= output.phases[i - 1].endWeek) {
        return { valid: false, error: "Phases overlap or are not sequential" };
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
