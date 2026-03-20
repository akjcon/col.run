"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Target, Calendar, Play, Loader2, Check } from "lucide-react";
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
    raceDate?: number;
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
  status?: "generating" | "complete" | "error";
}

export default function PlanReviewPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonated, setImpersonated] = useState(false);

  const fetchPlan = useCallback(async () => {
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
  }, [planId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Poll while plan is generating
  useEffect(() => {
    if (plan?.status !== "generating") return;
    const interval = setInterval(fetchPlan, 5000);
    return () => clearInterval(interval);
  }, [plan?.status, fetchPlan]);

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

  const handleImpersonate = async () => {
    setImpersonating(true);
    try {
      const res = await fetch("/api/review/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to impersonate");
      }
      setImpersonated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to impersonate");
    } finally {
      setImpersonating(false);
    }
  };

  const hasRaceDate = !!plan?.raceGoal.raceDate;
  const lastWeekNumber = plan?.plan.weeks.length || 0;

  // Calculate peak miles for progress bars (exclude race day from last week)
  const peakMiles = plan?.plan.weeks.reduce((max, week) => {
    const isRaceWeek = hasRaceDate && week.weekNumber === lastWeekNumber;
    const days = isRaceWeek ? week.days.slice(0, -1) : week.days;
    let weekTotal = 0;
    for (const day of days) {
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
      <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 rounded w-32" />
            <div className="h-12 bg-neutral-200 rounded w-64" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-neutral-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (plan?.status === "generating") {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/review" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Plans
          </Link>
          <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
            <h2 className="font-semibold text-neutral-900 text-lg">
              Generating plan for {plan.athleteName}...
            </h2>
            <p className="text-neutral-500 text-sm mt-2">
              This usually takes 1-3 minutes. This page will update automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
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
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link href="/review" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-4 sm:mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Link>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between">
            <h1 className="font-serif text-2xl sm:text-3xl font-light text-neutral-900">
              {plan.athleteName}
            </h1>

            {/* Impersonate button */}
            <button
              onClick={handleImpersonate}
              disabled={impersonating || impersonated}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors ${
                impersonated
                  ? "bg-green-100 text-green-800"
                  : "bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-400"
              }`}
            >
              {impersonated ? (
                <>
                  <Check className="h-4 w-4" />
                  Active
                </>
              ) : impersonating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Loading...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Use Plan
                </>
              )}
            </button>
          </div>

          {/* Athlete + Goal Summary */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-6 mt-3 text-sm">
            <div className="flex items-center gap-2 text-neutral-600">
              <User className="h-4 w-4 shrink-0" />
              <span className="capitalize">{plan.athleteProfile.experience}</span>
              <span className="text-neutral-400">|</span>
              <span>{plan.athleteProfile.weeklyMileage}mi/wk</span>
              <span className="text-neutral-400">|</span>
              <span>{plan.athleteProfile.longestRun}mi longest</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Target className="h-4 w-4 shrink-0" />
              <span>{plan.raceGoal.raceDistance}</span>
              {plan.raceGoal.elevation && (
                <>
                  <span className="text-neutral-400">|</span>
                  <span>{plan.raceGoal.elevation.toLocaleString()}ft</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{plan.plan.totalWeeks} weeks</span>
            </div>
          </div>
        </div>

        {/* Scores (mobile: above weeks, desktop: sidebar) */}
        <div className="lg:hidden mb-6">
          <EvaluationScores evaluation={plan.evaluation} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left: Weekly Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                Weekly Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plan.plan.weeks.map((week) => (
                  <div key={week.weekNumber}>
                    <WeekSummaryCard
                      week={week}
                      peakMiles={peakMiles}
                      isExpanded={expandedWeek === week.weekNumber}
                      isRaceWeek={hasRaceDate && week.weekNumber === lastWeekNumber}
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

            {/* Feedback - below weeks on all screen sizes */}
            <FeedbackForm
              planId={planId}
              athleteExperience={plan.athleteProfile.experience}
              raceType={plan.raceGoal.raceDistance}
              onSubmit={handleFeedbackSubmit}
            />
          </div>

          {/* Right: Scores (desktop only - mobile is above) */}
          <div className="hidden lg:block space-y-6">
            <EvaluationScores evaluation={plan.evaluation} />
          </div>
        </div>
      </div>
    </div>
  );
}
