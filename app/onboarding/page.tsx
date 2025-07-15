"use client";

import React, { useState } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrainingBackground } from "@/lib/types";
import { saveTrainingBackground, updateUserProfile } from "@/lib/firestore";
import { useUser } from "@/lib/user-context-redux";

export default function OnboardingPage() {
  const { user } = useClerkUser();
  const { userId, userData, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TrainingBackground>>({
    experience: "beginner",
    weeklyMileage: 0,
    longestRun: 0,
    goals: {
      raceDistance: "",
    },
  });

  // Redirect if user has already completed onboarding
  React.useEffect(() => {
    if (!userLoading && userId && userData?.profile?.completedOnboarding) {
      router.push("/home");
    }
  }, [userLoading, userId, userData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Save training background to Firebase
      await saveTrainingBackground(
        userId,
        formData as Omit<TrainingBackground, "id" | "createdAt">
      );

      // Generate personalized training plan
      console.log("Generating personalized training plan...");
      const planResponse = await fetch("/api/generate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          trainingBackground: formData,
        }),
      });

      if (!planResponse.ok) {
        const errorData = await planResponse.json();
        throw new Error(
          errorData.details || "Failed to generate training plan"
        );
      }

      const planResult = await planResponse.json();
      console.log("Training plan generated:", planResult.planId);

      // Mark onboarding as complete
      await updateUserProfile(userId, {
        completedOnboarding: true,
      });

      console.log("Onboarding completed successfully!");

      // Redirect to main app
      router.push("/home");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save onboarding data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Card className="border shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Welcome to your Training Plan, {user.firstName}!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Let&apos;s create a personalized training plan based on your
              background and goals
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Experience Level */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Running Experience Level
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      experience: e.target.value as
                        | "beginner"
                        | "intermediate"
                        | "advanced",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="beginner">Beginner (less than 1 year)</option>
                  <option value="intermediate">Intermediate (1-3 years)</option>
                  <option value="advanced">Advanced (3+ years)</option>
                </select>
              </div>

              {/* Weekly Mileage */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Current Weekly Mileage
                </label>
                <input
                  type="number"
                  value={formData.weeklyMileage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weeklyMileage: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="25"
                  required
                />
              </div>

              {/* Longest Run */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Longest Run (miles)
                </label>
                <input
                  type="number"
                  value={formData.longestRun}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      longestRun: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="13"
                  required
                />
              </div>

              {/* Race Distance Goal */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Goal Race Distance
                </label>
                <select
                  value={formData.goals?.raceDistance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goals: {
                        ...formData.goals,
                        raceDistance: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a distance</option>
                  <option value="10K">10K</option>
                  <option value="Half Marathon">Half Marathon</option>
                  <option value="Marathon">Marathon</option>
                  <option value="50K">50K Ultra</option>
                  <option value="50 Mile">50 Mile Ultra</option>
                  <option value="100K">100K Ultra</option>
                  <option value="100 Mile">100 Mile Ultra</option>
                </select>
              </div>

              {/* Race Date */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Race Date (optional)
                </label>
                <input
                  type="date"
                  value={
                    formData.goals?.raceDate
                      ? new Date(formData.goals.raceDate)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goals: {
                        raceDistance: formData.goals?.raceDistance || "",
                        ...formData.goals,
                        raceDate: e.target.value
                          ? new Date(e.target.value).getTime()
                          : undefined,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  We&apos;ll create a plan that perfectly times your peak for
                  race day
                </p>
              </div>

              {/* Target Time */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Target Time (optional)
                </label>
                <input
                  type="text"
                  value={formData.goals?.targetTime || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goals: {
                        raceDistance: formData.goals?.raceDistance || "",
                        ...formData.goals,
                        targetTime: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Sub 4:30, 3:15, etc."
                />
              </div>

              {/* Background */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Athletic Background (optional)
                </label>
                <textarea
                  value={formData.background || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      background: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Former college soccer player, avid cyclist, Nordic skier, etc."
                />
              </div>

              {/* Injuries */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Injury History (optional)
                </label>
                <textarea
                  value={formData.injuries || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      injuries: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Any injuries or limitations we should know about?"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !userId}
                className="w-full py-3 text-lg"
              >
                {isLoading
                  ? "Generating Your Training Plan..."
                  : "Create My Training Plan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
