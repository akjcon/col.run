/**
 * Plan Generation Pipeline
 *
 * Single-shot Opus generation → Review → Fix → Evaluate
 */

// Week type used implicitly through plan generator output
import { calculateWeekTotalMiles } from "@/lib/blocks/calculations";
import { evaluatePlan } from "@/lib/plan-evaluation";
import { PlanGeneratorAgent } from "./plan-generator";
import type { PlanGeneratorInput } from "./plan-generator";
import { ReviewerAgent } from "./reviewer";
import { applyFixes } from "./plan-fixer";
import { getFeedbackContextForPrompt } from "@/lib/feedback/aggregator";
import type {
  PlanGenerationInput,
  PlanGenerationOutput,
  AgentTrace,
  WeeklyTarget,
} from "./types";

// =============================================================================
// Pipeline Configuration
// =============================================================================

export interface PipelineConfig {
  /** Skip the LLM review step */
  skipReview?: boolean;
  /** Maximum retries for the plan generation call */
  maxRetries?: number;
}

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  skipReview: false,
  maxRetries: 1,
};

// =============================================================================
// Plan Generation Pipeline
// =============================================================================

export class PlanGenerationPipeline {
  private config: Required<PipelineConfig>;
  private planGenerator: PlanGeneratorAgent;
  private reviewer: ReviewerAgent;

  constructor(config?: PipelineConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.planGenerator = new PlanGeneratorAgent();
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

    // Determine race day of week
    const raceDayOfWeek = input.goal.raceDate
      ? new Date(input.goal.raceDate).toLocaleDateString("en-US", { weekday: "long" })
      : undefined;

    // Step 1: Generate the entire plan in one shot
    console.log(`[Pipeline] Generating ${planWeeks}-week plan with Opus...`);

    const generatorInput: PlanGeneratorInput = {
      athlete: input.athlete,
      goal: input.goal,
      planWeeks,
      raceDayOfWeek,
      constraints: input.constraints,
      raceRequirements: input.raceRequirements,
      feasibility: input.feasibility,
      feedbackContext,
    };

    let generatorResult = await this.planGenerator.execute(generatorInput);
    traces.push(generatorResult.trace);

    // Retry once on failure
    if (!generatorResult.success && this.config.maxRetries > 0) {
      console.warn(`[Pipeline] Plan generation failed: ${generatorResult.error}. Retrying...`);
      generatorResult = await this.planGenerator.execute(generatorInput);
      traces.push(generatorResult.trace);
    }

    if (!generatorResult.success || !generatorResult.data) {
      throw new Error(`Plan generation failed: ${generatorResult.error}`);
    }

    const generated = generatorResult.data;
    let weeks = generated.weeks;

    console.log(
      `[Pipeline] Plan generated. ${weeks.length} weeks, phases: ${generated.phases.map((p) => p.name).join(", ")}`
    );

    // Log week volumes
    for (const week of weeks) {
      const miles = calculateWeekTotalMiles(week);
      console.log(`[Pipeline]   W${week.weekNumber} (${week.phase}): ${miles.toFixed(0)}mi`);
    }

    // Step 2: Review the plan
    let reviewData: PlanGenerationOutput["review"] | undefined;

    if (!this.config.skipReview) {
      console.log(`[Pipeline] Running plan review...`);

      // Synthesize weekly targets from generated plan for the reviewer
      const weeklyTargets: WeeklyTarget[] = weeks.map((week) => ({
        weekNumber: week.weekNumber,
        phase: week.phase,
        targetVolume: Math.round(calculateWeekTotalMiles(week) * 10), // approximate minutes
        keyWorkoutType: null,
      }));

      const reviewResult = await this.reviewer.execute({
        weeks,
        phases: generated.phases,
        athlete: input.athlete,
        goal: input.goal,
        weeklyTargets,
      });

      traces.push(reviewResult.trace);

      if (reviewResult.success && reviewResult.data) {
        const review = reviewResult.data;
        console.log(
          `[Pipeline] Review: ${review.issues.length} issues. Confidence: ${review.confidenceScore}. Passes: ${review.passesReview}`
        );

        // Apply fixes
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
          for (const s of fixResult.skipped) {
            console.warn(`[Pipeline]   ✗ ${s.description}`);
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

    // Step 3: Assemble the plan
    const plan = {
      id: `plan-${Date.now()}`,
      userId: "to-be-set",
      totalWeeks: planWeeks,
      weeks,
      phases: generated.phases,
      generatedAt: Date.now(),
    };

    // Step 4: Evaluate the plan
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
    return Math.max(4, Math.min(52, weeksUntilRace));
  }
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
