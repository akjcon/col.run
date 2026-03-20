"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  ChevronRight,
  Shuffle,
  Loader2,
  Settings2,
  Plus,
  X,
  RotateCcw,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  status?: "generating" | "complete" | "error";
}

const RACE_OPTIONS = ["5k", "10k", "half", "marathon", "50k", "50mi", "100k", "100mi"];
const EXPERIENCE_OPTIONS = ["beginner", "intermediate", "advanced"];

export default function ReviewListPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom form state
  const [customName, setCustomName] = useState("");
  const [customExperience, setCustomExperience] = useState("intermediate");
  const [customMileage, setCustomMileage] = useState("25");
  const [customLongestRun, setCustomLongestRun] = useState("10");
  const [customThresholdMin, setCustomThresholdMin] = useState("");
  const [customThresholdSec, setCustomThresholdSec] = useState("");
  const [customRaceDistance, setCustomRaceDistance] = useState("marathon");
  const [customRaceDate, setCustomRaceDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [customElevation, setCustomElevation] = useState("");
  const [customTerrain, setCustomTerrain] = useState("trail");

  const fetchPlans = async () => {
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
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Poll while any plans are generating
  useEffect(() => {
    const hasGenerating = plans.some((p) => p.status === "generating");
    if (!hasGenerating) return;

    const interval = setInterval(fetchPlans, 5000);
    return () => clearInterval(interval);
  }, [plans]);

  const handleGenerate = async (customBody?: Record<string, unknown>) => {
    setGenerating(true);
    setError(null);
    setShowCustomForm(false);
    try {
      const res = await fetch("/api/review/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customBody || {}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate plan");
      }
      // Plan is now generating in the background — refresh the list to show it
      await fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build threshold pace as decimal min/mile
    let thresholdPace: number | undefined;
    if (customThresholdMin) {
      thresholdPace = parseInt(customThresholdMin) + (parseInt(customThresholdSec || "0") / 60);
    }

    const raceDate = customRaceDate ? customRaceDate.getTime() : undefined;

    handleGenerate({
      name: customName || "Custom Athlete",
      experience: customExperience,
      weeklyMileage: parseInt(customMileage) || 25,
      longestRun: parseInt(customLongestRun) || 10,
      thresholdPace,
      raceDistance: customRaceDistance,
      raceDate,
      weeksUntilRace: raceDate ? undefined : 16,
      elevation: customElevation ? parseInt(customElevation) : undefined,
      terrainType: customTerrain,
    });
  };

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
      <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
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
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-light text-neutral-900">
              Plan Reviews
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Review and provide feedback on generated training plans
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Checklist */}
            <Link
              href="/review/checklist"
              className="flex items-center gap-2 px-3 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </Link>

            {/* Custom Plan */}
            <button
              onClick={() => setShowCustomForm(!showCustomForm)}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
            >
              {showCustomForm ? (
                <X className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Custom</span>
            </button>

            {/* Generate Random Plan */}
            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors shrink-0"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Shuffle className="h-4 w-4" />
                  <span className="hidden sm:inline">Random</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Form */}
        {showCustomForm && !generating && (
          <form
            onSubmit={handleCustomSubmit}
            className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-6 mb-6 space-y-4"
          >
            <h3 className="font-semibold text-neutral-900">Custom Athlete</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Fast Beginner Marathon"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Experience
                </label>
                <select
                  value={customExperience}
                  onChange={(e) => setCustomExperience(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                >
                  {EXPERIENCE_OPTIONS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Race Distance
                </label>
                <select
                  value={customRaceDistance}
                  onChange={(e) => setCustomRaceDistance(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                >
                  {RACE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Weekly Mileage
                </label>
                <input
                  type="number"
                  value={customMileage}
                  onChange={(e) => setCustomMileage(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Longest Run (mi)
                </label>
                <input
                  type="number"
                  value={customLongestRun}
                  onChange={(e) => setCustomLongestRun(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Threshold Pace (optional)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={customThresholdMin}
                    onChange={(e) => setCustomThresholdMin(e.target.value)}
                    placeholder="min"
                    min="4"
                    max="20"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                  <span className="text-neutral-400">:</span>
                  <input
                    type="number"
                    value={customThresholdSec}
                    onChange={(e) => setCustomThresholdSec(e.target.value)}
                    placeholder="sec"
                    min="0"
                    max="59"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                  <span className="text-xs text-neutral-400 shrink-0">/mi</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Race Date
                </label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal text-sm",
                        !customRaceDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customRaceDate
                        ? customRaceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                    <Calendar
                      className="w-[310px] [--cell-size:2.75rem]"
                      mode="single"
                      selected={customRaceDate}
                      onSelect={(date) => {
                        setCustomRaceDate(date);
                        setDatePickerOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Elevation (ft, optional)
                </label>
                <input
                  type="number"
                  value={customElevation}
                  onChange={(e) => setCustomElevation(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Terrain
                </label>
                <select
                  value={customTerrain}
                  onChange={(e) => setCustomTerrain(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                >
                  <option value="road">Road</option>
                  <option value="trail">Trail</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Generate Plan
            </button>
          </form>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!error && plans.length === 0 && !generating && (
          <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
            <p className="text-neutral-500">No plans generated yet.</p>
            <button
              onClick={() => handleGenerate()}
              className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800"
            >
              Generate Your First Plan
            </button>
          </div>
        )}

        {/* Plans List */}
        <div className="space-y-3">
          {plans.map((plan) => {
            const isGenerating = plan.status === "generating";
            const isError = plan.status === "error";

            if (isGenerating) {
              return (
                <div
                  key={plan.id}
                  className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-400 shrink-0" />
                    <div>
                      <h2 className="font-semibold text-neutral-900">
                        {plan.athleteName}
                      </h2>
                      <p className="text-sm text-neutral-400 mt-1">
                        Generating plan for {plan.raceGoal?.raceDistance || "unknown race"}...
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            if (isError) {
              return (
                <div
                  key={plan.id}
                  className="bg-white border border-red-200 rounded-xl p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-neutral-900">
                        {plan.athleteName}
                      </h2>
                      <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        Failed
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/review/retry", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ planId: plan.id }),
                          });
                          if (!res.ok) throw new Error("Retry failed");
                          await fetchPlans();
                        } catch {
                          setError("Retry failed");
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={plan.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-neutral-300 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/review/${plan.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <h2 className="font-semibold text-neutral-900 group-hover:text-neutral-700 truncate">
                        {plan.athleteName}
                      </h2>
                      <span
                        className={`text-sm font-medium px-2 py-0.5 rounded-full shrink-0 ${getScoreColor(plan.evaluation.overall)}`}
                      >
                        {plan.evaluation.overall}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-neutral-500">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {plan.raceGoal?.raceDistance}
                        {plan.raceGoal?.elevation &&
                          ` / ${plan.raceGoal.elevation.toLocaleString()}ft`}
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {formatDate(plan.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {(plan.generationTimeMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch("/api/review/regenerate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ planId: plan.id }),
                          });
                          if (!res.ok) throw new Error("Regenerate failed");
                          await fetchPlans();
                        } catch {
                          setError("Regenerate failed");
                        }
                      }}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                      title="Regenerate with same inputs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <Link href={`/review/${plan.id}`}>
                      <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
