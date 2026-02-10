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
import type {
  PlanGenerationInput,
  PlanGenerationOutput,
  AgentTrace,
  OrchestratorOutput,
  PhaseTarget,
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
}

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  parallelWeeks: false,
  maxConcurrent: 4,
  retryFailedWeeks: true,
  maxRetries: 2,
};

// =============================================================================
// Plan Generation Pipeline
// =============================================================================

export class PlanGenerationPipeline {
  private config: Required<PipelineConfig>;
  private orchestrator: OrchestratorAgent;
  private weekGenerator: WeekGeneratorAgent;

  constructor(config?: PipelineConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.orchestrator = new OrchestratorAgent();
    this.weekGenerator = new WeekGeneratorAgent();
  }

  /**
   * Generate a complete training plan
   */
  async generate(input: PlanGenerationInput): Promise<PlanGenerationOutput> {
    const traces: AgentTrace[] = [];
    const startTime = Date.now();

    // Calculate plan length
    const planWeeks = this.calculatePlanWeeks(input);

    // Step 1: Run orchestrator for strategic planning
    console.log(`[Pipeline] Starting orchestrator for ${planWeeks}-week plan...`);
    const orchestratorResult = await this.orchestrator.execute({
      athlete: input.athlete,
      goal: input.goal,
      planWeeks,
      constraints: input.constraints,
    });

    traces.push(orchestratorResult.trace);

    if (!orchestratorResult.success || !orchestratorResult.data) {
      throw new Error(`Orchestrator failed: ${orchestratorResult.error}`);
    }

    const planStructure = orchestratorResult.data;
    console.log(`[Pipeline] Orchestrator complete. Phases: ${planStructure.phases.map(p => p.name).join(", ")}`);

    // Step 2: Generate each week
    console.log(`[Pipeline] Generating ${planWeeks} weeks...`);
    const weeks: Week[] = [];

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
      // Sequential generation (slower but safer, provides previous week context)
      for (let weekNum = 1; weekNum <= planWeeks; weekNum++) {
        const previousWeek = weeks.length > 0 ? weeks[weeks.length - 1] : undefined;
        const result = await this.generateWeekWithRetry(
          weekNum,
          planStructure,
          input,
          previousWeek
        );

        traces.push(result.trace);

        if (result.success && result.week) {
          weeks.push(result.week);
          console.log(`[Pipeline] Week ${weekNum} complete`);
        } else {
          console.error(`[Pipeline] Week ${weekNum} failed: ${result.error}`);
          // Create a placeholder rest week if generation fails
          weeks.push(createRestWeek(weekNum, planStructure.weeklyTargets[weekNum - 1]?.phase || "Unknown"));
        }
      }
    }

    // Step 3: Assemble the plan
    const plan = {
      id: `plan-${Date.now()}`,
      userId: "to-be-set",
      totalWeeks: planWeeks,
      weeks,
      phases: planStructure.phases,
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
        blocks: [{ type: "rest" as const, value: 0, effortLevel: "z1" as const }],
      }],
    })),
  };
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
