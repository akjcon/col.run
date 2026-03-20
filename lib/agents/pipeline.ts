/**
 * Plan Generation Pipeline
 *
 * Orchestrates the two-tier agent architecture:
 * 1. Orchestrator: Strategic planning with full book context
 * 2. Week Generators: Tactical execution for each week
 */

import type { Week } from "@/lib/blocks";
import { evaluatePlan } from "@/lib/plan-evaluation";
import { OrchestratorAgent } from "./orchestrator";
import { WeekGeneratorAgent } from "./week-generator";
import { ReviewerAgent } from "./reviewer";
import { applyFixes } from "./plan-fixer";
import { getFeedbackContextForPrompt } from "@/lib/feedback/aggregator";
import type {
  PlanGenerationInput,
  PlanGenerationOutput,
  AgentTrace,
  OrchestratorOutput,
  PhaseTarget,
  WeeklyTarget,
} from "./types";

// =============================================================================
// Pipeline Configuration
// =============================================================================

export interface PipelineConfig {
  /** Generate weeks in parallel (faster but more API calls at once) */
  parallelWeeks?: boolean;
  /** Maximum concurrent week generations */
  maxConcurrent?: number;
  /** Retry failed week generations */
  retryFailedWeeks?: boolean;
  /** Maximum retries per week */
  maxRetries?: number;
  /** Skip the LLM review step */
  skipReview?: boolean;
}

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  parallelWeeks: false,
  maxConcurrent: 4,
  retryFailedWeeks: true,
  maxRetries: 2,
  skipReview: false,
};

// =============================================================================
// Plan Generation Pipeline
// =============================================================================

export class PlanGenerationPipeline {
  private config: Required<PipelineConfig>;
  private orchestrator: OrchestratorAgent;
  private weekGenerator: WeekGeneratorAgent;
  private reviewer: ReviewerAgent;

  constructor(config?: PipelineConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.orchestrator = new OrchestratorAgent();
    this.weekGenerator = new WeekGeneratorAgent();
    this.reviewer = new ReviewerAgent();
  }

