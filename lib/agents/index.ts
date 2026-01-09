/**
 * Agent Framework
 *
 * Two-tier architecture for training plan generation:
 * - Orchestrator: Strategic planning with full book context
 * - WeekGenerator: Tactical execution for each week
 */

// Types
export type {
  AgentTrace,
  AgentResult,
  AthleteProfile,
  RaceGoal,
  PlanConstraints,
  OrchestratorInput,
  OrchestratorOutput,
  PhaseTarget,
  WeeklyTarget,
  WeekGeneratorInput,
  WeekGeneratorOutput,
  PlanGenerationInput,
  PlanGenerationOutput,
} from "./types";

// Base Agent
export { BaseAgent, extractJSON } from "./base";
export type { AgentConfig } from "./base";

// Agents
export { OrchestratorAgent, setBookContentForTesting, clearBookContentCache } from "./orchestrator";
export { WeekGeneratorAgent } from "./week-generator";

// Pipeline
export { PlanGenerationPipeline, generatePlan } from "./pipeline";
export type { PipelineConfig } from "./pipeline";
