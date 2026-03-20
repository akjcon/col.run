/**
 * Plan Reviewer Agent
 *
 * Reviews a complete training plan holistically using an LLM.
 * Returns structured issues with optional suggested fixes that
 * can be applied programmatically by plan-fixer.ts.
 */

import { BaseAgent, extractJSON } from "./base";
import { REVIEW_CHECKLIST } from "./review-checklist";
import type { ChecklistItem } from "./review-checklist";
import { loadChecklistFromFirestore } from "./checklist-loader";
import { calculateWeekTotalMiles } from "@/lib/blocks/calculations";
import type { Week } from "@/lib/blocks";
import type { ReviewerInput, ReviewerOutput } from "./types";

export class ReviewerAgent extends BaseAgent<ReviewerInput, ReviewerOutput> {
  private checklist: ChecklistItem[] = REVIEW_CHECKLIST;

  constructor() {
    super({
      name: "Reviewer",
      model: "claude-haiku-4-5-20251001",
      maxTokens: 4000,
      temperature: 0.2,
    });
  }

  /**
   * Load checklist from Firestore before execution.
   * Falls back to static checklist if Firestore is unavailable.
   */
  async execute(input: ReviewerInput) {
    try {
      const firestoreChecklist = await loadChecklistFromFirestore();
      if (firestoreChecklist.length > 0) {
        this.checklist = firestoreChecklist;
      }
    } catch {
      console.warn("[Reviewer] Could not load checklist from Firestore, using static fallback");
    }
    return super.execute(input);
  }

