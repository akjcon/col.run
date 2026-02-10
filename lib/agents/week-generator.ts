/**
 * Week Generator Agent
 *
 * Tactical planning agent with focused context.
 * Generates detailed daily workouts with blocks for a single week.
 */

import { BaseAgent, extractJSON } from "./base";
import type { Week, Day, Workout, Block, BlockType, EffortLevel, BlockUnit } from "@/lib/blocks";
import {
  validateWeek,
  VALID_BLOCK_TYPES,
  VALID_EFFORT_LEVELS,
  getDefaultUnit,
} from "@/lib/blocks";
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

    // Convert target volume (minutes) to approximate miles for guidance
    // Use athlete's pace if available, otherwise default 10 min/mile
    const paceMinPerMile = input.athleteProfile.thresholdPace
      ? input.athleteProfile.thresholdPace * 1.3 // Easy pace ~30% slower than threshold
      : 10;
    const targetMiles = Math.round(input.target.targetVolume / paceMinPerMile);

    return `You are an expert trail running coach creating detailed daily workouts for a single training week.

Your role is TACTICAL EXECUTION. You will generate the specific workout blocks for each day of the week.

BLOCK STRUCTURE:
Each workout is composed of blocks. A block has:
- type: One of [${blockTypesStr}]
- value: DEPENDS ON TYPE (see below)
- unit: "miles" for easy/longRun, "minutes" or "seconds" for workouts
- effortLevel: One of [${effortLevelsStr}]
- notes: (optional) Additional instructions, e.g., "on steep hill", "at race pace"
- repeat: (optional) For interval workouts, specifies repetitions:
  - times: number of repetitions
  - restBetween: { value, unit, effortLevel } for recovery between reps

CRITICAL - VALUE UNITS BY BLOCK TYPE:
- easy, longRun: value is in MILES (e.g., 5 for "5 miles easy") - use unit="miles"
- warmUp, intervals, tempo, recovery, coolDown: value is in MINUTES - use unit="minutes"
- rest: value=0, unit="minutes"

BLOCK TYPE DEFINITIONS:
- warmUp: Pre-workout warm-up, ~10min (unit=minutes) - ONLY for tempo/interval days
- easy: Easy aerobic running (unit=MILES, round to whole numbers) - NO warmup/cooldown needed
- tempo: Sustained threshold effort (unit=minutes)
- intervals: High intensity repeats (unit=minutes for total interval time)
- recovery: Recovery jog between efforts, ~5min (unit=minutes)
- longRun: Extended aerobic run (unit=MILES, round to whole numbers) - NO warmup/cooldown needed
- coolDown: Post-workout cool-down, ~5-10min (unit=minutes) - ONLY for tempo/interval days
- rest: Complete rest day (value=0, unit=minutes)

ROUNDING RULES:
- Miles MUST be whole numbers (1, 2, 3, ..., 20) - NO decimals like 5.5 or 7.3
- Minutes can be any reasonable value (5, 10, 15, 20, 25, 30, etc.)

EFFORT ZONES:
- z1: Very easy, conversational
- z2: Easy aerobic, can speak sentences
- z3: Moderate, tempo effort
- z4: Hard, threshold to VO2max
- z5: Very hard, max effort intervals

CORE TRAINING PRINCIPLES:
- 80% of training at z1-z2 (easy/aerobic), 20% at z3-z5 (hard)
- Never schedule hard workouts on consecutive days
- Long runs build aerobic endurance - keep mostly z2
- Recovery runs are very easy (z1)
- Hill workouts build strength for mountain races
- Back-to-back weekends: split long run across Sat+Sun, neither day extreme

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
              { "type": "rest", "value": 0, "unit": "minutes", "effortLevel": "z1" }
            ]
          }
        ]
      },
      {
        "dayOfWeek": "Tuesday",
        "workouts": [
          {
            "blocks": [
              { "type": "easy", "value": 5, "unit": "miles", "effortLevel": "z2" }
            ]
          }
        ]
      },
      {
        "dayOfWeek": "Wednesday",
        "workouts": [
          {
            "blocks": [
              { "type": "warmUp", "value": 10, "unit": "minutes", "effortLevel": "z1" },
              { "type": "intervals", "value": 30, "unit": "seconds", "effortLevel": "z5", "notes": "hill sprints", "repeat": { "times": 8, "restBetween": { "value": 90, "unit": "seconds", "effortLevel": "z1" } } },
              { "type": "coolDown", "value": 10, "unit": "minutes", "effortLevel": "z1" }
            ]
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "workouts": [
          {
            "blocks": [
              { "type": "warmUp", "value": 10, "unit": "minutes", "effortLevel": "z1" },
              { "type": "tempo", "value": 5, "unit": "minutes", "effortLevel": "z3", "repeat": { "times": 4, "restBetween": { "value": 2, "unit": "minutes", "effortLevel": "z1" } } },
              { "type": "coolDown", "value": 10, "unit": "minutes", "effortLevel": "z1" }
            ]
          }
        ]
      },
      {
        "dayOfWeek": "Saturday",
        "workouts": [
          {
            "blocks": [
              { "type": "longRun", "value": 12, "unit": "miles", "effortLevel": "z2", "notes": "on hilly terrain if possible" }
            ]
          }
        ]
      }
    ]
  }
}

CRITICAL RULES:
1. Include all 7 days (Monday through Sunday)
2. Target weekly volume: ~${targetMiles} miles (${input.target.targetVolume} min at ~${Math.round(paceMinPerMile)} min/mile)
   - easy/longRun blocks: use MILES (whole numbers only!)
   - workout blocks (warmUp, intervals, tempo, coolDown): use MINUTES
3. Rest days: Use a single block with type="rest", value=0, unit="minutes", effortLevel="z1"
4. Easy runs and long runs: JUST the single easy/longRun block, NO warmUp/coolDown
5. Hard workouts ONLY (tempo, intervals): Include warmUp and coolDown blocks
6. 80/20 rule: ~80% of volume should be z1-z2, ~20% z3-z5
7. Don't schedule hard workouts on consecutive days
8. Long run typically on weekend

VOLUME ESTIMATION:
- Assume ~${Math.round(paceMinPerMile)} min/mile for easy running
- Target: ~${targetMiles} total miles across the week`;
  }

  protected buildUserMessage(input: WeekGeneratorInput): string {
    const { weekNumber, target, phase, previousWeek, constraints, athleteProfile } = input;

    // Calculate approximate miles target
    const paceMinPerMile = athleteProfile.thresholdPace
      ? athleteProfile.thresholdPace * 1.3
      : 10;
    const targetMiles = Math.round(target.targetVolume / paceMinPerMile);
    const longRunMiles = Math.round(targetMiles * 0.35); // Long run ~35% of weekly volume

    let message = `Generate week ${weekNumber} of the training plan.

WEEK TARGET:
- Week: ${weekNumber}
- Phase: ${target.phase}
- Target volume: ~${targetMiles} miles (~${target.targetVolume} minutes)
- Key workout: ${target.keyWorkoutType || "None specified"}
- Notes: ${target.notes || "None"}
${target.instructions ? `
ORCHESTRATOR INSTRUCTIONS (FOLLOW THESE CAREFULLY):
${target.instructions}

IMPORTANT: The above instructions come from the strategic planning agent who has full book context.
Follow these specific prescriptions exactly, including any back-to-back splits, interval formats, and hill workouts.
` : ""}

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

VOLUME DISTRIBUTION (in miles - use whole numbers!):
- Total target: ~${targetMiles} miles
- Long run: ${longRunMiles} miles (on weekend)
- Remaining: ${targetMiles - longRunMiles} miles split across 3-4 other run days
- Include 2-3 rest days
- Easy runs: 4-8 miles each (whole numbers!)
- Warmup/cooldown: 5-10 minutes each

REMEMBER:
- easy/longRun blocks use unit="miles" with WHOLE NUMBER values
- warmUp/intervals/tempo/recovery/coolDown use unit="minutes"

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
        blocks: [{
          type: "rest" as BlockType,
          value: 0,
          unit: "minutes" as BlockUnit,
          effortLevel: "z1" as EffortLevel
        }],
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
 * - Adds unit field based on block type if missing
 * - Rounds values appropriately (miles to whole numbers, minutes to 5s)
 */
function normalizeBlock(block: Block): Block {
  // Determine correct unit for this block type
  const unit: BlockUnit = block.unit || getDefaultUnit(block.type);

  // Round value appropriately
  let value: number;
  if (block.type === "rest") {
    value = 0;
  } else if (unit === "miles") {
    // Miles should be whole numbers
    value = Math.max(1, Math.round(block.value));
  } else {
    // Minutes - round to nearest 5 for cleaner workouts
    value = Math.max(5, Math.round(block.value / 5) * 5);
  }

  const normalized: Block = {
    type: block.type,
    value,
    unit,
    effortLevel: block.effortLevel,
  };

  // Preserve notes if present
  if (block.notes) {
    normalized.notes = block.notes;
  }

  // Preserve repeat structure if present
  if (block.repeat) {
    normalized.repeat = block.repeat;
  }

  return normalized;
}
