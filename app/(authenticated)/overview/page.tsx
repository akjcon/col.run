"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Target, TrendingUp } from "lucide-react";
import { useUser } from "@/lib/user-context-rtk";
import { Skeleton } from "@/components/ui/loading-spinner";

export default function Overview() {
  const { userData, isLoading } = useUser();

  const trainingZones =
    userData?.generatedProfile?.recommendedPlan?.zones || [];
  const trainingPhases =
    userData?.generatedProfile?.recommendedPlan?.phases || [];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Training Overview
          </h1>
          <p className="mt-2 text-gray-600">
            Your personalized training plan details
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* User Profile Card */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Athlete Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </>
              ) : (
                <>
                  <div>
                    <span className="text-sm text-gray-600">Experience:</span>
                    <p className="font-medium capitalize">
                      {userData?.trainingBackground?.experience || "Not set"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">
                      Weekly Mileage:
                    </span>
                    <p className="font-medium">
                      {userData?.trainingBackground?.weeklyMileage || 0} miles
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Goal Race:</span>
                    <p className="font-medium">
                      {userData?.trainingBackground?.goals.raceDistance ||
                        "Not set"}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Training Zones Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Training Zones
              </CardTitle>
              <CardDescription>
                Heart rate zones for optimal training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : trainingZones.length > 0 ? (
                  trainingZones.map((zone, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <span className="font-medium">{zone.zone}</span>
                        <p className="text-sm text-gray-600">
                          {zone.description}
                        </p>
                      </div>
                      <Badge variant="secondary">{zone.heartRate}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No training zones defined yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Training Phases Card */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Training Phases
              </CardTitle>
              <CardDescription>
                Progressive phases of your training plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                  <>
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                  </>
                ) : trainingPhases.length > 0 ? (
                  trainingPhases.map((phase, index) => (
                    <div
                      key={index}
                      className="rounded-lg border bg-gray-50 p-4"
                    >
                      <h4 className="font-semibold">{phase.phase}</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        Weeks {phase.weeks}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {phase.focus}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 md:col-span-2 lg:col-span-4">
                    No training phases defined yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
