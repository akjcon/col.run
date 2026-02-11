"use client";

import React, { useState, useCallback } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context-rtk";
import {
  useSaveTrainingBackgroundMutation,
  useUpdateUserProfileMutation,
} from "@/lib/store/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface GoalData {
  type: "race" | "general";
  raceDistance?: string;
  raceDate?: number;
  elevation?: number;
  description?: string;
}

interface FitnessData {
  source: "strava" | "manual";
  experience?: "beginner" | "intermediate" | "advanced";
  weeklyMileage?: number;
  longestRun?: number;
  stravaConnected?: boolean;
  stravaSynced?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const easeOutQuad: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const DISTANCE_OPTIONS = [
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half", label: "Half Marathon" },
  { value: "marathon", label: "Marathon" },
  { value: "50k", label: "50K Ultra" },
  { value: "50mi", label: "50 Mile Ultra" },
  { value: "100k", label: "100K Ultra" },
  { value: "100mi", label: "100 Mile Ultra" },
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner (<1 year)" },
  { value: "intermediate", label: "Intermediate (1-3 years)" },
  { value: "advanced", label: "Advanced (3+ years)" },
];

// =============================================================================
// Shared Components
// =============================================================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        return (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-300 ease-out",
              stepNum < current && "w-8 bg-neutral-900",
              stepNum === current && "w-8 bg-neutral-400",
              stepNum > current && "w-4 bg-neutral-200"
            )}
          />
        );
      })}
    </div>
  );
}

function SelectionCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-xl p-5 text-left transition-colors duration-150 ease",
        selected ? "bg-neutral-900 text-white" : "bg-neutral-50 text-neutral-900"
      )}
      style={{
        boxShadow: selected ? "none" : "0 0 0 1px rgba(0, 0, 0, 0.06)",
        touchAction: "manipulation",
      }}
    >
      <div className={cn("mb-2.5", selected ? "text-white" : "text-neutral-400")}>
        {icon}
      </div>
      <div className="text-[15px] font-medium">{title}</div>
      <div
        className={cn(
          "mt-0.5 text-[13px] leading-snug",
          selected ? "text-neutral-400" : "text-neutral-500"
        )}
      >
        {description}
      </div>
    </button>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const LOADING_MESSAGES = [
  "Running simulations...",
  "Analyzing your fitness...",
  "Calculating optimal mileage...",
  "Mapping out recovery days...",
  "Fine-tuning interval paces...",
  "Consulting the coaching gods...",
  "Building your base phase...",
  "Sprinkling in tempo runs...",
  "Checking the altitude charts...",
  "Lacing up virtual shoes...",
  "Calibrating effort zones...",
  "Almost there...",
];

function PlanLoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* Pulsing dot */}
      <div className="mb-8">
        <motion.div
          className="h-3 w-3 rounded-full bg-neutral-900"
          animate={shouldReduceMotion ? {} : { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Rotating message */}
      <div className="h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: easeOutQuad }}
            className="text-[15px] text-neutral-500"
          >
            {LOADING_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// Step 1: Goal Selection
// =============================================================================

function GoalStep({
  data,
  onChange,
  onNext,
}: {
  data: GoalData;
  onChange: (data: GoalData) => void;
  onNext: () => void;
}) {
  const [goalType, setGoalType] = useState<"race" | "general" | null>(
    data.type || null
  );
  const [dateOpen, setDateOpen] = useState(false);

  const canProceed =
    goalType === "race"
      ? data.raceDistance && data.raceDate
      : goalType === "general"
      ? data.description && data.description.trim().length > 0
      : false;

  const selectedDate = data.raceDate ? new Date(data.raceDate) : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h1
          className="text-[26px] font-semibold tracking-tight text-neutral-900"
          style={{ textWrap: "balance" }}
        >
          What are you training for?
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500">
          This helps us create the right plan for your goals
        </p>
      </div>

      {/* Goal Type Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SelectionCard
          selected={goalType === "race"}
          onClick={() => {
            setGoalType("race");
            onChange({ ...data, type: "race" });
          }}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" x2="4" y1="22" y2="15" />
            </svg>
          }
          title="Training for a race"
          description="I have a specific event"
        />

        <SelectionCard
          selected={goalType === "general"}
          onClick={() => {
            setGoalType("general");
            onChange({ ...data, type: "general" });
          }}
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
          title="General fitness"
          description="Improve my running overall"
        />
      </div>

      {/* Conditional Fields */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {goalType === "race" && (
            <motion.div
              key="race-fields"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: easeOutQuad }}
              className="space-y-4"
            >
              {/* Distance + Date side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-neutral-500">
                    Distance
                  </Label>
                  <Select
                    value={data.raceDistance || ""}
                    onValueChange={(value) =>
                      onChange({ ...data, raceDistance: value })
                    }
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTANCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] text-neutral-500">Race Date</Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? formatDate(selectedDate) : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                      <Calendar
                        className="w-[310px] [--cell-size:2.75rem]"
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          onChange({
                            ...data,
                            raceDate: date ? date.getTime() : undefined,
                          });
                          setDateOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="elevation" className="text-[13px] text-neutral-500">
                  Elevation gain in feet (optional)
                </Label>
                <Input
                  id="elevation"
                  type="number"
                  value={data.elevation || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      elevation: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g., 5000"
                  className="h-10"
                />
              </div>
            </motion.div>
          )}

          {goalType === "general" && (
            <motion.div
              key="general-fields"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: easeOutQuad }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="goals-description" className="text-[13px] text-neutral-500">
                  Describe your goals
                </Label>
                <Textarea
                  id="goals-description"
                  value={data.description || ""}
                  onChange={(e) =>
                    onChange({ ...data, description: e.target.value })
                  }
                  rows={3}
                  placeholder="e.g., Build my aerobic base, run 4-5 days a week..."
                  className="resize-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Next Button — pinned at bottom */}
      <div className="mt-auto pt-6">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full h-12 rounded-xl bg-neutral-900 text-[15px] font-medium text-white hover:bg-neutral-800"
          style={{ touchAction: "manipulation" }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Step 2: Fitness Data
// =============================================================================

function FitnessStep({
  data,
  onChange,
  onBack,
  onSubmit,
  isSubmitting,
  goalData,
}: {
  data: FitnessData;
  onChange: (data: FitnessData) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  goalData: GoalData;
}) {
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);

  const handleConnectStrava = async () => {
    setConnectingStrava(true);
    setStravaError(null);

    try {
      // Persist goal data before navigating away for OAuth
      sessionStorage.setItem("onboarding_goal", JSON.stringify(goalData));

      const response = await fetch(
        "/api/v2/strava/connect?returnTo=onboarding"
      );
      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "No authorization URL returned");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Strava connect error:", err);
      setStravaError("Failed to connect to Strava. Please try again.");
      setConnectingStrava(false);
    }
  };

  const canSubmit =
    data.source === "strava"
      ? data.stravaConnected
      : data.experience &&
        data.weeklyMileage !== undefined &&
        data.longestRun !== undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h1
          className="text-[26px] font-semibold tracking-tight text-neutral-900"
          style={{ textWrap: "balance" }}
        >
          Tell us about your fitness
        </h1>
        <p className="mt-1.5 text-[15px] text-neutral-500">
          Connect Strava for accurate data, or enter manually
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {/* Strava Option */}
        <div
          className="rounded-xl p-4"
          style={{
            boxShadow:
              data.source === "strava"
                ? "0 0 0 2px #000"
                : "0 0 0 1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 64 64" fill="none">
                <path
                  d="M41.03 47.852l-5.572-10.976h-8.172L41.03 64l13.736-27.124h-8.18"
                  fill="#f9b797"
                />
                <path
                  d="M27.898 21.944l7.564 14.928h11.124L27.898 0 9.23 36.872H20.35"
                  fill="#f05222"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-neutral-900">
                Connect Strava
              </div>
              <p className="mt-0.5 text-[13px] text-neutral-500 leading-snug">
                We&apos;ll analyze your activities for a tailored plan
              </p>

              {data.stravaConnected ? (
                <div className="mt-2 flex items-center gap-1.5 text-neutral-900">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-[13px] font-medium">Connected</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...data, source: "strava" });
                    handleConnectStrava();
                  }}
                  aria-label="Connect to Strava"
                  disabled={connectingStrava}
                  className="mt-2.5 rounded-lg bg-[#FC4C02] px-3.5 py-2 text-[13px] font-medium text-white transition-opacity duration-150 ease hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  style={{ touchAction: "manipulation" }}
                >
                  {connectingStrava ? "Connecting..." : "Connect Strava"}
                </button>
              )}

              {stravaError && (
                <p className="mt-2 text-[13px] text-red-600">{stravaError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-[13px] text-neutral-300">
              or
            </span>
          </div>
        </div>

        {/* Manual Entry Option */}
        <button
          type="button"
          onClick={() =>
            onChange({ ...data, source: "manual", stravaConnected: false })
          }
          className="w-full rounded-xl p-4 text-left transition-colors duration-150 ease"
          style={{
            boxShadow:
              data.source === "manual"
                ? "0 0 0 2px #000"
                : "0 0 0 1px rgba(0, 0, 0, 0.06)",
            touchAction: "manipulation",
          }}
        >
          <div className="text-[15px] font-medium text-neutral-900">
            Enter manually
          </div>
          <div className="mt-0.5 text-[13px] text-neutral-500">
            I&apos;ll provide my training info
          </div>
        </button>

        {/* Manual Entry Form */}
        <AnimatePresence>
          {data.source === "manual" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: easeOutQuad }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-neutral-500">
                    Experience
                  </Label>
                  <Select
                    value={data.experience || ""}
                    onValueChange={(value) =>
                      onChange({
                        ...data,
                        experience: value as "beginner" | "intermediate" | "advanced",
                      })
                    }
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="weekly-mileage" className="text-[13px] text-neutral-500">
                      Weekly miles
                    </Label>
                    <Input
                      id="weekly-mileage"
                      type="number"
                      value={data.weeklyMileage ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...data,
                          weeklyMileage: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="e.g., 25"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="longest-run" className="text-[13px] text-neutral-500">
                      Longest run (mi)
                    </Label>
                    <Input
                      id="longest-run"
                      type="number"
                      value={data.longestRun ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...data,
                          longestRun: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="e.g., 13"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation — pinned at bottom */}
      <div className="mt-auto flex gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12 rounded-xl px-5 text-[15px] font-medium"
          style={{ touchAction: "manipulation" }}
        >
          Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 h-12 rounded-xl bg-neutral-900 text-[15px] font-medium text-white hover:bg-neutral-800"
          style={{ touchAction: "manipulation" }}
        >
          {isSubmitting ? "Building your plan..." : "Create My Plan"}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Onboarding Page
// =============================================================================

export default function OnboardingPage() {
  const { user } = useClerkUser();
  const { userId, userData, isLoading: userLoading } = useUser();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goalData, setGoalData] = useState<GoalData>({ type: "race" });
  const [fitnessData, setFitnessData] = useState<FitnessData>({
    source: "strava",
  });

  const [saveTrainingBackground] = useSaveTrainingBackgroundMutation();
  const [updateUserProfile] = useUpdateUserProfileMutation();

  // Detect Strava callback SYNCHRONOUSLY during render (before any effects).
  // This ref is initialized once in the component body so it's available
  // immediately when effects run — no race condition with the redirect effect.
  const isStravaCallback = React.useRef<boolean | null>(null);
  if (isStravaCallback.current === null) {
    isStravaCallback.current =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("strava_connected") === "true";
  }

  // Handle Strava callback — restore goal data, mark connected, advance to step 2
  React.useEffect(() => {
    if (!isStravaCallback.current) return;

    const saved = sessionStorage.getItem("onboarding_goal");
    if (saved) {
      try {
        setGoalData(JSON.parse(saved));
      } catch { /* ignore */ }
      sessionStorage.removeItem("onboarding_goal");
    }

    setFitnessData((prev) => ({
      ...prev,
      source: "strava",
      stravaConnected: true,
    }));
    setStep(2);
    window.history.replaceState({}, "", "/onboarding");
  }, []);

  // Redirect if user has already completed onboarding (skip during Strava callback)
  React.useEffect(() => {
    if (isStravaCallback.current) return;
    if (!userLoading && userId && userData?.profile?.completedOnboarding) {
      router.push("/home");
    }
  }, [userLoading, userId, userData, router]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const trainingBackground = {
        experience: fitnessData.experience || "intermediate",
        weeklyMileage: fitnessData.weeklyMileage || 0,
        longestRun: fitnessData.longestRun || 0,
        goals:
          goalData.type === "race"
            ? {
                raceDistance: goalData.raceDistance || "",
                raceDate: goalData.raceDate,
                elevation: goalData.elevation,
              }
            : {
                raceDistance: "general",
                description: goalData.description,
              },
        fitnessSource: fitnessData.source,
        stravaConnected: fitnessData.stravaConnected || false,
      };

      await saveTrainingBackground({
        userId,
        background: trainingBackground,
      }).unwrap();

      const planResponse = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          trainingBackground,
        }),
      });

      if (!planResponse.ok) {
        const errorData = await planResponse.json();
        throw new Error(
          errorData.details || "Failed to generate training plan"
        );
      }

      await updateUserProfile({
        userId,
        updates: { completedOnboarding: true },
      }).unwrap();

      router.push("/home");
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    userId,
    goalData,
    fitnessData,
    saveTrainingBackground,
    updateUserProfile,
    router,
  ]);

  if (!user) {
    return <LoadingSpinner />;
  }

  if (isSubmitting) {
    return <PlanLoadingScreen />;
  }

  const stepVariants = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 16 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -16 },
      };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pt-10 pb-8">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-between">
          <StepIndicator current={step} total={2} />
          <span
            className="text-[13px] text-neutral-300"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {step} of 2
          </span>
        </div>

        {/* Steps — fills remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                className="flex-1 flex flex-col"
                {...stepVariants}
                transition={{ duration: 0.2, ease: easeOutQuad }}
              >
                <GoalStep
                  data={goalData}
                  onChange={setGoalData}
                  onNext={() => setStep(2)}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step-2"
                className="flex-1 flex flex-col"
                {...stepVariants}
                transition={{ duration: 0.2, ease: easeOutQuad }}
              >
                <FitnessStep
                  data={fitnessData}
                  onChange={setFitnessData}
                  onBack={() => setStep(1)}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                  goalData={goalData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error feedback */}
        <AnimatePresence>
          {error && !isSubmitting && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-4 rounded-xl bg-red-50 p-3.5"
              style={{ boxShadow: "0 0 0 1px rgba(220, 38, 38, 0.08)" }}
            >
              <p className="text-[13px] text-red-600">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
