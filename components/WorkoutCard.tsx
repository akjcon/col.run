import {
  Calendar,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkoutCompletionModal from "@/components/WorkoutCompletionModal";
import { getZoneColor, getZoneText, extractWorkoutMetrics } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Workout } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface WorkoutCardProps {
  todaysWorkout: Workout | null;
  isWorkoutDone: boolean;
  isFirebaseReady: boolean;
  onWorkoutComplete: (rating: number, notes?: string) => Promise<void>;
}

export function WorkoutCard({
  todaysWorkout,
  isWorkoutDone,
  isFirebaseReady,
  onWorkoutComplete,
}: WorkoutCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [todaysWorkout, isWorkoutDone]);

  if (!todaysWorkout) {
    // Rest Day Design
    return null;
  }

  const metrics = extractWorkoutMetrics(todaysWorkout);
  const zoneColor = getZoneColor(todaysWorkout.zone);

  return (
    <div className="mx-4 md:mr-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-neutral-600" />
            <p className="text-sm font-medium text-neutral-600">
              Today&apos;s Workout
            </p>
          </div>
        </div>
      </div>

      {/* Workout Header */}
      <div className="border-b border-neutral-100 p-6 py-4 pt-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-3xl font-light tracking-tight text-neutral-900">
            {todaysWorkout.type}
          </h2>
          {isWorkoutDone && (
            <div className="flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white">
              <CheckCircle2 className="h-3 w-3" />
              <span>Complete</span>
            </div>
          )}
        </div>

        {/* Zone Badge */}
        {todaysWorkout.zone && (
          <div className="mb-2 flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: zoneColor }}
            ></div>
            <span className="text-sm font-medium uppercase tracking-wider text-neutral-900">
              {getZoneText(todaysWorkout.zone)}
            </span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      {(metrics.distance || metrics.vertical) && (
        <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-6">
          <div
            className={cn(
              "grid gap-8",
              metrics.distance && metrics.vertical
                ? "grid-cols-2"
                : "grid-cols-1"
            )}
          >
            {metrics.distance && (
              <div className="text-center">
                <div className="font-mono text-4xl font-bold tracking-tight text-neutral-900">
                  {metrics.distance}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  MILES
                </div>
              </div>
            )}
            {metrics.vertical && (
              <div className="text-center">
                <div className="font-mono text-4xl font-bold tracking-tight text-neutral-900">
                  {metrics.vertical.replace(/,/g, "")}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  FEET
                </div>
              </div>
            )}
          </div>
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
          {/* Workout Description */}
          {todaysWorkout.description && (
            <div className="px-6 py-6">
              <p className="leading-relaxed text-neutral-800">
                {todaysWorkout.description}
              </p>
            </div>
          )}

          {/* Detailed Instructions */}
          {todaysWorkout.details && todaysWorkout.details.length > 0 && (
            <div className="px-6 pb-6">
              <div className="space-y-4">
                {todaysWorkout.details.map((detail: string, index: number) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-900"></div>
                    <p className="text-sm leading-relaxed text-neutral-700">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coach Notes */}
          {todaysWorkout.notes && (
            <div className="px-6 pb-6">
              <div className="rounded-xl bg-neutral-900 p-5 text-white">
                <div className="flex items-start gap-3">
                  <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-300">
                      Coach Notes
                    </p>
                    <p className="text-sm leading-relaxed">
                      {todaysWorkout.notes}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button - Only show when workout not done */}
          {!isWorkoutDone && (
            <div className="px-6 pb-6">
              <WorkoutCompletionModal
                onSubmit={onWorkoutComplete}
                workoutType={todaysWorkout.type}
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