  protected validateInput(input: ReviewerInput): { valid: boolean; error?: string } {
    if (!input.weeks || input.weeks.length === 0) {
      return { valid: false, error: "No weeks to review" };
    }
    if (!input.athlete) {
      return { valid: false, error: "Missing athlete profile" };
    }
    if (!input.goal) {
      return { valid: false, error: "Missing race goal" };
    }
    return { valid: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected buildSystemPrompt(_input: ReviewerInput): string {
    const checklistText = this.checklist.map(
      (item, i) =>
        `${i + 1}. [${item.id}] (${item.severity}) ${item.description}\n   Why: ${item.rationale}`
    ).join("\n\n");

    return `You are an expert running coach reviewing a completed training plan for quality.

Your job is to find issues that a rule-based validator cannot catch — holistic problems with the plan's narrative, phase appropriateness, and race preparation.

REVIEW CHECKLIST:
${checklistText}

INSTRUCTIONS:
- Review the entire plan against each checklist item
- Only report issues you are CONFIDENT about — do not flag things that are borderline or debatable
- For each issue, reference the checklist item ID
- If you can suggest a concrete fix, include a suggestedFix object (see fix types below)
- If no fix is possible programmatically, set suggestedFix to null
- Set passesReview to true if there are no critical or major issues

AVAILABLE FIX TYPES:
1. adjust_week_volume: Scale a week's volume to a target
   { "type": "adjust_week_volume", "weekNumber": 8, "targetMiles": 28 }

2. swap_days: Swap two days within a week (e.g., move long run to weekend)
   { "type": "swap_days", "weekNumber": 5, "day1": "Wednesday", "day2": "Saturday" }

3. remove_hard_workout: Replace a hard workout with an easy run of same duration
   { "type": "remove_hard_workout", "weekNumber": 14, "dayOfWeek": "Tuesday" }

4. reduce_block_value: Reduce a specific block's value (e.g., shorten a long run)
   { "type": "reduce_block_value", "weekNumber": 12, "dayOfWeek": "Saturday", "blockIndex": 0, "newValue": 16 }

5. change_effort_level: Change a block's effort zone
   { "type": "change_effort_level", "weekNumber": 3, "dayOfWeek": "Thursday", "blockIndex": 0, "newEffortLevel": "z2" }

OUTPUT FORMAT:
Return ONLY a JSON object:
{
  "issues": [
    {
      "issueId": "issue-1",
      "checklistItemId": "TAPER_NO_HARD_WORKOUTS",
      "severity": "critical",
      "weekNumbers": [14, 15],
      "description": "Taper weeks 14-15 contain tempo workouts that should be removed",
      "suggestedFix": { "type": "remove_hard_workout", "weekNumber": 14, "dayOfWeek": "Tuesday" }
    }
  ],
  "overallAssessment": "Plan is well-structured with good periodization but taper needs adjustment.",
  "confidenceScore": 85,
  "passesReview": false
}

If the plan looks good and has no issues, return:
{
  "issues": [],
  "overallAssessment": "Plan is well-structured and follows training principles correctly.",
  "confidenceScore": 90,
  "passesReview": true
}`;
  }

  protected buildUserMessage(input: ReviewerInput): string {
    const { weeks, phases, athlete, goal, weeklyTargets } = input;

    // Compact plan summary to save tokens
    const planSummary = weeks.map((week) => summarizeWeekCompact(week)).join("\n");

    // Phase summary
    const phaseSummary = phases
      .map((p) => `${p.name}: weeks ${p.startWeek}-${p.endWeek} (${p.focus})`)
      .join(", ");

    // Weekly targets summary
    const targetsSummary = weeklyTargets
      .map((t) => `W${t.weekNumber}:${t.targetVolume}min/${t.phase}`)
      .join(", ");

    return `Review this ${weeks.length}-week training plan:

ATHLETE:
- Experience: ${athlete.experience}
- Current weekly mileage: ${athlete.weeklyMileage} miles
- Longest recent run: ${athlete.longestRun} miles

RACE GOAL:
- Distance: ${goal.raceDistance}
- Target time: ${goal.targetTime || "Not specified"}
- Terrain: ${goal.terrainType || "trail"}

PHASES: ${phaseSummary}

WEEKLY TARGETS: ${targetsSummary}

PLAN:
${planSummary}

Review against the checklist and return ONLY the JSON object.`;
  }

  protected parseResponse(response: string): ReviewerOutput {
    const parsed = extractJSON<ReviewerOutput>(response);

    if (!Array.isArray(parsed.issues)) {
      parsed.issues = [];
    }

    // Validate checklist item IDs — allow any ID since checklist is dynamic
    // Just filter out completely empty IDs
    parsed.issues = parsed.issues.filter((issue) => {
      if (!issue.checklistItemId) {
        console.warn(`[Reviewer] Dropping issue with missing checklist ID`);
        return false;
      }
      return true;
    });

    // Validate suggested fixes
    const validFixTypes = new Set([
      "adjust_week_volume",
      "swap_days",
      "remove_hard_workout",
      "reduce_block_value",
      "change_effort_level",
    ]);
    for (const issue of parsed.issues) {
      if (issue.suggestedFix && !validFixTypes.has(issue.suggestedFix.type)) {
        console.warn(
          `[Reviewer] Dropping invalid fix type: ${issue.suggestedFix.type}`
        );
        issue.suggestedFix = null;
      }
    }

    // Ensure required fields
    parsed.confidenceScore = Math.max(0, Math.min(100, parsed.confidenceScore ?? 50));
    parsed.passesReview = parsed.passesReview ?? parsed.issues.length === 0;
    parsed.overallAssessment = parsed.overallAssessment ?? "Review completed.";

    return parsed;
  }

  protected validateOutput(output: ReviewerOutput): { valid: boolean; error?: string } {
    if (typeof output.confidenceScore !== "number") {
      return { valid: false, error: "Missing confidenceScore" };
    }
    if (typeof output.passesReview !== "boolean") {
      return { valid: false, error: "Missing passesReview" };
    }
    return { valid: true };
  }
}

/**
 * Compact summary of a week for the reviewer prompt.
 * Keeps token count low while giving the LLM enough to evaluate.
 */
function summarizeWeekCompact(week: Week): string {
  const totalMiles = calculateWeekTotalMiles(week);
  const days = week.days
    .map((day) => {
      const blocks = day.workouts.flatMap((w) => w.blocks);
      if (blocks.length === 1 && blocks[0].type === "rest") {
        return `${day.dayOfWeek.slice(0, 3)}=rest`;
      }
      const blockDescs = blocks.map((b) => {
        let desc = `${b.type}/${b.value}${b.unit === "miles" ? "mi" : "min"}/${b.effortLevel}`;
        if (b.repeat) {
          desc += `x${b.repeat.times}`;
        }
        return desc;
      });
      return `${day.dayOfWeek.slice(0, 3)}=[${blockDescs.join(",")}]`;
    })
    .join(" | ");

  return `W${week.weekNumber} (${week.phase}, ${totalMiles.toFixed(0)}mi): ${days}`;
}
