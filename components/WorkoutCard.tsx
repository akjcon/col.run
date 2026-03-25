import {
  Calendar,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkoutCompletionModal from "@/components/WorkoutCompletionModal";
import { cn } from "@/lib/utils";
import type { Day } from "@/lib/blocks/types";
import type { WorkoutLog } from "@/lib/types";
import { formatPace } from "@/lib/pace-zones";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/loading-spinner";
import {
  getDayTitle,
  getDayEffortLevel,
  effortToColor,
  effortToZoneLabel,
  effortToPaceRange,
  formatBlock,
  formatBlockWithPace,
  isRestDay,
} from "@/lib/workout-display";
import {
  calculateDayTotalMiles,
  calculateDayTotal,
} from "@/lib/blocks/calculations";
import { AskCoachButton } from "@/components/AskCoachButton";

interface WorkoutCardProps {
  todaysDay: Day | null;
  isWorkoutDone: boolean;
  isFirebaseReady: boolean;
  onWorkoutComplete: (rating: number, notes?: string) => Promise<void>;
  isLoading?: boolean;
  thresholdPace?: number;
  workoutLog?: WorkoutLog | null;
}

const ADHERENCE_CONFIG = {
  on_target: { label: "On Target", bg: "bg-green-100", text: "text-green-700" },
  over: { label: "Over", bg: "bg-amber-100", text: "text-amber-700" },
  under: { label: "Under", bg: "bg-red-100", text: "text-red-700" },
  skipped: { label: "Skipped", bg: "bg-neutral-100", text: "text-neutral-600" },
} as const;

export function WorkoutCard({
  todaysDay,
  isWorkoutDone,
  isFirebaseReady,
  onWorkoutComplete,
  isLoading = false,
  thresholdPace,
  workoutLog,
}: WorkoutCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [todaysDay, isWorkoutDone]);

  if (isLoading) {
    return (
      <div className="mx-0 rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-1/2 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-3/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!todaysDay) {
    return null;
  }

  if (isRestDay(todaysDay)) {
    return (
      <div className="mx-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 pt-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-600">
              Today
            </p>
          </div>
        </div>
        <div className="p-6 pt-3">
          <h2 className="font-serif text-3xl font-light tracking-tight text-neutral-900">
            Rest Day
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Recovery is part of the plan. Take it easy today.
          </p>
        </div>
      </div>
    );
  }

  const title = getDayTitle(todaysDay);
  const effortLevel = getDayEffortLevel(todaysDay);
  const zoneColor = effortToColor(effortLevel);
  const zoneText = effortToZoneLabel(effortLevel);
  const totalMiles = calculateDayTotalMiles(todaysDay);
  const totalMinutes = calculateDayTotal(todaysDay);

  // Get all non-rest blocks for detail display
  const allBlocks = todaysDay.workouts.flatMap((w) =>
    w.blocks.filter((b) => b.type !== "rest")
  );

  return (
    <div className="mx-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-600">
              Today&apos;s Workout
            </p>
          </div>
          {!isWorkoutDone && (
            <AskCoachButton
              context={{
                page: "home",
                trigger: "workout",
                workout: {
                  title,
                  miles: totalMiles,
                  minutes: Math.round(totalMinutes),
                  effortLevel: zoneText,
                  blocks: allBlocks.map((b) => formatBlock(b)),
                  isCompleted: isWorkoutDone,
                },
              }}
            />
          )}
        </div>
      </div>

      {/* Workout Header */}
      <div className="border-b border-neutral-100 p-6 py-4 pt-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-3xl font-light tracking-tight text-neutral-900">
            {title}
          </h2>
          {isWorkoutDone && (
            <div className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white">
              <CheckCircle2 className="h-3 w-3" />
              <span>Complete</span>
            </div>
          )}
        </div>

        {/* Zone Badge */}
        <div className="mb-2 flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: zoneColor }}
          ></div>
          <span className="text-sm font-medium uppercase tracking-wider text-neutral-900">
            {zoneText}
          </span>
          {thresholdPace && (
            <span className="text-xs font-normal normal-case tracking-normal text-neutral-500">
              {effortToPaceRange(effortLevel, thresholdPace)}
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-6">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="font-mono text-4xl font-bold tracking-tight text-neutral-900">
              {totalMiles.toFixed(1)}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
              MILES
            </div>
          </div>
          <div className="text-center">
            <div className="font-mono text-4xl font-bold tracking-tight text-neutral-900">
              {Math.round(totalMinutes)}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
              MINUTES
            </div>
          </div>
        </div>
      </div>

      {/* Coaching Feedback (from Strava analysis) */}
      {isWorkoutDone && workoutLog?.coachingNote && (
        <div className="border-b border-neutral-100 px-6 py-4">
          {/* Adherence badge + actual metrics */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {workoutLog.adherence && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ADHERENCE_CONFIG[workoutLog.adherence].bg} ${ADHERENCE_CONFIG[workoutLog.adherence].text}`}
              >
                {ADHERENCE_CONFIG[workoutLog.adherence].label}
              </span>
            )}
            {workoutLog.actualMiles != null && (
              <span className="text-xs tabular-nums text-neutral-500">
                {workoutLog.actualMiles.toFixed(1)}mi
              </span>
            )}
            {workoutLog.avgPace != null && (
              <span className="text-xs tabular-nums text-neutral-500">
                {formatPace(workoutLog.avgPace)}/mi
              </span>
            )}
            {workoutLog.avgHeartRate != null && (
              <span className="text-xs tabular-nums text-neutral-500">
                {workoutLog.avgHeartRate}bpm
              </span>
            )}
          </div>
          {/* Coaching note */}
          <p className="text-sm leading-relaxed text-neutral-600">
            {workoutLog.coachingNote}
          </p>
        </div>
      )}

      {/* Conditionally render details section */}
      <motion.div
        initial={false}
        animate={{
          height: !isWorkoutDone || showDetails ? contentHeight : 0,
          opacity: !isWorkoutDone || showDetails ? 1 : 0,
        }}
        transition={{
          height: { duration: 0.3, ease: "easeInOut" },
          opacity: { duration: 0.2, ease: "easeInOut" },
        }}
        className="overflow-hidden"
      >
        <div ref={contentRef}>
          {/* Block Details */}
          {allBlocks.length > 0 && (
            <div className="px-6 py-6">
              <div className="space-y-4">
                {allBlocks.map((block, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div
                      className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: effortToColor(block.effortLevel) }}
                    ></div>
                    <p className="text-sm leading-relaxed text-neutral-700">
                      {formatBlockWithPace(block, thresholdPace)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block notes */}
          {allBlocks.some((b) => b.notes) && (
            <div className="px-6 pb-4">
              <p className="text-sm leading-relaxed text-neutral-400">
                {allBlocks
                  .filter((b) => b.notes)
                  .map((b) => b.notes)
                  .join(" ")}
              </p>
            </div>
          )}

          {/* Action Button - Only show when workout not done */}
          {!isWorkoutDone && (
            <div className="px-6 pb-6">
              <WorkoutCompletionModal
                onSubmit={onWorkoutComplete}
                workoutType={title}
                trigger={
                  <Button
                    className=" w-full rounded-xl border-0 bg-neutral-900 py-4 text-sm font-medium uppercase tracking-wider text-white transition-all duration-200 hover:bg-neutral-800"
                    disabled={!isFirebaseReady}
                  >
                    {isFirebaseReady ? "Mark Complete" : "Loading..."}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Show Details Button - At the bottom when workout is done */}
      {isWorkoutDone && (
        <motion.div
          className={cn(showDetails && "border-t border-neutral-100")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex w-full items-center justify-center gap-2 py-4 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
          >
            {showDetails ? (
              <>
                <span>Hide Details</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Show Details</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
