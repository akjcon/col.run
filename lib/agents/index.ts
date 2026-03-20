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
  ReviewerInput,
  ReviewerOutput,
  ReviewIssue,
  SuggestedFix,
  FixType,
} from "./types";

// Base Agent
export { BaseAgent, extractJSON } from "./base";
export type { AgentConfig } from "./base";

// Agents
export {
  OrchestratorAgent,
  setBookContentForTesting,
  clearBookContentCache,
  setUseCondensedMethodology,
} from "./orchestrator";
export { WeekGeneratorAgent } from "./week-generator";
export { ReviewerAgent } from "./reviewer";

// Review
export { REVIEW_CHECKLIST } from "./review-checklist";
export type { ChecklistItem, ChecklistCategory, ChecklistSeverity } from "./review-checklist";
export { applyFixes } from "./plan-fixer";
export type { FixResult, FixApplicationResult } from "./plan-fixer";

// Pipeline
export { PlanGenerationPipeline, generatePlan } from "./pipeline";
export type { PipelineConfig } from "./pipeline";