  /**
   * Generate a complete training plan
   */
  async generate(input: PlanGenerationInput): Promise<PlanGenerationOutput> {
    const traces: AgentTrace[] = [];
    const startTime = Date.now();

    // Calculate plan length
    const planWeeks = this.calculatePlanWeeks(input);

    // Fetch feedback context from previous reviews
    let feedbackContext: string | undefined;
    try {
      feedbackContext = await getFeedbackContextForPrompt();
      if (feedbackContext) {
        console.log(`[Pipeline] Loaded feedback context from previous reviews`);
      }
    } catch (err) {
      console.warn(`[Pipeline] Could not load feedback context:`, err);
    }

    // Step 1: Run orchestrator for strategic planning
    console.log(`[Pipeline] Starting orchestrator for ${planWeeks}-week plan...`);
    const orchestratorResult = await this.orchestrator.execute({
      athlete: input.athlete,
      goal: input.goal,
      planWeeks,
      constraints: input.constraints,
      raceRequirements: input.raceRequirements,
      feasibility: input.feasibility,
      feedbackContext,
    });

    traces.push(orchestratorResult.trace);

    if (!orchestratorResult.success || !orchestratorResult.data) {
      throw new Error(`Orchestrator failed: ${orchestratorResult.error}`);
    }

    const planStructure = orchestratorResult.data;
    console.log(`[Pipeline] Orchestrator complete. Phases: ${planStructure.phases.map(p => p.name).join(", ")}`);

    // Fix volume progression violations in orchestrator output (10% rule is real)
    fixVolumeProgression(planStructure.weeklyTargets);

    console.log(`[Pipeline] Orchestrator targets: ${planStructure.weeklyTargets.map(t => `W${t.weekNumber}:${t.targetVolume}`).join(", ")}`);

    // Step 2: Generate each week
    console.log(`[Pipeline] Generating ${planWeeks} weeks...`);
    let weeks: Week[] = [];

    if (this.config.parallelWeeks) {
      // Parallel generation (faster but uses more concurrent API calls)
      const weekResults = await this.generateWeeksParallel(planStructure, input, planWeeks);
      for (const result of weekResults) {
        traces.push(result.trace);
        if (result.success && result.week) {
          weeks.push(result.week);
        }
      }
    } else {
      // Determine race day of week for final week instructions
      const raceDayOfWeek = input.goal.raceDate
        ? new Date(input.goal.raceDate).toLocaleDateString("en-US", { weekday: "long" })
        : null;

      // Sequential generation (slower but safer, provides previous week context)
      for (let weekNum = 1; weekNum <= planWeeks; weekNum++) {
        const previousWeek = weeks.length > 0 ? weeks[weeks.length - 1] : undefined;

        // Inject race week instructions for the final week
        if (weekNum === planWeeks && raceDayOfWeek) {
          const target = planStructure.weeklyTargets[weekNum - 1];
          if (target) {
            target.instructions = `RACE WEEK — the race is on ${raceDayOfWeek}.
This is the final week before the race. The ONLY goal is to arrive at ${raceDayOfWeek} fresh and ready.
- ${raceDayOfWeek} is RACE DAY — schedule it as a rest day (the race itself is not part of the training plan)
- The day before the race: a short 1-2 mile shakeout jog at z1 with 4-6 strides (10-15 sec pickups) to stay sharp. This is optional for low-volume athletes (<20mi/week) — use rest instead.
- 2-3 days before race day should be complete rest
- Earlier in the week: at most 1-2 very short, easy shakeout runs (2-3 miles max, z1-z2)
- NO tempo, NO intervals, NO long runs, NO hard efforts of any kind
- Total volume for the week should be minimal (20-30% of peak week at most)`;
            target.keyWorkoutType = null;
            target.notes = "Race week";
          }
        }

        const result = await this.generateWeekWithRetry(
          weekNum,
          planStructure,
          input,
          previousWeek
        );

        traces.push(result.trace);

        if (result.success && result.week) {
          const target = planStructure.weeklyTargets[weekNum - 1]?.targetVolume || 0;
          const week = result.week;

          // Just log - trust the AI's judgment
          const actual = calculateWeekVolume(week);
          console.log(`[Pipeline] Week ${weekNum} complete: ${actual} min (target: ${target})`);

          weeks.push(week);
        } else {
          console.error(`[Pipeline] Week ${weekNum} failed: ${result.error}`);
          // Create a placeholder rest week if generation fails
          weeks.push(createRestWeek(weekNum, planStructure.weeklyTargets[weekNum - 1]?.phase || "Unknown"));
        }
      }
    }

    // Step 3: Review the plan
    let reviewData: PlanGenerationOutput["review"] | undefined;

    if (!this.config.skipReview) {
      console.log(`[Pipeline] Running plan review...`);
      const reviewResult = await this.reviewer.execute({
        weeks,
        phases: planStructure.phases,
        athlete: input.athlete,
        goal: input.goal,
        weeklyTargets: planStructure.weeklyTargets,
      });

      traces.push(reviewResult.trace);

      if (reviewResult.success && reviewResult.data) {
        const review = reviewResult.data;
        console.log(
          `[Pipeline] Review complete. ${review.issues.length} issues found. Confidence: ${review.confidenceScore}. Passes: ${review.passesReview}`
        );

        // Apply fixes for issues that have suggested fixes
        const fixableIssues = review.issues.filter((i) => i.suggestedFix !== null);
        let fixesApplied = 0;
        let fixesSkipped = 0;

        if (fixableIssues.length > 0) {
          console.log(`[Pipeline] Applying ${fixableIssues.length} fixes...`);
          const fixResult = applyFixes(weeks, fixableIssues);
          weeks = fixResult.updatedWeeks;
          fixesApplied = fixResult.applied.length;
          fixesSkipped = fixResult.skipped.length;

          for (const applied of fixResult.applied) {
            console.log(`[Pipeline]   ✓ ${applied.description}`);
          }
          for (const skipped of fixResult.skipped) {
            console.warn(`[Pipeline]   ✗ ${skipped.description}`);
          }
        }

        reviewData = {
          issues: review.issues,
          overallAssessment: review.overallAssessment,
          confidenceScore: review.confidenceScore,
          fixesApplied,
          fixesSkipped,
        };
      } else {
        console.warn(`[Pipeline] Review failed: ${reviewResult.error}. Proceeding without review.`);
      }
    }

    // Step 4: Assemble the plan
    const plan = {
      id: `plan-${Date.now()}`,
      userId: "to-be-set",
      totalWeeks: planWeeks,
      weeks,
      phases: planStructure.phases,
      generatedAt: Date.now(),
    };

    // Step 5: Evaluate the plan
    console.log(`[Pipeline] Evaluating plan quality...`);
    const evaluation = evaluatePlan({
      id: plan.id,
      userId: plan.userId,
      totalWeeks: plan.totalWeeks,
      weeks: plan.weeks,
    });

    const totalTime = Date.now() - startTime;
    console.log(`[Pipeline] Complete in ${(totalTime / 1000).toFixed(1)}s. Score: ${evaluation.overall}`);

    return {
      plan,
      traces,
      evaluation: {
        structural: evaluation.structural.score,
        safety: evaluation.safety.score,
        methodology: evaluation.methodology.score,
        overall: evaluation.overall,
      },
      review: reviewData,
    };
  }

  /**
   * Calculate plan length based on race date
   */
  private calculatePlanWeeks(input: PlanGenerationInput): number {
    if (!input.goal.raceDate) {
      // Default plan lengths based on race distance
      const distance = input.goal.raceDistance.toLowerCase();
      if (distance.includes("50k") || distance.includes("50 mile") || distance.includes("100")) {
        return 16;
      }
      if (distance.includes("marathon") || distance.includes("26.2")) {
        return 12;
      }
      if (distance.includes("half")) {
        return 10;
      }
      return 8;
    }

    const now = Date.now();
    const raceDate = input.goal.raceDate;
    const weeksUntilRace = Math.floor((raceDate - now) / (7 * 24 * 60 * 60 * 1000));

    // Clamp to reasonable range
    return Math.max(4, Math.min(52, weeksUntilRace));
  }

