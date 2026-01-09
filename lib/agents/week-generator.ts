/**
 * Week Generator Agent
 *
 * Tactical planning agent with focused context.
 * Generates detailed daily workouts with blocks for a single week.
 */

import { BaseAgent, extractJSON } from "./base";
import type { Week, Day, Workout, Block, BlockType, EffortLevel } from "@/lib/blocks";
import { validateWeek, VALID_BLOCK_TYPES, VALID_EFFORT_LEVELS } from "@/lib/blocks";
import type { WeekGeneratorInput, WeekGeneratorOutput } from "./types";

// =============================================================================
// Week Generator Agent
// =============================================================================

export class WeekGeneratorAgent extends BaseAgent<WeekGeneratorInput, WeekGeneratorOutput> {
  constructor() {
    super({
      name: "WeekGenerator",
      model: "claude-sonnet-4-20250514",
      maxTokens: 4000,
      temperature: 0.3,
    });
  }

  protected validateInput(input: WeekGeneratorInput): { valid: boolean; error?: string } {
    if (!input.weekNumber || input.weekNumber < 1) {
      return { valid: false, error: "Invalid week number" };
    }
    if (!input.target) {
      return { valid: false, error: "Missing weekly target" };
    }
    if (!input.phase) {
      return { valid: false, error: "Missing phase information" };
    }
    return { valid: true };
  }

  protected buildSystemPrompt(input: WeekGeneratorInput): string {
    const blockTypesStr = VALID_BLOCK_TYPES.join(", ");
    const effortLevelsStr = VALID_EFFORT_LEVELS.join(", ");

    return `You are an expert trail running coach creating detailed daily workouts for a single training week.

Your role is TACTICAL EXECUTION. You will generate the specific workout blocks for each day of the week.

BLOCK STRUCTURE:
Each workout is composed of blocks. A block has:
- type: One of [${blockTypesStr}]
- value: Duration in minutes (must be > 0, except rest which can be 0)
- effortLevel: One of [${effortLevelsStr}]

BLOCK TYPE DEFINITIONS:
- warmUp: Pre-workout warm-up (typically z1)
- easy: Easy aerobic running (z1-z2)
- tempo: Sustained threshold effort (z3)
- intervals: High intensity repeats (z4-z5)
- recovery: Recovery jog between efforts (z1)
- longRun: Extended aerobic run (z1-z2)
- coolDown: Post-workout cool-down (z1)
- rest: Complete rest day (value=0, effortLevel=z1)

EFFORT ZONES:
- z1: Very easy, conversational
- z2: Easy aerobic, can speak sentences
- z3: Moderate, tempo effort
- z4: Hard, threshold to VO2max
- z5: Very hard, max effort intervals

METHODOLOGY GUIDANCE:
${input.methodology}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "week": {
    "weekNumber": ${input.weekNumber},
    "phase": "${input.target.phase}",
    "days": [
      {
        "dayOfWeek": "Monday",
        "workouts": [
          {
            "blocks": [
              { "type": "rest", "value": 0, "effortLevel": "z1" }
            ]
          }
        ]
      },
      {
        "dayOfWeek": "Tuesday",
        "workouts": [
          {
            "blocks": [
              { "type": "warmUp", "value": 10, "effortLevel": "z1" },
              { "type": "easy", "value": 35, "effortLevel": "z2" },
              { "type": "coolDown", "value": 5, "effortLevel": "z1" }
            ]
          }
        ]
      }
    ]
  }
}

CRITICAL RULES:
1. Include all 7 days (Monday through Sunday)
2. Total weekly volume should be approximately ${input.target.targetVolume} minutes
3. Rest days: Use a single block with type="rest", value=0, effortLevel="z1"
4. Hard workouts (tempo, intervals) need warmUp and coolDown blocks
5. 80/20 rule: ~80% of volume should be z1-z2, ~20% z3-z5
6. Don't schedule hard workouts on consecutive days
7. Long run typically on weekend`;
  }

