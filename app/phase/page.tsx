"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mountain, TrendingUp, Activity } from "lucide-react";
import { useUser } from "@/lib/user-context-redux";
import { calculateCurrentWeek } from "@/lib/plan-utils";
import { useState, useMemo, useEffect } from "react";

export default function TrainingPlanPage() {
  const { userData, isLoading } = useUser();

  // Calculate current week properly using the same logic as dashboard
  const currentWeek = userData?.generatedProfile?.recommendedPlan?.startDate
    ? calculateCurrentWeek(
        userData.generatedProfile.recommendedPlan.startDate,
        userData.generatedProfile.recommendedPlan.totalWeeks || 12
      )
    : userData?.generatedProfile?.recommendedPlan?.generatedAt
      ? calculateCurrentWeek(
          userData.generatedProfile.recommendedPlan.generatedAt,
          userData.generatedProfile.recommendedPlan.totalWeeks || 12
        )
      : 1;

  const [selectedWeek, setSelectedWeek] = useState<string>(
    currentWeek.toString()
  );

  // Update selectedWeek when currentWeek changes
  useEffect(() => {
    setSelectedWeek(currentWeek.toString());
  }, [currentWeek]);

  // Get all available weeks from the plan
  const availableWeeks = useMemo(() => {
    return userData?.generatedProfile?.recommendedPlan?.weeks || [];
  }, [userData]);

  // Get the selected week's data
  const selectedWeekData = useMemo(() => {
    const weekNumber = parseInt(selectedWeek);
    return availableWeeks.find((week) => week.weekNumber === weekNumber);
  }, [selectedWeek, availableWeeks]);

  if (isLoading || !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        Loading...
      </div>
    );
  }

  const getZoneColor = (zone: string) => {
    if (zone.includes("1") || zone === "Recovery")
      return "bg-neutral-100 text-neutral-700 border-neutral-200";
    if (zone.includes("2"))
      return "bg-neutral-200 text-neutral-800 border-neutral-300";
    if (zone.includes("3"))
      return "bg-neutral-400 text-white border-neutral-500";
    if (zone.includes("4"))
      return "bg-neutral-600 text-white border-neutral-700";
    if (zone.includes("5"))
      return "bg-neutral-900 text-white border-neutral-900";
    return "bg-neutral-100 text-neutral-600 border-neutral-200";
  };

  const workouts = selectedWeekData?.workouts || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        {/* Header */}
        <div className="space-y-4 py-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900">
            Training Plan
          </h1>
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-neutral-600">
            {userData.generatedProfile?.aiAnalysis ||
              "Customized training based on your background and goals"}
          </p>
        </div>

        {/* Week Picker */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <label
            htmlFor="week-select"
            className="text-lg font-medium text-neutral-700 whitespace-nowrap"
          >
            Select Week:
          </label>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-full sm:w-80 md:w-96 bg-white border border-neutral-300 shadow-sm">
              <SelectValue placeholder="Select a week" />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              {availableWeeks.map((week) => (
                <SelectItem
                  key={week.weekNumber}
                  value={week.weekNumber.toString()}
                >
                  <span className="text-sm sm:text-base">
                    Week {week.weekNumber}: {week.phase} Phase
                    {week.weekNumber === currentWeek && " (Current)"}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Week Info */}
        {selectedWeekData && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-neutral-500">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {selectedWeekData.targetMiles || "TBD"} miles/week
            </span>
            <span className="flex items-center gap-2">
              <Mountain className="h-4 w-4" />
              {selectedWeekData.targetVertical || "TBD"} vertical
            </span>
          </div>
        )}

        {/* Weekly Schedule */}
        <Card className="border border-neutral-200 shadow-sm">
          <CardHeader className="border-b border-neutral-200 bg-neutral-50">
            <CardTitle className="text-neutral-900">
              {selectedWeekData
                ? `Week ${selectedWeekData.weekNumber}: ${selectedWeekData.phase} Phase`
                : "Weekly Schedule"}
            </CardTitle>
            <CardDescription className="text-neutral-600">
              Customized training for this week
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {workouts.length > 0 ? (
              <div className="divide-y divide-neutral-200">
                {workouts.map((workout, idx) => (
                  <div
                    key={idx}
                    className="p-4 md:p-6 transition-colors hover:bg-neutral-50"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="min-w-[80px]">
                          <p className="font-semibold text-neutral-900">
                            {workout.day}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <Badge
                            variant="outline"
                            className={`${getZoneColor(
                              workout.zone
                            )} border text-xs`}
                          >
                            {workout.zone}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-neutral-600" />
                            <span className="font-medium text-neutral-900 text-sm sm:text-base">
                              {workout.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-neutral-700">
                          {workout.description}
                        </p>

                        {workout.details && (
                          <ul className="space-y-1 text-sm text-neutral-600">
                            {workout.details.map((detail, detailIdx) => (
                              <li key={detailIdx}>• {detail}</li>
                            ))}
                          </ul>
                        )}

                        {workout.notes && (
                          <p className="text-sm italic text-neutral-500">
                            {workout.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-neutral-500">
                No workouts available for this week
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Totals */}
        {selectedWeekData && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
            <Card className="border border-neutral-200 shadow-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl md:text-3xl font-bold text-neutral-900">
                  {selectedWeekData.targetMiles || "TBD"}
                </CardTitle>
                <CardDescription className="text-neutral-600">
                  Miles per week
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border border-neutral-200 shadow-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl md:text-3xl font-bold text-neutral-900">
                  {selectedWeekData.targetVertical || "TBD"}
                </CardTitle>
                <CardDescription className="text-neutral-600">
                  Vertical per week
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Coaching Notes */}
        {userData.generatedProfile?.recommendedPlan?.coachingNotes &&
          userData.generatedProfile.recommendedPlan.coachingNotes.length >
            0 && (
            <Card className="border border-orange-200 bg-orange-50 shadow-sm">
              <CardHeader className="border-b border-orange-200">
                <CardTitle className="text-orange-900">
                  🎯 Personalized Coaching Notes
                </CardTitle>
                <CardDescription className="text-orange-700">
                  Plan customized based on your background and goals
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {userData.generatedProfile.recommendedPlan.coachingNotes.map(
                    (note, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-600"></div>
                        <p className="text-orange-800">{note}</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Key Focus Points for Current Phase */}
        {selectedWeekData && (
          <Card className="border border-neutral-200 shadow-sm">
            <CardHeader className="border-b border-neutral-200 bg-neutral-50">
              <CardTitle className="text-neutral-900">
                Key Focus Points - {selectedWeekData.phase} Phase
              </CardTitle>
              <CardDescription className="text-neutral-600">
                Essential principles for this training phase
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {selectedWeekData.phase.includes("Base") && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Build aerobic base with Z1/Z2 mix
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Establish strength training routine
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Practice nutrition strategies during longer runs
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Focus on running form and efficiency
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Listen to your body and prioritize recovery
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Build consistent training habits
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {selectedWeekData.phase.includes("Intensity") && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Introduce Zone 3 threshold work
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Add muscular endurance training
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Maintain aerobic base with Z1/Z2 runs
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Practice race-pace efforts
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Focus on recovery between hard sessions
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Increase weekly vertical gain
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {selectedWeekData.phase.includes("Race") && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Race-specific intensity work
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Practice all race-day logistics
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Fine-tune nutrition and hydration
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Mental preparation and visualization
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Maintain fitness while staying fresh
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Build confidence through simulation
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {selectedWeekData.phase.includes("Taper") && (
                  <div className="col-span-full">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Reduce volume while maintaining intensity
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Prioritize sleep and recovery
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Finalize race-day preparations
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600"></div>
                        <p className="text-neutral-700">
                          Stay mentally focused and confident
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
