/**
 * Agent Framework
 *
 * Single-shot Opus plan generation with LLM review.
 */

// Types
export type {
  AgentTrace,
  AgentResult,
  AthleteProfile,
  RaceGoal,
  PlanConstraints,
  PhaseTarget,
  WeeklyTarget,
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

// Plan Generator (single-shot Opus)
export { PlanGeneratorAgent } from "./plan-generator";
export type { PlanGeneratorInput, PlanGeneratorOutput } from "./plan-generator";

// Reviewer
export { ReviewerAgent } from "./reviewer";

// Review checklist
export { REVIEW_CHECKLIST } from "./review-checklist";
export type { ChecklistItem, ChecklistCategory, ChecklistSeverity } from "./review-checklist";
export { applyFixes } from "./plan-fixer";
export type { FixResult, FixApplicationResult } from "./plan-fixer";

// Pipeline
export { PlanGenerationPipeline, generatePlan } from "./pipeline";
export type { PipelineConfig } from "./pipeline";