  protected buildUserMessage(input: WeekGeneratorInput): string {
    const { weekNumber, target, phase, previousWeek, constraints, athleteProfile } = input;

    let message = `Generate week ${weekNumber} of the training plan.

WEEK TARGET:
- Week: ${weekNumber}
- Phase: ${target.phase}
- Target volume: ${target.targetVolume} minutes
- Key workout: ${target.keyWorkoutType || "None specified"}
- Notes: ${target.notes || "None"}

PHASE CONTEXT:
- Phase name: ${phase.name}
- Phase focus: ${phase.focus}
- Key workouts for phase: ${phase.keyWorkouts.join(", ")}

ATHLETE:
- Experience: ${athleteProfile.experience}
- Current weekly mileage: ${athleteProfile.weeklyMileage} miles`;

    if (previousWeek) {
      message += `

PREVIOUS WEEK SUMMARY:
${summarizeWeek(previousWeek)}`;
    }

    if (constraints?.requiredRestDays?.length) {
      message += `

REQUIRED REST DAYS: ${constraints.requiredRestDays.join(", ")}`;
    }

    if (constraints?.preferredLongRunDay) {
      message += `
PREFERRED LONG RUN DAY: ${constraints.preferredLongRunDay}`;
    }

    message += `

Return ONLY the JSON object, no additional text.`;

    return message;
  }

  protected parseResponse(response: string): WeekGeneratorOutput {
    const parsed = extractJSON<{ week: Week }>(response);

    if (!parsed.week) {
      throw new Error("Missing week in response");
    }

    // Normalize the week structure
    const week = normalizeWeek(parsed.week);

    return { week };
  }

  protected validateOutput(output: WeekGeneratorOutput): { valid: boolean; error?: string } {
    const validation = validateWeek(output.week);
    if (!validation.valid) {
      return { valid: false, error: validation.errors.join("; ") };
    }
    return { valid: true };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Summarize a week for context
 */
function summarizeWeek(week: Week): string {
  const totalMinutes = week.days.reduce((sum, day) => {
    return sum + day.workouts.reduce((wSum, workout) => {
      return wSum + workout.blocks.reduce((bSum, block) => bSum + block.value, 0);
    }, 0);
  }, 0);

  const hardDays = week.days.filter(day =>
    day.workouts.some(w =>
      w.blocks.some(b =>
        b.type === "intervals" || b.type === "tempo" ||
        b.effortLevel === "z4" || b.effortLevel === "z5"
      )
    )
  ).map(d => d.dayOfWeek);

  const restDays = week.days.filter(day =>
    day.workouts.every(w =>
      w.blocks.every(b => b.type === "rest")
    )
  ).map(d => d.dayOfWeek);

  return `Week ${week.weekNumber} (${week.phase}):
- Total: ${totalMinutes} minutes
- Hard days: ${hardDays.join(", ") || "None"}
- Rest days: ${restDays.join(", ") || "None"}`;
}

/**
 * Normalize week structure to ensure consistency
 */
function normalizeWeek(week: Week): Week {
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Ensure all days exist and are in order
  const normalizedDays: Day[] = dayOrder.map(dayOfWeek => {
    const existingDay = week.days.find(d => d.dayOfWeek === dayOfWeek);
    if (existingDay) {
      return {
        ...existingDay,
        workouts: existingDay.workouts.map(normalizeWorkout),
      };
    }
    // Default to rest day if missing
    return {
      dayOfWeek,
      workouts: [{
        blocks: [{ type: "rest" as BlockType, value: 0, effortLevel: "z1" as EffortLevel }],
      }],
    };
  });

  return {
    weekNumber: week.weekNumber,
    phase: week.phase,
    days: normalizedDays,
  };
}

/**
 * Normalize workout blocks
 */
function normalizeWorkout(workout: Workout): Workout {
  return {
    blocks: workout.blocks.map(normalizeBlock),
  };
}

/**
 * Normalize a single block
 */
function normalizeBlock(block: Block): Block {
  return {
    type: block.type,
    value: Math.max(0, Math.round(block.value)),
    effortLevel: block.effortLevel,
  };
}
