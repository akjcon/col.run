"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { WorkoutLog } from "@/lib/types";
import { formatPace } from "@/lib/pace-zones";
import { AskCoachButton } from "@/components/AskCoachButton";

const ADHERENCE_PILL = {
  on_target: { label: "On Target", className: "bg-green-100 text-green-700" },
  over: { label: "Over", className: "bg-amber-100 text-amber-700" },
  under: { label: "Under", className: "bg-red-100 text-red-700" },
  skipped: { label: "Skipped", className: "bg-neutral-100 text-neutral-600" },
} as const;

const EASE_OUT_QUART: [number, number, number, number] = [0.165, 0.84, 0.44, 1];

interface CoachingNoteCardProps {
  workoutLog: WorkoutLog;
  onDismiss?: () => void;
}

export function CoachingNoteCard({ workoutLog, onDismiss }: CoachingNoteCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const reducedMotion = useReducedMotion();

  if (!workoutLog.coachingNote) return null;

  const adherence = workoutLog.adherence ?? "on_target";
  const pill = ADHERENCE_PILL[adherence];

  const card = (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-stone-50">
      <div className="px-5 py-4">
        {/* Header: badge + metrics + dismiss */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${pill.className}`}
            >
              {pill.label}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-neutral-400">
              {workoutLog.actualMiles != null && (
                <span>{workoutLog.actualMiles.toFixed(1)}mi</span>
              )}
              {workoutLog.avgPace != null && (
                <span>{formatPace(workoutLog.avgPace)}/mi</span>
              )}
              {workoutLog.avgHeartRate != null && (
                <span>{workoutLog.avgHeartRate}bpm</span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors duration-150 ease-out hover:bg-black/5 hover:text-neutral-600"
            aria-label="Dismiss coaching note"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Coaching note */}
        <p className="text-[13px] leading-relaxed text-neutral-600">
          {workoutLog.coachingNote}
        </p>

        {/* Ask Coach — only show when something was off */}
        {adherence !== "on_target" && <div className="mt-3">
          <AskCoachButton
            context={{
              page: "home",
              trigger: "workout",
              workout: {
                title: workoutLog.plannedTitle,
                miles: workoutLog.actualMiles,
                effortLevel: workoutLog.adherence ?? undefined,
                isCompleted: true,
                blocks: workoutLog.coachingNote
                  ? [`Coach note: ${workoutLog.coachingNote}`]
                  : undefined,
              },
            }}
            label="Discuss with Coach"
          />
        </div>}
      </div>
    </div>
  );

  if (reducedMotion) {
    return dismissed ? null : <div className="mb-3">{card}</div>;
  }

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 1, height: "auto" }}
          exit={{
            opacity: 0,
            height: 0,
            marginBottom: 0,
          }}
          transition={{
            opacity: { duration: 0.2, ease: EASE_OUT_QUART },
            height: { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.05 },
            marginBottom: { duration: 0.25, ease: EASE_OUT_QUART, delay: 0.05 },
          }}
          className="mb-3 overflow-hidden"
        >
          {card}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
