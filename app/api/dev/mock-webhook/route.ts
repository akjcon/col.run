/**
 * Mock Webhook — Dev-only endpoint for testing the activity pipeline
 *
 * Generates a fake Strava activity and runs it through the full pipeline
 * (store → match → log → analyze → snapshot) without needing a real Strava event.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/mock-webhook \
 *     -H "Content-Type: application/json" \
 *     -d '{"userId": "user_xxx", "preset": "perfect"}'
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { processActivityWebhook } from "@/lib/strava/webhook-pipeline";
import { getWeeksWithDates, getTodaysDay } from "@/lib/workout-utils";
import {
  calculateDayTotalMiles,
  calculateDayTotal,
} from "@/lib/blocks/calculations";
import { isRestDay } from "@/lib/workout-display";
import type { Activity } from "@/lib/strava/types";
import type { TrainingPlan } from "@/lib/types";

// =============================================================================
// Types
// =============================================================================

type Preset = "perfect" | "high-hr" | "short" | "long" | "rest-day-run";

interface MockWebhookBody {
  userId: string;
  distance?: number;
  pace?: number;
  avgHeartRate?: number;
  elevation?: number;
  type?: string;
  name?: string;
  date?: string; // ISO date string
  preset?: Preset;
}

// =============================================================================
// Route
// =============================================================================

export async function POST(req: NextRequest) {
  // Dev-only guard
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body: MockWebhookBody = await req.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Look up user's active training plan to find today's workout
    const planSnap = await db
      .collection("users")
      .doc(body.userId)
      .collection("trainingPlans")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    let plan: TrainingPlan | null = null;
    let plannedMiles = 5;
    let plannedMinutes = 50;
    let todayIsRest = false;

    if (!planSnap.empty) {
      const planDoc = planSnap.docs[0];
      plan = { id: planDoc.id, ...planDoc.data() } as TrainingPlan;

      const weeksWithDates = getWeeksWithDates(
        plan.startDate,
        plan.generatedAt,
        plan.weeks
      );
      const todaysDay = getTodaysDay(weeksWithDates);

      if (todaysDay) {
        todayIsRest = isRestDay(todaysDay);
        if (!todayIsRest) {
          plannedMiles = calculateDayTotalMiles(todaysDay);
          plannedMinutes = calculateDayTotal(todaysDay);
        }
      }
    }

    // Generate mock activity based on preset or manual params
    const activity = buildMockActivity(body, {
      plannedMiles,
      plannedMinutes,
      todayIsRest,
    });

    // Run through the full pipeline
    const result = await processActivityWebhook(activity, body.userId);

    return NextResponse.json({
      ok: true,
      activity: result.activity,
      matched: result.matched,
      workoutLog: result.workoutLog,
      analysis: result.analysis,
    });
  } catch (error) {
    console.error("Mock webhook error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

// =============================================================================
// Mock Activity Builder
// =============================================================================

function buildMockActivity(
  body: MockWebhookBody,
  context: {
    plannedMiles: number;
    plannedMinutes: number;
    todayIsRest: boolean;
  }
): Activity {
  const now = body.date ? new Date(body.date).getTime() : Date.now();
  const fakeStravaId = Math.floor(Math.random() * 1_000_000_000);

  // Apply preset defaults
  const preset = body.preset;
  let distance = body.distance ?? context.plannedMiles;
  let avgHeartRate = body.avgHeartRate ?? 140;
  const elevation = body.elevation ?? 200;
  let name = body.name ?? "Mock Run";

  if (preset === "perfect") {
    // Match plan exactly
    distance = context.plannedMiles;
    avgHeartRate = 138;
    name = "Easy Morning Run";
  } else if (preset === "high-hr") {
    // Right distance but dangerously high HR
    distance = context.plannedMiles;
    avgHeartRate = 165;
    name = "Pushed Too Hard";
  } else if (preset === "short") {
    // 60% of planned
    distance = Math.round(context.plannedMiles * 0.6 * 10) / 10;
    avgHeartRate = 135;
    name = "Cut Short";
  } else if (preset === "long") {
    // 140% of planned
    distance = Math.round(context.plannedMiles * 1.4 * 10) / 10;
    avgHeartRate = 148;
    name = "Went Long";
  } else if (preset === "rest-day-run") {
    // 3mi easy on rest day
    distance = 3;
    avgHeartRate = 130;
    name = "Rest Day Shakeout";
  }

  // Calculate pace and duration from distance
  const pace = body.pace ?? (distance > 0 ? (avgHeartRate > 155 ? 7.5 : 9.0) : 10);
  const duration = distance * pace;

  return {
    id: `strava-${fakeStravaId}`,
    stravaId: fakeStravaId,
    userId: body.userId,
    name,
    type: body.type ?? "Run",
    date: now,
    distance: Math.round(distance * 100) / 100,
    duration: Math.round(duration * 10) / 10,
    elevation,
    avgPace: Math.round(pace * 100) / 100,
    avgHeartRate,
    maxHeartRate: avgHeartRate ? avgHeartRate + 15 : undefined,
  };
}
