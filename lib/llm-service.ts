import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import { join } from "path";
import { UserData, ChatContext, TrainingPlan } from "./types";
import { calculateCurrentWeek } from "./plan-utils";
import {
  calculateWeekTotalMiles,
  countHardDays,
  countRestDays,
  isRestDay,
  calculateDayTotalMiles,
} from "./blocks/calculations";
import type { Day } from "./blocks/types";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache for book content to avoid re-reading
let bookContentCache: string | null = null;

// Load the book content once and cache it
async function getBookContent(): Promise<string> {
  if (bookContentCache) {
    return bookContentCache;
  }

  try {
    // Try multiple possible paths for the book
    const possiblePaths = [
      join(process.cwd(), "lib", "optimized_book.md"),
      join(process.cwd(), "optimized_book.md"),
      join(process.cwd(), "..", "optimized_book.md"),
      join(process.cwd(), "..", "..", "optimized_book.md"),
    ];

    for (const path of possiblePaths) {
      try {
        const content = await readFile(path, "utf-8");
        bookContentCache = content;
        console.log(`Successfully loaded book content from: ${path}`);
        return content;
      } catch {
        // Continue to next path
        continue;
      }
    }

    throw new Error("Could not find book content in any expected location");
  } catch (error) {
    console.error("Error loading book content:", error);
    return "Book content not available. Please ensure the book file is accessible.";
  }
}

// Chat system prompt for ongoing conversations
function generateChatPrompt(userData: UserData): string {
  const background = userData.trainingBackground;
  const plan = userData.activePlan;
  const snapshot = (userData as unknown as Record<string, unknown>).athleteSnapshot as Record<string, unknown> | undefined;

  const today = new Date();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const todayName = dayNames[today.getDay()];

  // Build athlete profile from best available data (snapshot > background > defaults)
  const profileLines: string[] = [];

  if (snapshot) {
    if (snapshot.experienceLevel) profileLines.push(`- Experience level: ${snapshot.experienceLevel}`);
    if (snapshot.currentWeeklyMileage) profileLines.push(`- Current weekly mileage: ${snapshot.currentWeeklyMileage} miles`);
    if (snapshot.peakWeeklyMileage) profileLines.push(`- Peak weekly mileage: ${snapshot.peakWeeklyMileage} miles`);
    if (snapshot.lifetimeMiles) profileLines.push(`- Lifetime miles: ${snapshot.lifetimeMiles}`);
    if (snapshot.thresholdPace) {
      const tp = snapshot.thresholdPace as number;
      const tpMin = Math.floor(tp);
      const tpSec = Math.round((tp - tpMin) * 60);
      profileLines.push(`- Threshold pace: ${tpMin}:${tpSec.toString().padStart(2, "0")}/mi (used for pace zones)`);
    } else if (snapshot.estimatedThresholdPace) {
      const tp = snapshot.estimatedThresholdPace as number;
      const tpMin = Math.floor(tp);
      const tpSec = Math.round((tp - tpMin) * 60);
      profileLines.push(`- Estimated threshold pace: ${tpMin}:${tpSec.toString().padStart(2, "0")}/mi (from Strava data)`);
    }
    if (snapshot.ctl) profileLines.push(`- Current fitness (CTL): ${snapshot.ctl}`);
    if (snapshot.tsb) profileLines.push(`- Training stress balance: ${snapshot.tsb}`);
    if (snapshot.ultraExperience) profileLines.push(`- Has ultra running experience`);
    if (snapshot.trailExperience) profileLines.push(`- Has trail running experience`);
  }

  if (background) {
    if (background.experience && !snapshot?.experienceLevel)
      profileLines.push(`- Experience: ${background.experience}`);
    if (background.weeklyMileage && !snapshot?.currentWeeklyMileage)
      profileLines.push(`- Current volume: ${background.weeklyMileage} miles/week`);
    if (background.background)
      profileLines.push(`- Background: ${background.background}`);
    if (background.goals?.raceDistance)
      profileLines.push(`- Goal race: ${background.goals.raceDistance}`);
    if (background.goals?.targetTime)
      profileLines.push(`- Target time: ${background.goals.targetTime}`);
  }

  // Build today's workout section
  let todayWorkout = "";
  if (plan) {
    const currentWeek = calculateCurrentWeek(plan.startDate, plan.totalWeeks);
    const week = plan.weeks?.find((w) => w.weekNumber === currentWeek);
    if (week) {
      const todayDay = week.days?.find((d) => d.dayOfWeek === todayName);
      if (todayDay) {
        todayWorkout = `\nTODAY'S WORKOUT (${todayName}, Week ${currentWeek}):\n${formatDaySummary(todayDay)}`;
        // Include notes if present
        const notes = todayDay.workouts
          ?.flatMap((w) => w.blocks)
          .filter((b) => b.notes)
          .map((b) => b.notes);
        if (notes?.length) {
          todayWorkout += `\nNotes: ${notes.join("; ")}`;
        }
      }
    }
  }

  // Current training status
  let statusSection = "";
  if (plan) {
    const currentWeek = calculateCurrentWeek(plan.startDate, plan.totalWeeks);
    const currentPhase = plan.phases?.find(
      (p) => currentWeek >= p.startWeek && currentWeek <= p.endWeek
    );
    statusSection = `\nCURRENT STATUS:
- Today: ${todayName}
- Training week: ${currentWeek} of ${plan.totalWeeks}
- Current phase: ${currentPhase?.name || plan.weeks?.find((w) => w.weekNumber === currentWeek)?.phase || "Unknown"}`;
  }

  const athleteProfile = profileLines.length > 0
    ? `\nATHLETE PROFILE:\n${profileLines.join("\n")}`
    : "\nATHLETE PROFILE:\n- No profile data available yet";

  return `You are an expert trail running coach with access to "Training for the Uphill Athlete" book. You're coaching this specific athlete.
${athleteProfile}
${statusSection}
${todayWorkout}

COACHING STYLE:
You're a wise, experienced coach — think grizzled ultrarunner who's seen it all. Be concise, direct, and occasionally funny. No fluff.
- Keep responses SHORT: 2-4 sentences for simple questions, a short paragraph + bullets for complex ones.
- Lead with the answer, not the preamble. Skip "Great question!" and "That's a smart call!" — just coach.
- Be specific: reference their actual workout, pace, zones, mileage — not generic advice.
- One good insight beats five okay paragraphs.
- Occasional dry humor is welcome. You've coached thousands of runners and have stories.
- When they ask about today's run, give the specific guidance immediately.
- Draw from the book methodology but don't lecture about it unless asked.`;
}

