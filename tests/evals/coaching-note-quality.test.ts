/**
 * Coaching Note Quality Eval
 *
 * Calls analyzeMatchedWorkout / analyzeUnplannedWorkout against the real
 * Anthropic API and checks the returned notes for quality signals.
 *
 * Run: npm run test:evals
 *
 * @vitest-environment node
 */

import { describe, it, expect, afterAll } from "vitest";
import { config } from "dotenv";
import type { Activity } from "@/lib/strava/types";
import type { Day, Week } from "@/lib/blocks/types";
import type { AthleteSnapshot } from "@/lib/types";
import {
  analyzeMatchedWorkout,
  type MatchedAnalysis,
} from "@/lib/workout-analysis";
import {
  analyzeUnplannedWorkout,
  type UnplannedAnalysis,
} from "@/lib/workout-analysis";

// Restore real API key (tests/setup.ts sets a fake one)
config({ path: ".env.local", override: true });

const hasRealKey =
  process.env.ANTHROPIC_API_KEY !== undefined &&
  process.env.ANTHROPIC_API_KEY !== "test-api-key";

// ---------------------------------------------------------------------------
// Compact fixture helpers
// ---------------------------------------------------------------------------

function act(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    stravaId: 1,
    userId: "u1",
    name: "Morning Run",
    type: "Run",
    date: Date.now(),
    distance: 5,
    duration: 45,
    elevation: 100,
    avgPace: 9.0,
    ...overrides,
  };
}

function day(blocks: Day["workouts"][0]["blocks"]): Day {
  return { dayOfWeek: "Tuesday", workouts: [{ blocks }] };
}

function week(overrides: Partial<Week> = {}): Week {
  return {
    weekNumber: 4,
    phase: "base",
    days: Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      workouts: [],
    })),
    ...overrides,
  };
}

