"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Target, Calendar } from "lucide-react";
import {
  WeekSummaryCard,
  WeekDetailPanel,
  EvaluationScores,
  FeedbackForm,
} from "@/components/plan-review";
import type { Week } from "@/lib/blocks";
import type { PlanEvaluation } from "@/lib/plan-evaluation";

interface StoredPlan {
  id: string;
  athleteName: string;
  athleteProfile: {
    experience: string;
    weeklyMileage: number;
    longestRun: number;
    ctl?: number;
    atl?: number;
    lifetimeMiles?: number;
    peakWeeklyMileage?: number;
  };
  raceGoal: {
    raceDistance: string;
    elevation?: number;
    terrainType?: string;
  };
  plan: {
    weeks: Week[];
    totalWeeks: number;
  };
  evaluation: PlanEvaluation;
  createdAt: number;
  generationTimeMs: number;
}

export default function PlanReviewPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/review/plans/${planId}`);
        if (!res.ok) throw new Error("Failed to fetch plan");
        const data = await res.json();
        setPlan(data.plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [planId]);

  const handleFeedbackSubmit = async (feedback: {
    overallRating: number;
    volumeAssessment: string;
    longRunAssessment: string;
    recoveryAssessment: string;
    notes: string;
  }) => {
    const res = await fetch("/api/review/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        ...feedback,
        athleteExperience: plan?.athleteProfile.experience,
        raceType: plan?.raceGoal.raceDistance,
      }),
    });
    if (!res.ok) throw new Error("Failed to submit feedback");
  };

  // Calculate peak miles for progress bars
  const peakMiles = plan?.plan.weeks.reduce((max, week) => {
    let weekTotal = 0;
    for (const day of week.days) {
      for (const workout of day.workouts) {
        for (const block of workout.blocks) {
          if (block.type === "rest") continue;
          if (block.unit === "miles") {
            weekTotal += block.value;
          } else {
            weekTotal += block.value / 10;
          }
        }
      }
    }
    return Math.max(max, weekTotal);
  }, 0) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 rounded w-32" />
            <div className="h-12 bg-neutral-200 rounded w-64" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-neutral-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/review" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-700">{error || "Plan not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link href="/review" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-light text-neutral-900">
            {plan.athleteName}
          </h1>

          {/* Athlete + Goal Summary */}
          <div className="flex flex-wrap gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2 text-neutral-600">
              <User className="h-4 w-4" />
              <span className="capitalize">{plan.athleteProfile.experience}</span>
              <span className="text-neutral-400">|</span>
              <span>{plan.athleteProfile.weeklyMileage}mi/wk</span>
              <span className="text-neutral-400">|</span>
              <span>{plan.athleteProfile.longestRun}mi longest</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Target className="h-4 w-4" />
              <span>{plan.raceGoal.raceDistance}</span>
              {plan.raceGoal.elevation && (
                <>
                  <span className="text-neutral-400">|</span>
                  <span>{plan.raceGoal.elevation.toLocaleString()}ft</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="h-4 w-4" />
              <span>{plan.plan.totalWeeks} weeks</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Weekly Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                Weekly Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.plan.weeks.map((week) => (
                  <div key={week.weekNumber}>
                    <WeekSummaryCard
                      week={week}
                      peakMiles={peakMiles}
                      isExpanded={expandedWeek === week.weekNumber}
                      onToggle={() =>
                        setExpandedWeek(
                          expandedWeek === week.weekNumber ? null : week.weekNumber
                        )
                      }
                    />
                    {expandedWeek === week.weekNumber && (
                      <WeekDetailPanel week={week} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Scores + Feedback */}
          <div className="space-y-6">
            <EvaluationScores evaluation={plan.evaluation} />
            <FeedbackForm
              planId={planId}
              athleteExperience={plan.athleteProfile.experience}
              raceType={plan.raceGoal.raceDistance}
              onSubmit={handleFeedbackSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
