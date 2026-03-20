/**
 * Checklist Updater
 *
 * Takes human review feedback + the current checklist and asks Sonnet
 * to return the complete updated checklist. Simple replace-the-whole-doc approach.
 */

import Anthropic from "@anthropic-ai/sdk";
import { extractJSON } from "./base";
import type { ChecklistItem } from "./review-checklist";

interface ReviewFeedback {
  overallRating: number;
  volumeAssessment: string;
  longRunAssessment: string;
  recoveryAssessment: string;
  notes: string;
  athleteExperience: string;
  raceType: string;
}

interface UpdateResult {
  items: ChecklistItem[];
  reasoning: string;
  changed: boolean;
}

/**
 * Process feedback and return the full updated checklist.
 * Sonnet reads the feedback + current checklist and returns the new version.
 */
export async function processReviewFeedback(
  feedback: ReviewFeedback,
  currentChecklist: ChecklistItem[]
): Promise<UpdateResult> {
  // Skip if feedback has no actionable content
  if (feedback.overallRating >= 4 && !feedback.notes?.trim()) {
    return {
      items: currentChecklist,
      reasoning: "Plan rated highly with no specific notes — no checklist changes needed.",
      changed: false,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const currentChecklistJSON = JSON.stringify(currentChecklist, null, 2);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    temperature: 0.2,
    system: `You maintain a reviewer checklist for an AI that evaluates training plans for runners.

A human coach has reviewed a generated plan and provided feedback. Your job is to decide whether the checklist needs updating based on this feedback, and return the complete updated checklist.

RULES:
- Default to NO changes. Most feedback does not warrant a checklist update. Only act on feedback that reveals a repeatable, systematic issue.
- BEFORE adding a new item, carefully check every existing item. If the feedback is even partially covered by an existing item, MODIFY that item to broaden its scope rather than adding a new one. A checklist with 30 overlapping items is worse than 10 precise ones.
- Ask yourself: "Would this new check ever fire on a plan where an existing check wouldn't?" If not, it's a duplicate — edit the existing one instead.
- Don't remove items unless the feedback explicitly says a check is wrong or counterproductive
- Keep the checklist lean. If two items could be merged into one clearer item, merge them.
- Use SCREAMING_SNAKE_CASE for new item IDs
- Valid categories: narrative_coherence, phase_appropriateness, taper_quality, workout_variety, race_specificity, effort_distribution
- Valid severities: critical, major, minor
- Each item needs: id, category, severity, description, rationale
- If no changes are needed (the most common outcome), return the checklist unchanged with changed: false

Return ONLY a JSON object:
{
  "items": [ ...the complete checklist array... ],
  "reasoning": "What you changed and why (or why no changes were needed)",
  "changed": true
}`,
    messages: [
      {
        role: "user",
        content: `CURRENT CHECKLIST:
${currentChecklistJSON}

FEEDBACK ON A ${feedback.raceType.toUpperCase()} PLAN FOR ${feedback.athleteExperience.toUpperCase()} ATHLETE:
- Rating: ${feedback.overallRating}/5
- Volume: ${feedback.volumeAssessment}
- Long Runs: ${feedback.longRunAssessment}
- Recovery: ${feedback.recoveryAssessment}
- Notes: ${feedback.notes || "(none)"}

Return the full updated checklist as JSON.`,
      },
    ],
  });

  const responseText =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const parsed = extractJSON<UpdateResult>(responseText);

  // Validate all items have required fields
  const validCategories = new Set([
    "narrative_coherence",
    "phase_appropriateness",
    "taper_quality",
    "workout_variety",
    "race_specificity",
    "effort_distribution",
  ]);
  const validSeverities = new Set(["critical", "major", "minor"]);

  parsed.items = (parsed.items || []).filter(
    (item) =>
      item.id &&
      item.description &&
      item.rationale &&
      validCategories.has(item.category) &&
      validSeverities.has(item.severity)
  );

  // Safety: if LLM returned empty or very small list, keep the original
  if (parsed.items.length < currentChecklist.length * 0.5) {
    console.warn(
      `[ChecklistUpdater] LLM returned ${parsed.items.length} items (original: ${currentChecklist.length}), keeping original`
    );
    return {
      items: currentChecklist,
      reasoning: "LLM response too small — keeping original checklist as safety measure.",
      changed: false,
    };
  }

  return parsed;
}
