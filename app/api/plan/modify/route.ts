import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateWeek, validateDay } from "@/lib/blocks/validation";
import { evaluatePlan } from "@/lib/plan-evaluation";
import { sanitizeForFirestore } from "@/lib/store/api/baseApi";
import type { Week, Day } from "@/lib/blocks/types";

export const maxDuration = 60;

interface ModifyChange {
  type: "replace_week" | "replace_day";
  weekNumber: number;
  dayOfWeek?: string;
  week?: Week;
  day?: Day;
  summary: string;
}

interface ModifyRequest {
  userId: string;
  planId: string;
  changes: ModifyChange[];
}

export async function POST(req: NextRequest) {
  try {
    const { userId, planId, changes }: ModifyRequest = await req.json();

    // Validate input
    if (!userId || !planId || !changes?.length) {
      return NextResponse.json(
        { error: "Missing userId, planId, or changes" },
        { status: 400 }
      );
    }

    // Limit change count
    const weekChanges = changes.filter((c) => c.type === "replace_week");
    const dayChanges = changes.filter((c) => c.type === "replace_day");
    if (weekChanges.length > 4 || dayChanges.length > 7) {
      return NextResponse.json(
        { error: "Too many changes: max 4 week replacements or 7 day replacements" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Read plan from Firestore
    const planRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("trainingPlans")
      .doc(planId);

    const planDoc = await planRef.get();
    if (!planDoc.exists) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const planData = planDoc.data()!;
    if (!planData.isActive) {
      return NextResponse.json(
        { error: "Plan is not active" },
        { status: 400 }
      );
    }

    // Deep clone weeks for modification
    const modifiedWeeks: Week[] = JSON.parse(JSON.stringify(planData.weeks));
    const previousState: Record<string, unknown> = {};

    // Apply changes in-memory
    for (const change of changes) {
      const weekIndex = change.weekNumber - 1;

      if (weekIndex < 0 || weekIndex >= modifiedWeeks.length) {
        return NextResponse.json(
          { error: `Week ${change.weekNumber} out of bounds` },
          { status: 400 }
        );
      }

      if (change.type === "replace_week" && change.week) {
        const validation = validateWeek(change.week);
        if (!validation.valid) {
          return NextResponse.json(
            {
              error: `Invalid week ${change.weekNumber}`,
              details: validation.errors,
            },
            { status: 400 }
          );
        }

        // Store previous state for undo
        previousState[`week_${change.weekNumber}`] = modifiedWeeks[weekIndex];
        modifiedWeeks[weekIndex] = change.week;
      } else if (change.type === "replace_day" && change.day) {
        const validation = validateDay(change.day);
        if (!validation.valid) {
          return NextResponse.json(
            {
              error: `Invalid day ${change.dayOfWeek} in week ${change.weekNumber}`,
              details: validation.errors,
            },
            { status: 400 }
          );
        }

        const week = modifiedWeeks[weekIndex];
        const dayIndex = week.days.findIndex(
          (d) => d.dayOfWeek === change.dayOfWeek
        );

        if (dayIndex === -1) {
          return NextResponse.json(
            {
              error: `Day ${change.dayOfWeek} not found in week ${change.weekNumber}`,
            },
            { status: 400 }
          );
        }

        // Store previous state for undo
        previousState[`week_${change.weekNumber}_${change.dayOfWeek}`] =
          week.days[dayIndex];
        week.days[dayIndex] = change.day;
      }
    }

    // Build a plan object for evaluation
    const evalPlan = {
      id: planId,
      userId,
      totalWeeks: modifiedWeeks.length,
      weeks: modifiedWeeks,
    };

    // Run evaluation BEFORE writing
    const evaluation = evaluatePlan(evalPlan);

    // Log safety violations for debugging
    if (evaluation.safety.violations.length > 0) {
      console.log(
        `Plan evaluation - Safety score: ${evaluation.safety.score}, Violations:`,
        evaluation.safety.violations.map((v) => `[${v.severity}] ${v.rule}: ${v.message}`)
      );
    }

    if (evaluation.overall < 40) {
      return NextResponse.json(
        {
          success: false,
          error: "Changes would create an unsafe plan",
          evaluation: {
            structural: evaluation.structural.score,
            safety: evaluation.safety.score,
            methodology: evaluation.methodology.score,
            overall: evaluation.overall,
          },
        },
        { status: 422 }
      );
    }

    // Write updated plan to Firestore
    const sanitizedWeeks = sanitizeForFirestore(modifiedWeeks);
    await planRef.update({ weeks: sanitizedWeeks });

    // Write audit log
    const auditRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("planModifications");

    await auditRef.add(
      sanitizeForFirestore({
        timestamp: Date.now(),
        planId,
        changes: changes.map((c) => ({
          type: c.type,
          weekNumber: c.weekNumber,
          dayOfWeek: c.dayOfWeek,
          summary: c.summary,
        })),
        previousState,
        evaluation: {
          structural: evaluation.structural.score,
          safety: evaluation.safety.score,
          methodology: evaluation.methodology.score,
          overall: evaluation.overall,
        },
      })
    );

    return NextResponse.json({
      success: true,
      evaluation: {
        structural: evaluation.structural.score,
        safety: evaluation.safety.score,
        methodology: evaluation.methodology.score,
        overall: evaluation.overall,
      },
    });
  } catch (error) {
    console.error("Plan modify error:", error);
    return NextResponse.json(
      {
        error: "Failed to modify plan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
