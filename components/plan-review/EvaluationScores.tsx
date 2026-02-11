"use client";

import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { PlanEvaluation } from "@/lib/plan-evaluation";

interface EvaluationScoresProps {
  evaluation: PlanEvaluation;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreIcon = (s: number) => {
    if (s >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (s >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {getScoreIcon(score)}
          <span className="text-sm text-neutral-700">{label}</span>
        </div>
        <span className="text-sm font-semibold text-neutral-900">{score}%</span>
      </div>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// Handle both full evaluation objects and simplified score-only objects
type SimplifiedEvaluation = {
  structural: number;
  safety: number;
  methodology: number;
  overall: number;
};

function isSimplifiedEvaluation(eval_: PlanEvaluation | SimplifiedEvaluation): eval_ is SimplifiedEvaluation {
  return typeof eval_.structural === 'number';
}

export function EvaluationScores({ evaluation }: EvaluationScoresProps | { evaluation: SimplifiedEvaluation }) {
  // Handle simplified evaluation (just scores)
  if (isSimplifiedEvaluation(evaluation)) {
    const overallColor = evaluation.overall >= 80
      ? "text-green-600"
      : evaluation.overall >= 60
      ? "text-yellow-600"
      : "text-red-600";

    return (
      <div className="border border-neutral-200 rounded-xl bg-white shadow-sm">
        <div className="p-6 border-b border-neutral-100">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            Overall Score
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${overallColor}`}>
              {evaluation.overall}
            </span>
            <span className="text-2xl text-neutral-400">/ 100</span>
          </div>
        </div>
        <div className="p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-4">
            Score Breakdown
          </p>
          <ScoreBar score={evaluation.structural} label="Structural" />
          <ScoreBar score={evaluation.safety} label="Safety" />
          <ScoreBar score={evaluation.methodology} label="Methodology" />
        </div>
      </div>
    );
  }

  // Full evaluation object
  const overallColor = evaluation.overall >= 80
    ? "text-green-600"
    : evaluation.overall >= 60
    ? "text-yellow-600"
    : "text-red-600";

  // Collect all issues
  const allIssues: string[] = [];
  if (evaluation.structural?.errors?.length > 0) {
    allIssues.push(...evaluation.structural.errors.map(e => e.message));
  }
  if (evaluation.safety?.violations?.length > 0) {
    allIssues.push(...evaluation.safety.violations.map(v => v.message));
  }
  if (evaluation.methodology?.issues?.length > 0) {
    allIssues.push(...evaluation.methodology.issues);
  }
  if (evaluation.raceAppropriateness?.issues?.length) {
    allIssues.push(...evaluation.raceAppropriateness.issues);
  }

  return (
    <div className="border border-neutral-200 rounded-xl bg-white shadow-sm">
      {/* Overall Score Header */}
      <div className="p-6 border-b border-neutral-100">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
          Overall Score
        </p>
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold ${overallColor}`}>
            {evaluation.overall}
          </span>
          <span className="text-2xl text-neutral-400">/ 100</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-4">
          Score Breakdown
        </p>

        <ScoreBar score={evaluation.structural.score} label="Structural" />
        <ScoreBar score={evaluation.safety.score} label="Safety" />
        <ScoreBar score={evaluation.methodology.score} label="Methodology" />
        {evaluation.raceAppropriateness && (
          <ScoreBar score={evaluation.raceAppropriateness.score} label="Race Appropriateness" />
        )}
      </div>

      {/* Race Stats (if available) */}
      {evaluation.raceAppropriateness && (
        <div className="px-6 pb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            Race Stats
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neutral-500">Peak Weekly:</span>{" "}
              <span className="font-medium">{evaluation.raceAppropriateness.peakWeeklyMiles.toFixed(1)}mi</span>
            </div>
            <div>
              <span className="text-neutral-500">Peak Long Run:</span>{" "}
              <span className="font-medium">{evaluation.raceAppropriateness.peakLongRunMiles.toFixed(1)}mi</span>
            </div>
            <div className="col-span-2">
              <span className="text-neutral-500">Key Workouts:</span>{" "}
              <span className={`font-medium ${evaluation.raceAppropriateness.hasKeyWorkouts ? "text-green-600" : "text-red-600"}`}>
                {evaluation.raceAppropriateness.hasKeyWorkouts ? "Yes" : "Missing"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Issues List */}
      {allIssues.length > 0 && (
        <div className="px-6 pb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
            Issues ({allIssues.length})
          </p>
          <ul className="space-y-1">
            {allIssues.slice(0, 5).map((issue, idx) => (
              <li key={idx} className="text-sm text-neutral-600 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                {issue}
              </li>
            ))}
            {allIssues.length > 5 && (
              <li className="text-sm text-neutral-400 italic">
                ...and {allIssues.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