function snap(overrides: Partial<AthleteSnapshot> = {}): AthleteSnapshot {
  return {
    updatedAt: Date.now(),
    experience: "intermediate",
    weeklyMileage: 35,
    longestRun: 15,
    thresholdPace: 7.5, // 7:30/mi
    ctl: 42,
    currentWeeklyMileage: 32,
    lifetimeMiles: 4200,
    experienceLevel: "intermediate",
    trailExperience: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Quality assertion helpers (deterministic — no LLM judge)
// ---------------------------------------------------------------------------

const HOLLOW_PHRASES = [
  "great job",
  "awesome effort",
  "fantastic",
  "love the consistency",
  "keep it up",
  "well done",
  "nice work",
  "amazing",
  "excellent job",
  "you crushed",
];

function assertNoteQuality(
  note: string,
  label: string,
  activityData?: { distance?: number; avgPace?: number }
) {
  // Not empty
  expect(note.length, `${label}: note should not be empty`).toBeGreaterThan(0);

  // 280 char limit
  expect(
    note.length,
    `${label}: note too long (${note.length} chars)`
  ).toBeLessThanOrEqual(280);

  // No hollow praise
  const lower = note.toLowerCase();
  for (const phrase of HOLLOW_PHRASES) {
    expect(
      lower.includes(phrase),
      `${label}: contains hollow praise "${phrase}": "${note}"`
    ).toBe(false);
  }

  // At most one em dash per note
  const emDashCount = (note.match(/—/g) || []).length;
  expect(
    emDashCount,
    `${label}: too many em dashes (${emDashCount}): "${note}"`
  ).toBeLessThanOrEqual(1);

  // No sentences starting with "But", "However", "That said"
  const badOpeners = /\.\s+(But|However|That said)\b/;
  expect(
    badOpeners.test(note),
    `${label}: starts sentence with filler conjunction: "${note}"`
  ).toBe(false);

  // No stat parroting: shouldn't echo raw numbers from the input
  if (activityData?.distance) {
    const distStr = activityData.distance.toFixed(1);
    // Allow if it's a very round number like "5.0" that could appear naturally
    if (activityData.distance % 1 !== 0) {
      expect(
        note.includes(distStr),
        `${label}: parrots distance "${distStr}": "${note}"`
      ).toBe(false);
    }
  }
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

describe.skipIf(!hasRealKey)("Coaching Note Quality", () => {
  // Generous timeout — real API calls
  const TIMEOUT = 60_000;

  // Collect results for the summary table
  const results: {
    scenario: string;
    adherence?: string;
    affectsPlan?: boolean;
    note: string;
    pass: boolean;
  }[] = [];

  afterAll(() => {
    // Print results table for human eyeballing
    console.log("\n┌─────────────────────────────────────────────────────────────┐");
    console.log("│                  Coaching Note Results                      │");
    console.log("├──────────────────────┬───────────┬─────────────────────────┤");
    for (const r of results) {
      const status = r.pass ? "PASS" : "FAIL";
      const classification =
        r.adherence ?? (r.affectsPlan ? "affects" : "no-impact");
      const truncNote =
        r.note.length > 60 ? r.note.slice(0, 57) + "..." : r.note;
      console.log(
        `│ ${r.scenario.padEnd(20)} │ ${classification.padEnd(9)} │ ${truncNote.padEnd(23)} │ ${status}`
      );
    }
    console.log("└──────────────────────┴───────────┴─────────────────────────┘");
    console.log("\n--- Full Notes ---");
    for (const r of results) {
      console.log(`[${r.scenario}] ${r.note}`);
    }
  });

  // ------ Matched workout scenarios ------

  it(
    "on-target easy run",
    async () => {
      const planned = day([
        { type: "easy", value: 5, unit: "miles", effortLevel: "z2" },
      ]);
      const activity = act({
        distance: 5.1,
        duration: 46,
        avgPace: 9.0,
        avgHeartRate: 138,
      });
      const result = await analyzeMatchedWorkout(
        activity,
        planned,
        week(),
        snap()
      );
      expect(result.adherence).toBe("on_target");
      assertNoteQuality(result.coachingNote, "on-target", activity);
      results.push({
        scenario: "on-target easy",
        adherence: result.adherence,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );

  it(
    "over-effort Z2 run done at Z4 pace",
    async () => {
      const planned = day([
        { type: "easy", value: 6, unit: "miles", effortLevel: "z2" },
      ]);
      // Threshold is 7:30, Z2 should be ~8:20-9:52. Running at 7:00 = well above Z3.
      const activity = act({
        distance: 6.2,
        duration: 43,
        avgPace: 7.0,
        avgHeartRate: 172,
        maxHeartRate: 185,
      });
      const result = await analyzeMatchedWorkout(
        activity,
        planned,
        week(),
        snap()
      );
      expect(result.adherence).toBe("over");
      assertNoteQuality(result.coachingNote, "over-effort", activity);
      results.push({
        scenario: "over-effort",
        adherence: result.adherence,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );

  it(
    "under-distance (cut short)",
    async () => {
      const planned = day([
        { type: "easy", value: 8, unit: "miles", effortLevel: "z2" },
      ]);
      const activity = act({
        distance: 4.5,
        duration: 41,
        avgPace: 9.1,
        avgHeartRate: 135,
      });
      const result = await analyzeMatchedWorkout(
        activity,
        planned,
        week(),
        snap()
      );
      expect(result.adherence).toBe("under");
      assertNoteQuality(result.coachingNote, "under-distance", activity);
      results.push({
        scenario: "under-distance",
        adherence: result.adherence,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );

  it(
    "hilly long run with elevation",
    async () => {
      const planned = day([
        { type: "longRun", value: 14, unit: "miles", effortLevel: "z2" },
      ]);
      const activity = act({
        name: "Mountain Long Run",
        distance: 13.2,
        duration: 150,
        avgPace: 11.4,
        avgHeartRate: 148,
        elevation: 3200,
      });
      const result = await analyzeMatchedWorkout(
        activity,
        planned,
        week({ phase: "build" }),
        snap({ trailExperience: true })
      );
      // Slightly under distance but massive elevation — should be on_target or over
      expect(["on_target", "over"]).toContain(result.adherence);
      assertNoteQuality(result.coachingNote, "hilly-long-run", activity);
      results.push({
        scenario: "hilly long run",
        adherence: result.adherence,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );

  it(
    "perfect tempo run",
    async () => {
      const planned = day([
        { type: "warmUp", value: 10, unit: "minutes", effortLevel: "z1" },
        { type: "tempo", value: 20, unit: "minutes", effortLevel: "z3" },
        { type: "coolDown", value: 10, unit: "minutes", effortLevel: "z1" },
      ]);
      // 40 min total, ~4.5 mi at blended pace. Threshold 7:30, Z3 = 7:30–8:20.
      // Avg pace 8:50 reflects the easy warmup/cooldown pulling avg up.
      const activity = act({
        name: "Tempo Tuesday",
        distance: 4.5,
        duration: 40,
        avgPace: 8.9,
        avgHeartRate: 152,
        maxHeartRate: 168,
      });
      const result = await analyzeMatchedWorkout(
        activity,
        planned,
        week(),
        snap()
      );
      // Multi-block workouts have blended avg pace; on_target or over are both reasonable
      // since planned miles use a conservative 10 min/mi default conversion for time-based blocks
      expect(["on_target", "over"]).toContain(result.adherence);
      assertNoteQuality(result.coachingNote, "perfect-tempo", activity);
      results.push({
        scenario: "perfect tempo",
        adherence: result.adherence,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );

  it(
    "over-distance long run",
    async () => {
      const planned = day([
        { type: "longRun", value: 12, unit: "miles", effortLevel: "z2" },
      ]);
      const activity = act({
        name: "Sunday Long Run",
        distance: 16.3,
        duration: 155,
        avgPace: 9.5,
        avgHeartRate: 142,
      });
      const result = await analyzeMatchedWorkout(
        activity,
        planned,
        week(),
        snap()
      );
      expect(result.adherence).toBe("over");
      assertNoteQuality(result.coachingNote, "over-distance", activity);
      results.push({
        scenario: "over-distance",
        adherence: result.adherence,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );

  // ------ Unplanned workout scenarios ------

  it(
    "unplanned rest-day jog",
    async () => {
      const activity = act({
        name: "Easy Shakeout",
        distance: 2.1,
        duration: 22,
        avgPace: 10.5,
        avgHeartRate: 120,
        elevation: 40,
      });
      const result = await analyzeUnplannedWorkout(
        activity,
        null, // rest day planned
        week(),
        snap()
      );
      expect(result.affectsPlan).toBe(false);
      assertNoteQuality(result.coachingNote, "rest-day-jog", activity);
      results.push({
        scenario: "rest-day jog",
        affectsPlan: result.affectsPlan,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );

  it(
    "unplanned hard effort on rest day",
    async () => {
      const activity = act({
        name: "Group Track Workout",
        distance: 7.2,
        duration: 48,
        avgPace: 6.7,
        avgHeartRate: 175,
        maxHeartRate: 192,
        elevation: 20,
      });
      const result = await analyzeUnplannedWorkout(
        activity,
        null, // rest day planned
        week(),
        snap()
      );
      expect(result.affectsPlan).toBe(true);
      assertNoteQuality(result.coachingNote, "hard-on-rest", activity);
      results.push({
        scenario: "hard on rest day",
        affectsPlan: result.affectsPlan,
        note: result.coachingNote,
        pass: true,
      });
    },
    TIMEOUT
  );
});
