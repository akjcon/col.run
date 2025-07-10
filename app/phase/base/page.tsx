"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mountain, TrendingUp, Activity } from "lucide-react";
import { useUser } from "@/lib/user-context";

export default function BasePhase() {
  const { userData, isLoading } = useUser();

  if (isLoading || !userData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const getZoneColor = (zone: string) => {
    if (zone.includes("1") || zone === "Recovery")
      return "bg-slate-100 text-slate-700 border-slate-200";
    if (zone.includes("2")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (zone.includes("3"))
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (zone.includes("4"))
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (zone.includes("5")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-600 border-gray-200";
  };

  // Get the first week's workouts (Base phase)
  const basePhaseWeek = userData.generatedProfile?.recommendedPlan?.weeks?.[0];
  const workouts = basePhaseWeek?.workouts || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold text-gray-900">
            {basePhaseWeek
              ? `Week ${basePhaseWeek.weekNumber}: ${basePhaseWeek.phase} Phase`
              : "Base Phase"}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {userData.generatedProfile?.aiAnalysis ||
              "Customized training based on your background and goals"}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {basePhaseWeek?.targetMiles || "TBD"} miles/week
            </span>
            <span className="flex items-center gap-2">
              <Mountain className="h-4 w-4" />
              {basePhaseWeek?.targetVertical || "TBD"} vertical
            </span>
          </div>
        </div>

        {/* Weekly Schedule */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Weekly Schedule Template
            </CardTitle>
            <CardDescription className="text-gray-600">
              Optimized for athletes with strong aerobic development - more Z2
              work and early intensity
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {workouts.map((workout, idx) => (
                <div
                  key={idx}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="min-w-[80px]">
                          <p className="font-semibold text-gray-900">
                            {workout.day}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getZoneColor(
                            workout.zone
                          )} border text-xs`}
                        >
                          {workout.zone}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900">
                            {workout.type}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-2">
                        {workout.description}
                      </p>

                      {workout.details && (
                        <ul className="space-y-1 text-sm text-gray-600 mb-2">
                          {workout.details.map((detail, detailIdx) => (
                            <li key={detailIdx}>• {detail}</li>
                          ))}
                        </ul>
                      )}

                      {workout.notes && (
                        <p className="text-sm text-gray-500 italic">
                          {workout.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Totals */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gray-900">
                {basePhaseWeek?.targetMiles || "TBD"}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Miles per week
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gray-900">
                {basePhaseWeek?.targetVertical || "TBD"}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Vertical per week
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Coaching Notes */}
        {userData.generatedProfile?.recommendedPlan?.coachingNotes &&
          userData.generatedProfile.recommendedPlan.coachingNotes.length >
            0 && (
            <Card className="border shadow-sm bg-green-50 border-green-200">
              <CardHeader className="border-b border-green-200">
                <CardTitle className="text-green-900">
                  🎯 Personalized Coaching Notes
                </CardTitle>
                <CardDescription className="text-green-700">
                  Plan customized based on your background and goals
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {userData.generatedProfile.recommendedPlan.coachingNotes.map(
                    (note, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-green-800">{note}</p>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Key Focus Points */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">Key Focus Points</CardTitle>
            <CardDescription className="text-gray-600">
              Essential principles for this phase
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Build aerobic base with Z1/Z2 mix (strong aerobic
                    development from skiing)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Establish strength training routine 2x per week
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Practice nutrition strategies during longer runs
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Focus on running form and efficiency
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Listen to your body and prioritize recovery
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Build consistent training habits and routines
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
