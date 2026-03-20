import { after, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { generatePlan } from "@/lib/agents/pipeline";
import { analyzeFeasibility } from "@/lib/planning/feasibility";
import { getRaceRequirements, adjustForElevation } from "@/lib/planning/race-requirements";
import { evaluatePlan } from "@/lib/plan-evaluation";
import type {
  AthleteProfile,
  RaceGoal,
  PlanGenerationInput,
  RaceRequirementsSummary,
  FeasibilitySummary,
} from "@/lib/agents/types";

export const maxDuration = 300;

initializeFirebaseAdmin();

// =============================================================================
// Sample Athletes (same as generate-sample-plan.ts but inline)
// =============================================================================

interface SampleAthlete {
  name: string;
  experience: "beginner" | "intermediate" | "advanced";
  weeklyMileage: number;
  longestRun: number;
  ctl: number;
  atl: number;
  thresholdPace?: number;
  lifetimeMiles: number;
  longestRunEver: number;
  peakWeeklyMileage: number;
  ultraExperience: boolean;
  trailExperience: boolean;
  goal: {
    raceDistance: string;
    raceType: string;
    weeksUntilRace: number;
    elevation?: number;
    terrainType?: "road" | "trail";
    raceDateEpoch?: number;
  };
}

const SAMPLE_ATHLETES: SampleAthlete[] = [
  {
    name: "Beginner Half Marathon",
    experience: "beginner",
    weeklyMileage: 15,
    longestRun: 6,
    ctl: 20,
    atl: 18,
    lifetimeMiles: 500,
    longestRunEver: 8,
    peakWeeklyMileage: 20,
    ultraExperience: false,
    trailExperience: false,
    goal: { raceDistance: "half", raceType: "half", weeksUntilRace: 12, terrainType: "road" },
  },
  {
    name: "Intermediate Marathon",
    experience: "intermediate",
    weeklyMileage: 35,
    longestRun: 16,
    ctl: 45,
    atl: 40,
    thresholdPace: 8.0,
    lifetimeMiles: 2500,
    longestRunEver: 20,
    peakWeeklyMileage: 45,
    ultraExperience: false,
    trailExperience: true,
    goal: { raceDistance: "marathon", raceType: "marathon", weeksUntilRace: 16, terrainType: "road" },
  },
  {
    name: "Advanced 50k Trail",
    experience: "advanced",
    weeklyMileage: 45,
    longestRun: 22,
    ctl: 55,
    atl: 50,
    thresholdPace: 7.5,
    lifetimeMiles: 5000,
    longestRunEver: 31,
    peakWeeklyMileage: 60,
    ultraExperience: true,
    trailExperience: true,
    goal: { raceDistance: "50k", raceType: "50k", weeksUntilRace: 14, elevation: 5000, terrainType: "trail" },
  },
  {
    name: "Experienced 50-Miler",
    experience: "advanced",
    weeklyMileage: 50,
    longestRun: 28,
    ctl: 65,
    atl: 58,
    thresholdPace: 7.8,
    lifetimeMiles: 8000,
    longestRunEver: 50,
    peakWeeklyMileage: 75,
    ultraExperience: true,
    trailExperience: true,
    goal: { raceDistance: "50mi", raceType: "50mi", weeksUntilRace: 18, elevation: 10000, terrainType: "trail" },
  },
  {
    name: "Comeback Runner - Marathon",
    experience: "advanced",
    weeklyMileage: 12,
    longestRun: 8,
    ctl: 15,
    atl: 12,
    thresholdPace: 8.5,
    lifetimeMiles: 4000,
    longestRunEver: 26.2,
    peakWeeklyMileage: 55,
    ultraExperience: false,
    trailExperience: true,
    goal: { raceDistance: "marathon", raceType: "marathon", weeksUntilRace: 20, terrainType: "road" },
  },
  {
    name: "Beginner 10k",
    experience: "beginner",
    weeklyMileage: 10,
    longestRun: 4,
    ctl: 12,
    atl: 10,
    lifetimeMiles: 200,
    longestRunEver: 5,
    peakWeeklyMileage: 12,
    ultraExperience: false,
    trailExperience: false,
    goal: { raceDistance: "10k", raceType: "10k", weeksUntilRace: 10, terrainType: "road" },
  },
  {
    name: "Trail 100-Miler",
    experience: "advanced",
    weeklyMileage: 60,
    longestRun: 35,
    ctl: 75,
    atl: 65,
    thresholdPace: 8.0,
    lifetimeMiles: 12000,
    longestRunEver: 62,
    peakWeeklyMileage: 90,
    ultraExperience: true,
    trailExperience: true,
    goal: { raceDistance: "100mi", raceType: "100mi", weeksUntilRace: 24, elevation: 20000, terrainType: "trail" },
  },
  {
    name: "Intermediate Half - Hilly",
    experience: "intermediate",
    weeklyMileage: 25,
    longestRun: 10,
    ctl: 30,
    atl: 28,
    thresholdPace: 8.5,
    lifetimeMiles: 1500,
    longestRunEver: 13.1,
    peakWeeklyMileage: 30,
    ultraExperience: false,
    trailExperience: true,
    goal: { raceDistance: "half", raceType: "half", weeksUntilRace: 14, elevation: 2500, terrainType: "trail" },
  },
];

const DISTANCE_MAP: Record<string, number> = {
  "5k": 3.1,
  "10k": 6.2,
  half: 13.1,
  marathon: 26.2,
  "50k": 31,
  "50mi": 50,
  "100k": 62,
  "100mi": 100,
};

/**
 * POST /api/review/generate
 * Body is optional. If provided, uses custom athlete data.
 * If empty or no body, picks a random sample athlete.
 *
 * Custom body shape:
 * {
 *   name: string,
 *   experience: "beginner" | "intermediate" | "advanced",
 *   weeklyMileage: number,
 *   longestRun: number,
 *   thresholdPace?: number,    // min/mile (e.g. 8.5)
 *   raceDistance: string,       // "5k", "10k", "half", "marathon", "50k", "50mi", "100mi"
 *   raceDate?: number,          // epoch ms — preferred over weeksUntilRace
 *   weeksUntilRace?: number,    // fallback if no raceDate
 *   elevation?: number,
 *   terrainType?: "road" | "trail"
 * }
 */
export async function POST(request: Request) {
  try {
    // Check for custom body
    let sample: SampleAthlete;

    try {
      const body = await request.json();
      if (body && body.name && body.raceDistance) {
        // Custom athlete from request body
        const exp = body.experience || "intermediate";
        const mileage = body.weeklyMileage || 25;

        // Compute weeksUntilRace from raceDate if provided
        let weeksUntilRace = body.weeksUntilRace || 16;
        const raceDateEpoch: number | undefined = body.raceDate;
        if (raceDateEpoch) {
          weeksUntilRace = Math.max(4, Math.floor((raceDateEpoch - Date.now()) / (7 * 24 * 60 * 60 * 1000)));
        }

        sample = {
          name: body.name,
          experience: exp,
          weeklyMileage: mileage,
          longestRun: body.longestRun || Math.round(mileage * 0.4),
          ctl: Math.round(mileage * 1.2),
          atl: Math.round(mileage * 1.1),
          thresholdPace: body.thresholdPace,
          lifetimeMiles: exp === "beginner" ? 500 : exp === "intermediate" ? 2500 : 5000,
          longestRunEver: body.longestRunEver || body.longestRun || Math.round(mileage * 0.5),
          peakWeeklyMileage: body.peakWeeklyMileage || Math.round(mileage * 1.3),
          ultraExperience: ["50k", "50mi", "100k", "100mi"].includes(body.raceDistance) && exp === "advanced",
          trailExperience: body.terrainType === "trail" || exp === "advanced",
          goal: {
            raceDistance: body.raceDistance,
            raceType: body.raceDistance,
            weeksUntilRace,
            elevation: body.elevation,
            terrainType: body.terrainType,
            raceDateEpoch,
          },
        };
      } else {
        // Random sample
        sample = SAMPLE_ATHLETES[Math.floor(Math.random() * SAMPLE_ATHLETES.length)];
      }
    } catch {
      // No body or invalid JSON — use random
      sample = SAMPLE_ATHLETES[Math.floor(Math.random() * SAMPLE_ATHLETES.length)];
    }

    console.log(`[Review Generate] Generating plan for: ${sample.name}`);

    // Build athlete profile early so it's saved in the placeholder (needed for retries)
    const placeholderAthleteProfile: AthleteProfile = {
      experience: sample.experience,
      weeklyMileage: sample.weeklyMileage,
      longestRun: sample.longestRun,
      ctl: sample.ctl,
      atl: sample.atl,
      thresholdPace: sample.thresholdPace,
      lifetimeMiles: sample.lifetimeMiles,
      longestRunEver: sample.longestRunEver,
      peakWeeklyMileage: sample.peakWeeklyMileage,
      ultraExperience: sample.ultraExperience,
      trailExperience: sample.trailExperience,
    };

    // Create placeholder doc immediately so it shows in the list
    const db = getFirestore();
    const placeholderRef = await db.collection("generatedPlans").add({
      athleteName: sample.name,
      athleteProfile: JSON.parse(JSON.stringify(placeholderAthleteProfile)),
      raceGoal: {
        raceDistance: sample.goal.raceDistance,
        elevation: sample.goal.elevation,
        raceDate: sample.goal.raceDateEpoch || null,
        terrainType: sample.goal.terrainType || null,
      },
      status: "generating",
      createdAt: Date.now(),
      evaluation: { overall: 0 },
      generationTimeMs: 0,
    });

    const placeholderPlanId = placeholderRef.id;
    console.log(`[Review Generate] Placeholder created: ${placeholderPlanId}`);

    // Run generation after the response is sent (keeps function alive)
    after(async () => {
      try {
        await generateInBackground(sample, db, placeholderPlanId);
      } catch (err) {
        console.error(`[Review Generate] Background generation failed:`, err);
        await db.collection("generatedPlans").doc(placeholderPlanId).update({
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });

    return NextResponse.json({
      success: true,
      planId: placeholderPlanId,
      athleteName: sample.name,
      raceDistance: sample.goal.raceDistance,
    });
  } catch (error) {
    console.error("[Review Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate plan" },
      { status: 500 }
    );
  }
}

/**
 * Background generation — runs after the response is sent.
 */
async function generateInBackground(
  sample: SampleAthlete,
  db: FirebaseFirestore.Firestore,
  planId: string
) {
    // Feasibility
    const feasibilityResult = analyzeFeasibility({
      raceType: sample.goal.raceType,
      weeksUntilRace: sample.goal.weeksUntilRace,
      elevationGain: sample.goal.elevation || 0,
      currentFitness: {
        userId: "sample",
        updatedAt: Date.now(),
        weeklyMileage: sample.weeklyMileage,
        longestRun: sample.longestRun,
        ctl: sample.ctl,
        atl: sample.atl,
        tsb: sample.ctl - sample.atl,
        weeklyVolume: sample.weeklyMileage * 10,
        avgPace: (sample.thresholdPace || 9) * 1.2,
        estimatedThresholdPace: sample.thresholdPace,
      },
      experience: {
        userId: "sample",
        updatedAt: Date.now(),
        lifetimeMiles: sample.lifetimeMiles,
        lifetimeRuns: Math.round(sample.lifetimeMiles / 5),
        lifetimeElevationFeet: sample.lifetimeMiles * 50,
        accountAgeYears: Math.round(sample.lifetimeMiles / 1000),
        longestRunEver: sample.longestRunEver,
        peakWeeklyMileage: sample.peakWeeklyMileage,
        peakMonthlyMileage: sample.peakWeeklyMileage * 4,
        biggestClimbFeet: (sample.goal.elevation || 1000) / 2,
        experienceLevel: sample.experience,
        ultraExperience: sample.ultraExperience,
        trailExperience: sample.trailExperience,
        totalShoeMileage: sample.lifetimeMiles * 0.8,
      },
    });

    // Race requirements
    let requirements = getRaceRequirements(sample.goal.raceType);
    if (!requirements) {
      return NextResponse.json({ error: `Unknown race type: ${sample.goal.raceType}` }, { status: 400 });
    }
    if (sample.goal.elevation && sample.goal.elevation > 1000) {
      requirements = adjustForElevation(requirements, sample.goal.elevation);
    }

    const distanceMiles = DISTANCE_MAP[sample.goal.raceType] || 26.2;

    const raceRequirements: RaceRequirementsSummary = {
      distanceMiles,
      peakWeeklyMileage: requirements.peakWeeklyMileage,
      peakLongRun: requirements.peakLongRun,
      keyWorkouts: requirements.keyWorkouts,
      considerations: requirements.considerations,
    };

    const feasibility: FeasibilitySummary = {
      feasible: feasibilityResult.feasible,
      riskLevel: feasibilityResult.riskLevel,
      suggestedApproach: feasibilityResult.recommendations.suggestedApproach,
      startingWeeklyMileage: feasibilityResult.recommendations.startingWeeklyMileage,
      targetPeakMileage: feasibilityResult.recommendations.targetPeakMileage,
      targetPeakLongRun: feasibilityResult.recommendations.targetPeakLongRun,
      warnings: feasibilityResult.warnings,
    };

    const athlete: AthleteProfile = {
      experience: sample.experience,
      weeklyMileage: sample.weeklyMileage,
      longestRun: sample.longestRun,
      ctl: sample.ctl,
      atl: sample.atl,
      thresholdPace: sample.thresholdPace,
      lifetimeMiles: sample.lifetimeMiles,
      longestRunEver: sample.longestRunEver,
      peakWeeklyMileage: sample.peakWeeklyMileage,
      ultraExperience: sample.ultraExperience,
      trailExperience: sample.trailExperience,
    };

    const raceGoal: RaceGoal = {
      raceDistance: sample.goal.raceDistance,
      raceDate: (sample.goal as { raceDateEpoch?: number }).raceDateEpoch
        || (Date.now() + sample.goal.weeksUntilRace * 7 * 24 * 60 * 60 * 1000),
      elevation: sample.goal.elevation,
      terrainType: sample.goal.terrainType,
    };

    const input: PlanGenerationInput = {
      athlete,
      goal: raceGoal,
      constraints: { preferredLongRunDay: "Saturday" },
      raceRequirements,
      feasibility,
    };

    // Generate
    const startTime = Date.now();
    const output = await generatePlan(input);
    const generationTimeMs = Date.now() - startTime;

    // Evaluate
    const evaluation = evaluatePlan(
      {
        id: "temp",
        userId: "temp",
        totalWeeks: output.plan.totalWeeks,
        weeks: output.plan.weeks,
      },
      sample.goal.raceType
    );

    // Update the placeholder doc with the full plan
    const cleanData = JSON.parse(
      JSON.stringify({
        athleteName: sample.name,
        athleteProfile: athlete,
        raceGoal,
        feasibility,
        plan: {
          id: planId,
          userId: "review",
          totalWeeks: output.plan.totalWeeks,
          weeks: output.plan.weeks,
          phases: output.plan.phases,
        },
        evaluation,
        review: output.review ?? null,
        generationTimeMs,
        status: "complete",
      })
    );

    await db.collection("generatedPlans").doc(planId).update(cleanData);

    console.log(`[Review Generate] Plan complete: ${planId} (${(generationTimeMs / 1000).toFixed(1)}s)`);
}
