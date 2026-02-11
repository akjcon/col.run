/**
 * Feedback Aggregator
 *
 * Fetches recent plan feedback from Firestore and aggregates it into
 * actionable lessons learned for prompt context injection.
 */

import { getAdminDb } from "@/lib/firebase-admin";

interface PlanFeedback {
  id: string;
  planId: string;
  createdAt: number;
  overallRating: number;
  volumeAssessment: "too_high" | "too_low" | "appropriate";
  longRunAssessment: "too_aggressive" | "too_conservative" | "appropriate";
  recoveryAssessment: "not_enough" | "too_much" | "appropriate";
  notes: string;
  athleteExperience: string;
  raceType: string;
}

interface FeedbackSummary {
  totalFeedback: number;
  averageRating: number;
  volumePatterns: {
    tooHigh: number;
    tooLow: number;
    appropriate: number;
  };
  longRunPatterns: {
    tooAggressive: number;
    tooConservative: number;
    appropriate: number;
  };
  recoveryPatterns: {
    notEnough: number;
    tooMuch: number;
    appropriate: number;
  };
  noteThemes: string[];
  byExperience: Record<string, { count: number; avgRating: number }>;
  byRaceType: Record<string, { count: number; avgRating: number }>;
}

/**
 * Fetch recent feedback from Firestore
 */
export async function getRecentFeedback(limit = 50): Promise<PlanFeedback[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection("planFeedback")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PlanFeedback[];
  } catch (error) {
    console.warn("[FeedbackAggregator] Failed to fetch feedback:", error);
    return [];
  }
}

/**
 * Aggregate feedback into summary statistics
 */
export function aggregateFeedback(feedback: PlanFeedback[]): FeedbackSummary {
  if (feedback.length === 0) {
    return {
      totalFeedback: 0,
      averageRating: 0,
      volumePatterns: { tooHigh: 0, tooLow: 0, appropriate: 0 },
      longRunPatterns: { tooAggressive: 0, tooConservative: 0, appropriate: 0 },
      recoveryPatterns: { notEnough: 0, tooMuch: 0, appropriate: 0 },
      noteThemes: [],
      byExperience: {},
      byRaceType: {},
    };
  }

  const volumePatterns = { tooHigh: 0, tooLow: 0, appropriate: 0 };
  const longRunPatterns = { tooAggressive: 0, tooConservative: 0, appropriate: 0 };
  const recoveryPatterns = { notEnough: 0, tooMuch: 0, appropriate: 0 };
  const byExperience: Record<string, { count: number; totalRating: number }> = {};
  const byRaceType: Record<string, { count: number; totalRating: number }> = {};
  const allNotes: string[] = [];

  let totalRating = 0;

  for (const fb of feedback) {
    totalRating += fb.overallRating;

    // Volume patterns
    if (fb.volumeAssessment === "too_high") volumePatterns.tooHigh++;
    else if (fb.volumeAssessment === "too_low") volumePatterns.tooLow++;
    else volumePatterns.appropriate++;

    // Long run patterns
    if (fb.longRunAssessment === "too_aggressive") longRunPatterns.tooAggressive++;
    else if (fb.longRunAssessment === "too_conservative") longRunPatterns.tooConservative++;
    else longRunPatterns.appropriate++;

    // Recovery patterns
    if (fb.recoveryAssessment === "not_enough") recoveryPatterns.notEnough++;
    else if (fb.recoveryAssessment === "too_much") recoveryPatterns.tooMuch++;
    else recoveryPatterns.appropriate++;

    // By experience level
    const exp = fb.athleteExperience || "unknown";
    if (!byExperience[exp]) byExperience[exp] = { count: 0, totalRating: 0 };
    byExperience[exp].count++;
    byExperience[exp].totalRating += fb.overallRating;

    // By race type
    const race = fb.raceType || "unknown";
    if (!byRaceType[race]) byRaceType[race] = { count: 0, totalRating: 0 };
    byRaceType[race].count++;
    byRaceType[race].totalRating += fb.overallRating;

    // Collect notes
    if (fb.notes && fb.notes.trim()) {
      allNotes.push(fb.notes.trim());
    }
  }

  // Calculate averages
  const byExpResult: Record<string, { count: number; avgRating: number }> = {};
  for (const [key, val] of Object.entries(byExperience)) {
    byExpResult[key] = { count: val.count, avgRating: val.totalRating / val.count };
  }

  const byRaceResult: Record<string, { count: number; avgRating: number }> = {};
  for (const [key, val] of Object.entries(byRaceType)) {
    byRaceResult[key] = { count: val.count, avgRating: val.totalRating / val.count };
  }

  return {
    totalFeedback: feedback.length,
    averageRating: totalRating / feedback.length,
    volumePatterns,
    longRunPatterns,
    recoveryPatterns,
    noteThemes: allNotes.slice(0, 10), // Keep last 10 notes
    byExperience: byExpResult,
    byRaceType: byRaceResult,
  };
}

