"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Target, TrendingUp, Loader2 } from "lucide-react";
import { useUser } from "@/lib/user-context-rtk";

export default function Overview() {
  const { userData, isLoading } = useUser();

  if (isLoading || !userData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
          <span className="text-neutral-700">
            Loading your training overview...
          </span>
        </div>
      </div>
    );
  }

  const trainingZones = userData.generatedProfile?.recommendedPlan?.zones || [];

  const trainingPhases =
    userData.generatedProfile?.recommendedPlan?.phases || [];

  const athleteProfile = [
    ...(userData.trainingBackground?.background
      ? [
          {
            label: "Background",
            value: userData.trainingBackground.background,
          },
        ]
      : []),
    {
      label: "Current Volume",
      value: `${
        userData.trainingBackground?.weeklyMileage || "N/A"
      } miles/week`,
    },
    {
      label: "Longest Run",
      value: `${userData.trainingBackground?.longestRun || "N/A"} miles`,
    },
    ...(userData.trainingBackground?.marathonPR
      ? [
          {
            label: "Marathon PR",
            value: `${userData.trainingBackground.marathonPR}${
              userData.trainingBackground.currentFitness
                ? ` (current fitness ${userData.trainingBackground.currentFitness})`
                : ""
            }`,
          },
        ]
      : []),
    {
      label: "Goal Distance",
      value: userData.trainingBackground?.goals.raceDistance || "N/A",
    },
    ...(userData.trainingBackground?.goals.targetTime
      ? [
          {
            label: "Target Time",
            value: userData.trainingBackground.goals.targetTime,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:space-y-8 md:p-6">
        {/* Header */}
        <div className="space-y-4 py-4 text-center md:py-8">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl md:text-4xl lg:text-5xl">
            Training Overview
          </h1>
          <p className="mx-auto max-w-2xl px-4 text-base text-neutral-600 sm:text-lg md:text-xl">
            Comprehensive{" "}
            {userData.generatedProfile?.recommendedPlan?.planType || "training"}{" "}
            program tailored for your{" "}
            {userData.trainingBackground?.goals.raceDistance || "race"}
          </p>
        </div>

        {/* Athlete Profile */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50">
            <CardTitle className="flex items-center gap-2 text-neutral-900">
              <User className="h-5 w-5" />
              Athlete Profile
            </CardTitle>
            <CardDescription className="text-neutral-600">
              Your background and current fitness level
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              {athleteProfile.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between border-b border-neutral-100 py-3 last:border-b-0"
                >
                  <span className="font-medium text-neutral-800">
                    {item.label}:
                  </span>
                  <span className="max-w-[60%] text-right text-neutral-700">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coaching Notes */}
        {userData.generatedProfile?.recommendedPlan?.coachingNotes &&
          userData.generatedProfile.recommendedPlan.coachingNotes.length >
            0 && (
            <Card className="border-[#E98A15] bg-gradient-to-r from-orange-50/50 to-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Target className="mt-1 h-5 w-5 flex-shrink-0 text-[#E98A15]" />
                  <div>
                    <p className="mb-3 font-semibold text-neutral-900">
                      🏃‍♂️ Personalized Coaching Notes
                    </p>
                    <div className="space-y-3">
                      {userData.generatedProfile.recommendedPlan.coachingNotes.map(
                        (note, idx) => (
                          <p
                            key={idx}
                            className="text-sm leading-relaxed text-neutral-700"
                          >
                            {note}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Training Zones */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50">
            <CardTitle className="flex items-center gap-2 text-neutral-900">
              <Target className="h-5 w-5" />
              Training Zones
            </CardTitle>
            <CardDescription className="text-neutral-600">
              Customized heart rate zones based on your skiing background and
              threshold feel
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Zone
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Heart Rate
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Pace
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {trainingZones.map((zone, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className={`${zone.color} border text-sm font-medium`}
                        >
                          {zone.zone}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-medium text-neutral-800">
                        {zone.heartRate}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {zone.pace}
                      </td>
                      <td className="px-4 py-4 text-neutral-600">
                        {zone.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Training Phase Overview */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="border-b border-neutral-100 bg-neutral-50">
            <CardTitle className="flex items-center gap-2 text-neutral-900">
              <TrendingUp className="h-5 w-5" />
              Training Phase Overview
            </CardTitle>
            <CardDescription className="text-neutral-600">
              12-week progression from base building to race day
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Weeks
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Phase
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Weekly Miles
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Vertical
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">
                      Focus
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {trainingPhases.map((phase, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4 font-medium text-neutral-800">
                        {phase.weeks}
                      </td>
                      <td className="px-4 py-4 font-semibold text-neutral-900">
                        {phase.phase}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {phase.miles}
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {phase.vertical}
                      </td>
                      <td className="px-4 py-4 text-neutral-600">
                        {phase.focus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