  /**
   * Generate a single week with retry logic
   */
  private async generateWeekWithRetry(
    weekNumber: number,
    planStructure: OrchestratorOutput,
    input: PlanGenerationInput,
    previousWeek?: Week
  ): Promise<{ success: boolean; week?: Week; error?: string; trace: AgentTrace }> {
    const target = planStructure.weeklyTargets[weekNumber - 1];
    const phase = this.findPhaseForWeek(weekNumber, planStructure.phases);

    let lastError: string | undefined;
    let lastTrace: AgentTrace | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const result = await this.weekGenerator.execute({
        weekNumber,
        target,
        phase,
        methodology: planStructure.methodology,
        previousWeek,
        constraints: input.constraints,
        athleteProfile: input.athlete,
      });

      lastTrace = result.trace;

      if (result.success && result.data) {
        return {
          success: true,
          week: result.data.week,
          trace: result.trace,
        };
      }

      lastError = result.error;
      if (attempt < this.config.maxRetries) {
        console.log(`[Pipeline] Week ${weekNumber} attempt ${attempt + 1} failed, retrying...`);
      }
    }

    return {
      success: false,
      error: lastError,
      trace: lastTrace!,
    };
  }

  /**
   * Generate weeks in parallel batches
   */
  private async generateWeeksParallel(
    planStructure: OrchestratorOutput,
    input: PlanGenerationInput,
    totalWeeks: number
  ): Promise<Array<{ success: boolean; week?: Week; error?: string; trace: AgentTrace }>> {
    const results: Array<{ success: boolean; week?: Week; error?: string; trace: AgentTrace }> = [];

    // Process in batches
    for (let i = 0; i < totalWeeks; i += this.config.maxConcurrent) {
      const batch = [];
      for (let j = i; j < Math.min(i + this.config.maxConcurrent, totalWeeks); j++) {
        const weekNumber = j + 1;
        batch.push(
          this.generateWeekWithRetry(weekNumber, planStructure, input, undefined)
        );
      }

      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Find the phase for a given week number
   */
  private findPhaseForWeek(weekNumber: number, phases: PhaseTarget[]): PhaseTarget {
    for (const phase of phases) {
      if (weekNumber >= phase.startWeek && weekNumber <= phase.endWeek) {
        return phase;
      }
    }
    // Fallback to last phase if not found
    return phases[phases.length - 1];
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a rest week as fallback when generation fails
 */
function createRestWeek(weekNumber: number, phase: string): Week {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return {
    weekNumber,
    phase,
    days: days.map(dayOfWeek => ({
      dayOfWeek,
      workouts: [{
        blocks: [{ type: "rest" as const, value: 0, unit: "minutes" as const, effortLevel: "z1" as const }],
      }],
    })),
  };
}

/**
 * Fix volume progression violations in orchestrator output.
 * Ensures no week increases more than 10% from the reference volume.
 * Reference volume = last non-recovery week's volume.
 */
function fixVolumeProgression(weeklyTargets: WeeklyTarget[]): void {
  if (weeklyTargets.length === 0) return;

  let referenceVolume = weeklyTargets[0].targetVolume;

  for (let i = 1; i < weeklyTargets.length; i++) {
    const target = weeklyTargets[i];
    const isRecovery = target.phase.toLowerCase().includes("recovery");

    if (isRecovery) {
      // Recovery week - don't update reference, but ensure it's reduced
      const minReduction = referenceVolume * 0.70; // At least 30% reduction
      if (target.targetVolume > minReduction) {
        target.targetVolume = Math.round(minReduction);
      }
    } else {
      // Normal week - cap at 10% increase from reference
      // Use 1.095 and floor to avoid rounding errors pushing over 10%
      const maxAllowed = Math.floor(referenceVolume * 1.095);
      if (target.targetVolume > maxAllowed) {
        target.targetVolume = maxAllowed;
      }
      // Update reference for next iteration
      referenceVolume = target.targetVolume;
    }
  }
}



/**
 * Calculate total volume (minutes) for a week.
 * Converts miles to minutes using assumed pace.
 */
function calculateWeekVolume(week: Week, paceMinPerMile = 10): number {
  return week.days.reduce((sum, day) =>
    sum + day.workouts.reduce((wSum, workout) =>
      wSum + workout.blocks.reduce((bSum, block) => {
        if (block.type === "rest") return bSum;
        if (block.unit === "miles") {
          return bSum + (block.value * paceMinPerMile);
        }
        return bSum + block.value;
      }, 0),
    0),
  0);
}


// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Generate a training plan with default configuration
 */
export async function generatePlan(input: PlanGenerationInput): Promise<PlanGenerationOutput> {
  const pipeline = new PlanGenerationPipeline();
  return pipeline.generate(input);
}