// Quick context LLM (for simple Q&A, quick responses)
export async function quickChatResponse(
  message: string,
  userData?: UserData
): Promise<string> {
  try {
    let systemPrompt =
      "You are a helpful trail running coach. Provide brief, actionable advice.";

    if (userData?.trainingBackground) {
      systemPrompt = `You are a trail running coach. The user is ${userData.trainingBackground.experience} level, training for ${userData.trainingBackground.goals.raceDistance}. Give brief, helpful advice.`;
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022", // Faster, cheaper model
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    return response.content[0]?.type === "text"
      ? response.content[0].text
      : "Sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Error in quick chat response:", error);
    return "Sorry, I'm having trouble responding right now. Please try again.";
  }
}

// Full context LLM (for detailed coaching with book knowledge)
export async function fullChatResponse(
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>,
  userData: UserData
): Promise<string> {
  try {
    const bookContent = await getBookContent();
    const systemPrompt = generateChatPrompt(userData);

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022", // Full model with book context
      max_tokens: 1500,
      temperature: 0.7,
      system: `${systemPrompt}\n\nBOOK REFERENCE:\n${bookContent}`,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    return response.content[0]?.type === "text"
      ? response.content[0].text
      : "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error in full chat response:", error);
    return "Sorry, I'm having trouble accessing my training knowledge right now. Please try again.";
  }
}

// Utility function to determine which LLM to use based on request type
export function shouldUseFullContext(message: string): boolean {
  const fullContextKeywords = [
    "training plan",
    "periodization",
    "heart rate zones",
    "race strategy",
    "nutrition",
    "altitude",
    "book",
    "uphill athlete",
    "detailed",
    "explain",
    "why",
    "how does",
    "methodology",
    "aerobic",
    "anaerobic",
    "lactate",
  ];

  const lowerMessage = message.toLowerCase();
  return fullContextKeywords.some((keyword) => lowerMessage.includes(keyword));
}

