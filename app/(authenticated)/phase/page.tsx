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
import { useUser } from "@/lib/user-context-rtk";
import { calculateCurrentWeek } from "@/lib/plan-utils";
import { useState, useMemo, useEffect } from "react";
import { TrainingWeekSkeleton } from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/loading-spinner";

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

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        {/* Header */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <h1 className="text-2xl font-bold">Training Plan</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View week:</span>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="1">Week 1</SelectItem>
                ) : (
                  availableWeeks.map((week) => (
                    <SelectItem
                      key={week.weekNumber}
                      value={week.weekNumber.toString()}
                    >
                      Week {week.weekNumber}
                      {week.weekNumber === currentWeek && " (Current)"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Week Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Week {selectedWeek} Overview</CardTitle>
                {isLoading ? (
                  <Skeleton className="h-4 w-48 mt-2" />
                ) : (
                  <CardDescription>
                    {selectedWeekData?.phase || "Loading..."} Phase
                  </CardDescription>
                )}
              </div>
              {selectedWeek === currentWeek.toString() && (
                <Badge variant="default">Current Week</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Weekly Volume</p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <p className="font-semibold">
                      {selectedWeekData?.targetMiles || "0"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mountain className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Elevation Target</p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <p className="font-semibold">
                      {selectedWeekData?.targetVertical || "0"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Phase</p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-24" />
                  ) : (
                    <p className="font-semibold">
                      {selectedWeekData?.phase || "Base"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week's Workouts */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">This Week&apos;s Workouts</h2>
          {isLoading ? (
            <TrainingWeekSkeleton />
          ) : selectedWeekData ? (
            <div className="grid gap-4">
              {selectedWeekData.workouts.map((workout, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{workout.day}</CardTitle>
                      <Badge variant="outline">{workout.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{workout.description}</p>
                    {workout.details && workout.details.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-gray-600">
                        {workout.details.map((detail, idx) => (
                          <li key={idx}>• {detail}</li>
                        ))}
                      </ul>
                    )}
                    {workout.notes && (
                      <p className="mt-2 text-sm text-gray-600">
                        💡 {workout.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No workouts found for this week</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