/**
 * Generate prompt context from feedback summary
 */
export function generateFeedbackContext(summary: FeedbackSummary): string {
  if (summary.totalFeedback === 0) {
    return "";
  }

  const lines: string[] = [
    "LESSONS FROM PREVIOUS PLAN REVIEWS:",
    `(Based on ${summary.totalFeedback} reviewed plans, avg rating: ${summary.averageRating.toFixed(1)}/5)`,
    "",
  ];

  // Volume feedback
  const { tooHigh, tooLow, appropriate: volOk } = summary.volumePatterns;
  if (tooHigh > tooLow && tooHigh > volOk * 0.3) {
    lines.push(`- VOLUME: Plans have been rated as having TOO HIGH volume (${tooHigh}/${summary.totalFeedback}). Consider being more conservative with weekly mileage.`);
  } else if (tooLow > tooHigh && tooLow > volOk * 0.3) {
    lines.push(`- VOLUME: Plans have been rated as having TOO LOW volume (${tooLow}/${summary.totalFeedback}). Consider being more aggressive with weekly mileage for capable athletes.`);
  }

  // Long run feedback
  const { tooAggressive, tooConservative, appropriate: lrOk } = summary.longRunPatterns;
  if (tooAggressive > tooConservative && tooAggressive > lrOk * 0.3) {
    lines.push(`- LONG RUNS: Long runs have been rated as TOO AGGRESSIVE (${tooAggressive}/${summary.totalFeedback}). Consider shorter peak long runs relative to weekly volume.`);
  } else if (tooConservative > tooAggressive && tooConservative > lrOk * 0.3) {
    lines.push(`- LONG RUNS: Long runs have been rated as TOO CONSERVATIVE (${tooConservative}/${summary.totalFeedback}). Consider longer peak long runs for race preparation.`);
  }

  // Recovery feedback
  const { notEnough, tooMuch, appropriate: recOk } = summary.recoveryPatterns;
  if (notEnough > tooMuch && notEnough > recOk * 0.3) {
    lines.push(`- RECOVERY: Plans have NOT ENOUGH recovery (${notEnough}/${summary.totalFeedback}). Add more recovery weeks or reduce intensity.`);
  } else if (tooMuch > notEnough && tooMuch > recOk * 0.3) {
    lines.push(`- RECOVERY: Plans have TOO MUCH recovery (${tooMuch}/${summary.totalFeedback}). Consider fewer recovery weeks for experienced athletes.`);
  }

  // Experience-specific feedback
  for (const [exp, data] of Object.entries(summary.byExperience)) {
    if (data.count >= 3 && data.avgRating < 3.0) {
      lines.push(`- WARNING: Plans for ${exp} athletes averaging ${data.avgRating.toFixed(1)}/5 - review approach for this level.`);
    }
  }

  // Race-specific feedback
  for (const [race, data] of Object.entries(summary.byRaceType)) {
    if (data.count >= 3 && data.avgRating < 3.0) {
      lines.push(`- WARNING: Plans for ${race} averaging ${data.avgRating.toFixed(1)}/5 - review approach for this race type.`);
    }
  }

  // Include recent notes (specific feedback)
  if (summary.noteThemes.length > 0) {
    lines.push("");
    lines.push("SPECIFIC FEEDBACK FROM REVIEWERS:");
    for (const note of summary.noteThemes.slice(0, 5)) {
      lines.push(`  - "${note}"`);
    }
  }

  // Only return if we have actionable feedback
  if (lines.length <= 3) {
    return "";
  }

  return lines.join("\n");
}

/**
 * Main function: Get aggregated feedback context for prompt injection
 */
export async function getFeedbackContextForPrompt(): Promise<string> {
  const feedback = await getRecentFeedback(50);
  const summary = aggregateFeedback(feedback);
  return generateFeedbackContext(summary);
}
