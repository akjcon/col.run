import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateWeek, validateDay } from "@/lib/blocks/validation";
import { evaluatePlan } from "@/lib/plan-evaluation";
import { sanitizeForFirestore } from "@/lib/store/api/baseApi";
import { calculateCurrentWeek } from "@/lib/plan-utils";
import { isAdminClerkUserId } from "@/lib/admin-auth";
import type { Week } from "@/lib/blocks/types";
import type { ProposedPlanChange } from "@/lib/types";

export const maxDuration = 60;

interface ModifyRequest {
  userId: string;
  planId: string;
  changes: ProposedPlanChange[];
}

export async function POST(req: NextRequest) {
  try {
    // Require a Clerk session and verify it owns the target user (or is
    // an admin doing impersonated edits). Without this gate, any signed-in
    // user could mutate any other user's plan by passing their userId.
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, planId, changes }: ModifyRequest = await req.json();

    // Validate input
    if (!userId || !planId || !changes?.length) {
      return NextResponse.json(
        { error: "Missing userId, planId, or changes" },
        { status: 400 }
      );
    }

    if (clerkUserId !== userId && !isAdminClerkUserId(clerkUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cap payload size to prevent abuse (plans are typically ≤30 weeks)
    if (changes.length > 30) {
      return NextResponse.json(
        { error: "Too many changes in a single request" },
        { status: 400 }
      );
    }

    // For non-append changes, weekNumber is required. Reject up front so
    // downstream errors are categorized clearly ("missing weekNumber" vs
    // the generic "Week 0 out of bounds").
    const missingWeekNumber = changes.filter(
      (c) =>
        c.type !== "append_weeks" &&
        (typeof (c as { weekNumber?: number }).weekNumber !== "number")
    );
    if (missingWeekNumber.length > 0) {
      return NextResponse.json(
        {
          error: `Missing weekNumber on ${missingWeekNumber.length} change(s) of type ${missingWeekNumber
            .map((c) => c.type)
            .join(", ")}`,
        },
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

    // Enforce: no changes to past weeks. Only applies to replace_*
    // (append_weeks always targets the end, never a past week).
    const currentWeek = calculateCurrentWeek(planData.startDate, planData.totalWeeks);
    const pastChanges = changes.filter(
      (c) =>
        c.type !== "append_weeks" &&
        typeof c.weekNumber === "number" &&
        c.weekNumber < currentWeek
    );
    if (pastChanges.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot modify past weeks. Current week is ${currentWeek}. Rejected: ${pastChanges.map((c) => `week ${c.weekNumber}`).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Deep clone weeks for modification
    const modifiedWeeks: Week[] = JSON.parse(JSON.stringify(planData.weeks));
    const previousState: Record<string, unknown> = {};

    // Apply changes in-memory. Appends are applied in declaration order;
    // weekNumber is re-derived from running length each iteration, so
    // interleaving with replace_* in the same batch works correctly.
    // appendedRanges tracks what was added so the audit log can record it.
    const appendedRanges: Array<{ startWeek: number; endWeek: number; weeks: Week[] }> = [];
    for (const change of changes) {
      if (change.type === "append_weeks") {
        if (!Array.isArray(change.weeks) || change.weeks.length === 0) {
          return NextResponse.json(
            { error: "append_weeks requires a non-empty 'weeks' array" },
            { status: 400 }
          );
        }
        // Each new week gets weekNumber = current length + 1, in order.
        // We ignore whatever weekNumber the LLM put inside the Week
        // objects (it's often correct but easy to get wrong on multi-week
        // appends; let the server be authoritative).
        const startWeek = modifiedWeeks.length + 1;
        const appendedForThisChange: Week[] = [];
        for (const week of change.weeks) {
          const newWeekNum = modifiedWeeks.length + 1;
          const validation = validateWeek({ ...week, weekNumber: newWeekNum });
          if (!validation.valid) {
            return NextResponse.json(
              {
                error: `Invalid appended week ${newWeekNum}`,
                details: validation.errors,
              },
              { status: 400 }
            );
          }
          const stamped = { ...week, weekNumber: newWeekNum };
          modifiedWeeks.push(stamped);
          appendedForThisChange.push(stamped);
        }
        const endWeek = modifiedWeeks.length;
        appendedRanges.push({ startWeek, endWeek, weeks: appendedForThisChange });
        // Record an undo hint: future undo can truncate weeks [startWeek..endWeek].
        previousState[`append_${startWeek}_${endWeek}`] = { startWeek, endWeek };
        continue;
      }

      // Past `append_weeks` handled above; for the rest weekNumber is
      // required (validated up front in missingWeekNumber check).
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

    // Rebuild phases array from modified weeks. Phase boundary detection
    // compares normalized phase names (lowercase + trimmed) so an appended
    // "Peak" week doesn't get treated as a new phase when the previous
    // weeks were "peak"/"Peaking". We preserve the FIRST display form seen
    // in each run.
    const rebuildPhases = () => {
      const phases: { name: string; startWeek: number; endWeek: number }[] = [];
      let currentNormalized: string | null = null;
      let currentDisplay: string | null = null;
      let phaseStart = 0;
      const normalize = (p: string) => p.trim().toLowerCase();

      for (const week of modifiedWeeks) {
        const norm = normalize(week.phase);
        if (norm !== currentNormalized) {
          if (currentNormalized !== null && currentDisplay !== null) {
            phases.push({ name: currentDisplay, startWeek: phaseStart, endWeek: week.weekNumber - 1 });
          }
          currentNormalized = norm;
          currentDisplay = week.phase;
          phaseStart = week.weekNumber;
        }
      }
      // Close final phase
      if (currentDisplay !== null) {
        phases.push({ name: currentDisplay, startWeek: phaseStart, endWeek: modifiedWeeks[modifiedWeeks.length - 1].weekNumber });
      }
      return phases;
    };

    const updatedPhases = rebuildPhases();

    // Write updated plan to Firestore (weeks + phases + totalWeeks).
    // totalWeeks must move when append_weeks added rows; we always write it
    // from the current length to keep it consistent with weeks.
    const sanitizedWeeks = sanitizeForFirestore(modifiedWeeks);
    const sanitizedPhases = sanitizeForFirestore(updatedPhases);
    await planRef.update({
      weeks: sanitizedWeeks,
      phases: sanitizedPhases,
      totalWeeks: modifiedWeeks.length,
    });

    // Write audit log
    const auditRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("planModifications");

    await auditRef.add(
      sanitizeForFirestore({
        timestamp: Date.now(),
        planId,
        clerkUserId,
        impersonated: clerkUserId !== userId,
        changes: changes.map((c) => {
          if (c.type === "append_weeks") {
            return {
              type: c.type,
              weeksAdded: c.weeks?.length ?? 0,
              summary: c.summary,
            };
          }
          if (c.type === "replace_day") {
            return {
              type: c.type,
              weekNumber: c.weekNumber,
              dayOfWeek: c.dayOfWeek,
              summary: c.summary,
            };
          }
          return {
            type: c.type,
            weekNumber: c.weekNumber,
            summary: c.summary,
          };
        }),
        appendedRanges: appendedRanges.map((r) => ({
          startWeek: r.startWeek,
          endWeek: r.endWeek,
          weeks: r.weeks,
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
