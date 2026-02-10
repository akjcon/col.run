"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, TrendingUp, Clock, ChevronRight } from "lucide-react";

interface PlanSummary {
  id: string;
  athleteName: string;
  raceGoal: {
    raceDistance: string;
    elevation?: number;
  };
  evaluation: {
    overall: number;
  };
  createdAt: number;
  generationTimeMs: number;
}

export default function ReviewListPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/review/plans");
        if (!res.ok) throw new Error("Failed to fetch plans");
        const data = await res.json();
        setPlans(data.plans);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-48" />
            <div className="h-4 bg-neutral-200 rounded w-64" />
            <div className="space-y-3 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-neutral-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-light text-neutral-900">
            Plan Reviews
          </h1>
          <p className="text-neutral-500 mt-1">
            Review and provide feedback on generated training plans
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && plans.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
            <p className="text-neutral-500">No plans generated yet.</p>
            <p className="text-sm text-neutral-400 mt-1">
              Run <code className="bg-neutral-100 px-1 rounded">npx tsx scripts/generate-sample-plan.ts</code> to create one.
            </p>
          </div>
        )}

        {/* Plans List */}
        <div className="space-y-3">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/review/${plan.id}`}
              className="block bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md hover:border-neutral-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-neutral-900 group-hover:text-neutral-700">
                      {plan.athleteName}
                    </h2>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${getScoreColor(plan.evaluation.overall)}`}>
                      {plan.evaluation.overall}%
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {plan.raceGoal.raceDistance}
                      {plan.raceGoal.elevation && ` / ${plan.raceGoal.elevation.toLocaleString()}ft`}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(plan.createdAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {(plan.generationTimeMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