// Build a human-readable context section from ChatContext
export function buildContextPrompt(context: ChatContext): string {
  const lines: string[] = [];

  if (context.trigger === "workout" && context.workout) {
    const w = context.workout;
    lines.push(
      `The athlete is looking at: Today's Workout — "${w.title}"${w.miles ? ` (${w.miles} miles` : ""}${w.minutes ? `, ~${w.minutes} min` : ""}${w.effortLevel ? `, ${w.effortLevel}` : ""}${w.miles ? ")" : ""}`
    );
    if (w.blocks?.length) {
      lines.push(`Workout blocks: ${w.blocks.join(", ")}`);
    }
    if (w.isCompleted) {
      lines.push("This workout has already been completed.");
    }
    lines.push('They clicked "Ask Coach" on this workout.');
  } else if (context.trigger === "tomorrow" && context.workout) {
    const w = context.workout;
    lines.push(
      `The athlete is looking at: Tomorrow's Workout — "${w.title}"${w.miles ? ` (${w.miles} miles` : ""}${w.minutes ? `, ~${w.minutes} min` : ""}${w.effortLevel ? `, ${w.effortLevel}` : ""}${w.miles ? ")" : ""}`
    );
    lines.push('They clicked "Ask Coach" on tomorrow\'s workout.');
  } else if (context.trigger === "progress" && context.progress) {
    const p = context.progress;
    lines.push(
      `The athlete is viewing their training progress: Week ${p.currentWeek} of ${p.totalWeeks}`
    );
    if (p.phaseName) lines.push(`Current phase: ${p.phaseName}`);
    if (p.thisWeekMiles) lines.push(`This week's planned mileage: ${p.thisWeekMiles} miles`);
    if (p.raceDistance) lines.push(`Goal race: ${p.raceDistance}`);
    lines.push('They clicked "Ask Coach" on their progress overview.');
  } else if (context.trigger === "sidebar") {
    lines.push("The athlete opened the coach from the sidebar (general question).");
  }

  return lines.length > 0 ? `\nCURRENT CONTEXT:\n${lines.join("\n")}` : "";
}

// =============================================================================
// Plan Modification Tool Schema
// =============================================================================

const BLOCK_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object" as const,
  properties: {
    type: {
      type: "string",
      enum: ["warmUp", "intervals", "recovery", "rest", "coolDown", "tempo", "longRun", "easy"],
    },
    value: { type: "number", description: "Amount: miles for easy/longRun, minutes for others. 0 for rest." },
    unit: { type: "string", enum: ["minutes", "miles", "seconds"] },
    effortLevel: { type: "string", enum: ["z1", "z2", "z3", "z4", "z5"] },
    notes: { type: "string", description: "Optional coaching notes" },
    repeat: {
      type: "object",
      description: "For intervals only: e.g. 6x5min",
      properties: {
        times: { type: "number" },
        restBetween: {
          type: "object",
          properties: {
            value: { type: "number" },
            unit: { type: "string", enum: ["minutes", "miles", "seconds"] },
            effortLevel: { type: "string", enum: ["z1", "z2", "z3", "z4", "z5"] },
          },
          required: ["value", "unit", "effortLevel"],
        },
      },
      required: ["times"],
    },
  },
  required: ["type", "value", "unit", "effortLevel"],
};

const WORKOUT_SCHEMA = {
  type: "object" as const,
  properties: {
    blocks: { type: "array", items: BLOCK_SCHEMA },
  },
  required: ["blocks"],
};

const DAY_SCHEMA = {
  type: "object" as const,
  properties: {
    dayOfWeek: {
      type: "string",
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    workouts: { type: "array", items: WORKOUT_SCHEMA },
  },
  required: ["dayOfWeek", "workouts"],
};

const WEEK_SCHEMA = {
  type: "object" as const,
  properties: {
    weekNumber: { type: "number" },
    phase: { type: "string" },
    days: { type: "array", items: DAY_SCHEMA, minItems: 7, maxItems: 7 },
  },
  required: ["weekNumber", "phase", "days"],
};

const PLAN_MODIFICATION_TOOL: Anthropic.Tool = {
  name: "propose_plan_changes",
  description:
    "Propose modifications to the athlete's training plan. Use when athlete requests changes to their training. Supports replacing entire weeks or individual days. Always provide a text explanation before calling this tool.",
  input_schema: {
    type: "object" as const,
    properties: {
      reasoning: {
        type: "string",
        description: "2-3 sentence explanation of the changes and rationale",
      },
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["replace_week", "replace_day"] },
            weekNumber: { type: "number", description: "1-based week number" },
            dayOfWeek: {
              type: "string",
              description: "Required for replace_day",
              enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            },
            summary: { type: "string", description: "One-line description of what changed" },
            week: WEEK_SCHEMA,
            day: DAY_SCHEMA,
          },
          required: ["type", "weekNumber", "summary"],
        },
      },
    },
    required: ["reasoning", "changes"],
  },
};

// =============================================================================
// Threshold Pace / Pace Zone Tool Schema
// =============================================================================

const THRESHOLD_PACE_TOOL: Anthropic.Tool = {
  name: "update_threshold_pace",
  description:
    "Propose updating the athlete's threshold pace (pace they could uncomfortably hold for ~1 hour). Use when the athlete mentions their threshold pace is wrong, they ran a recent race that suggests a different threshold, or they want to update their pace zones. Always explain the reasoning in text before calling this tool.",
  input_schema: {
    type: "object" as const,
    properties: {
      reasoning: {
        type: "string",
        description: "1-2 sentence explanation of why this threshold pace is being suggested",
      },
      newThresholdPace: {
        type: "number",
        description: "New threshold pace in min/mi as a decimal (e.g. 7.33 for 7:20/mi)",
      },
    },
    required: ["reasoning", "newThresholdPace"],
  },
};

// =============================================================================
// Build Plan Context for System Prompt
// =============================================================================

function formatDaySummary(day: Day): string {
  if (isRestDay(day)) return "Rest";
  const miles = calculateDayTotalMiles(day);
  const blocks = day.workouts
    .flatMap((w) => w.blocks)
    .filter((b) => b.type !== "rest")
    .map((b) => {
      if (b.repeat) {
        return `${b.repeat.times}x${b.value}${b.unit === "miles" ? "mi" : "min"} ${b.effortLevel}`;
      }
      return `${b.type} ${b.value}${b.unit === "miles" ? "mi" : "min"} ${b.effortLevel}`;
    });
  return `${miles.toFixed(1)}mi [${blocks.join(", ")}]`;
}

export function buildPlanContext(plan: TrainingPlan, currentWeek: number): string {
  const lines: string[] = ["TRAINING PLAN CONTEXT:"];

  // Phase structure
  if (plan.phases?.length) {
    lines.push("\nPhases:");
    for (const phase of plan.phases) {
      const isCurrent = currentWeek >= phase.startWeek && currentWeek <= phase.endWeek;
      lines.push(
        `  ${phase.name}: weeks ${phase.startWeek}-${phase.endWeek}${isCurrent ? " (CURRENT)" : ""}`
      );
    }
  }

  // Weekly volume summary
  lines.push("\nWeekly Summary:");
  for (const week of plan.weeks) {
    const miles = calculateWeekTotalMiles(week);
    const hard = countHardDays(week);
    const rest = countRestDays(week);
    const marker =
      week.weekNumber === currentWeek
        ? " ← CURRENT"
        : week.weekNumber < currentWeek
          ? " (past)"
          : "";
    lines.push(
      `  Wk ${week.weekNumber} (${week.phase}): ${miles.toFixed(1)}mi, ${hard} hard, ${rest} rest${marker}`
    );
  }

  // Detailed day-by-day for modifiable window (current through current+3)
  const modifiableStart = currentWeek;
  const modifiableEnd = Math.min(currentWeek + 3, plan.totalWeeks);

  lines.push(`\nDetailed View (Weeks ${modifiableStart}-${modifiableEnd} — modifiable):`);
  for (const week of plan.weeks) {
    if (week.weekNumber < modifiableStart || week.weekNumber > modifiableEnd) continue;
    lines.push(`\n  Week ${week.weekNumber} — ${week.phase}:`);
    for (const day of week.days) {
      lines.push(`    ${day.dayOfWeek}: ${formatDaySummary(day)}`);
    }
  }

  lines.push(`\nPast weeks (before week ${currentWeek}) are READ-ONLY.`);
  lines.push(
    `Modifiable range: week ${modifiableStart} through week ${modifiableEnd}.`
  );

  return lines.join("\n");
}

// =============================================================================
// Plan Modification Rules (appended to system prompt when tool available)
// =============================================================================

const PLAN_MODIFICATION_RULES = `
PLAN MODIFICATION RULES:
When the athlete asks you to change their training plan, use the propose_plan_changes tool.
- You can only modify weeks in the modifiable range shown above.
- Preserve the phase structure and volume progression safety.
- Maintain 80/20 easy/hard ratio, at least 1 rest day per week, no consecutive hard days.
- Distance-based blocks (easy, longRun) use "miles" as unit; time-based blocks (warmUp, intervals, recovery, rest, coolDown, tempo) use "minutes".
- For interval blocks, use the repeat field (e.g., 6x5min at z4 with 2min rest at z1).
- For small changes (swap a workout, adjust one day) → use replace_day.
- For broader changes (reduce volume for multiple weeks, restructure a week) → use replace_week.
- If the request is just a question about the plan, respond with text only — do not call the tool.
- ALWAYS provide a text explanation before calling the tool.
- Each day must have exactly the structure: { dayOfWeek, workouts: [{ blocks: [...] }] }
- Rest days should have a single rest block: { type: "rest", value: 0, unit: "minutes", effortLevel: "z1" }
`;

const THRESHOLD_PACE_RULES = `
THRESHOLD PACE / PACE ZONE RULES:
When the athlete wants to update their threshold pace or says their pace zones are wrong, use the update_threshold_pace tool.
- Threshold pace is the pace they could uncomfortably hold for ~1 hour (roughly lactate threshold).
- Provide the pace as a decimal in min/mi (e.g., 7:20/mi = 7.333, 7:15/mi = 7.25).
- If they give you a recent race result, you can estimate: 5K pace + ~30-45 sec/mi, 10K pace + ~15-20 sec/mi, half marathon pace + ~10 sec/mi.
- Valid range: 4:00-20:00/mi (4.0-20.0 as decimal).
- IMPORTANT: In our zone model, threshold pace = TOP of Zone 3 (100% threshold speed). The zones are:
  Z1 (Recovery): 65-76% of threshold speed
  Z2 (Aerobic/Easy): 76-90% of threshold speed
  Z3 (Tempo/Threshold): 90-100% — threshold pace is the CEILING of this zone
  Z4 (VO2max): 100-110% — above threshold, intervals
  Z5 (Anaerobic): 110-130% — near max
- Do NOT describe zones differently in your text. The card will show the exact zones calculated from these percentages.
- If the athlete just asks about their current pace zones without wanting to change them, respond with text only.
`;

// =============================================================================
// Streaming Chat Response — Opus 4.6 with tool support
// =============================================================================

export async function streamChatResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userData: UserData,
  context?: ChatContext | null,
  activePlan?: TrainingPlan | null
) {
  const bookContent = await getBookContent();
  let systemPrompt = generateChatPrompt(userData);

  if (context) {
    systemPrompt += buildContextPrompt(context);
  }

  // Add plan context if available
  if (activePlan) {
    const currentWeek = calculateCurrentWeek(activePlan.startDate, activePlan.totalWeeks);
    systemPrompt += "\n\n" + buildPlanContext(activePlan, currentWeek);
    systemPrompt += PLAN_MODIFICATION_RULES;
  }

  // Always include threshold pace rules (tool is always available)
  systemPrompt += THRESHOLD_PACE_RULES;

  systemPrompt += `\n\nBOOK REFERENCE:\n${bookContent}`;

  const tools: Anthropic.Tool[] = [THRESHOLD_PACE_TOOL];
  if (activePlan) {
    tools.push(PLAN_MODIFICATION_TOOL);
  }

  return anthropic.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 1000,
    temperature: 0.6,
    system: systemPrompt,
    tools,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  });
}
