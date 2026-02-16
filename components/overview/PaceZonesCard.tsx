"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { calculatePaceZones, formatPace, formatPaceRange, parsePaceInput } from "@/lib/pace-zones";
import { effortToColor, effortToZoneLabel } from "@/lib/workout-display";
import type { EffortLevel } from "@/lib/blocks/types";
import { useClerkFirebase } from "@/lib/clerk-firebase";
import { useSaveTrainingBackgroundMutation, useGetLatestTrainingBackgroundQuery } from "@/lib/store/api";

const ZONE_ORDER: EffortLevel[] = ["z1", "z2", "z3", "z4", "z5"];

const ZONE_DESCRIPTIONS: Record<EffortLevel, string> = {
  z1: "Recovery",
  z2: "Aerobic / easy",
  z3: "Tempo → threshold",
  z4: "VO2max intervals",
  z5: "Anaerobic / max",
};

interface PaceZonesCardProps {
  thresholdPace?: number;
}

export function PaceZonesCard({ thresholdPace }: PaceZonesCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [minutes, setMinutes] = useState<string>("");
  const [seconds, setSeconds] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const { userId, isFirebaseReady } = useClerkFirebase();
  const [saveTrainingBackground] = useSaveTrainingBackgroundMutation();
  const { data: existingBackground } = useGetLatestTrainingBackgroundQuery(
    userId || "",
    { skip: !userId || !isFirebaseReady }
  );

  const handleSave = async () => {
    const min = parseInt(minutes);
    const sec = parseInt(seconds || "0");
    if (isNaN(min) || min < 4 || min > 20) return;

    setIsSaving(true);
    try {
      if (!userId) return;

      const pace = parsePaceInput(min, sec);
      await saveTrainingBackground({
        userId,
        background: {
          experience: existingBackground?.experience ?? "intermediate",
          weeklyMileage: existingBackground?.weeklyMileage ?? 0,
          longestRun: existingBackground?.longestRun ?? 0,
          goals: existingBackground?.goals ?? { raceDistance: "general" },
          thresholdPace: pace,
          fitnessSource: existingBackground?.fitnessSource ?? "manual",
          stravaConnected: existingBackground?.stravaConnected ?? false,
        },
      }).unwrap();

      setModalOpen(false);
    } catch (err) {
      console.error("Failed to save threshold pace:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!thresholdPace) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Set your pace zones</span>
        </button>

        <ThresholdModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          minutes={minutes}
          seconds={seconds}
          onMinutesChange={setMinutes}
          onSecondsChange={setSeconds}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </>
    );
  }

  const zones = calculatePaceZones(thresholdPace);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-900">
        Pace Zones
      </h3>

      <div className="space-y-3">
        {ZONE_ORDER.map((zone) => (
          <div key={zone} className="flex items-center gap-3">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: effortToColor(zone) }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {effortToZoneLabel(zone)}
                </span>
                <span className="text-sm tabular-nums text-neutral-600">
                  {formatPaceRange(zones[zone])}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {ZONE_DESCRIPTIONS[zone]}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Based on threshold pace of {formatPace(thresholdPace)}/mi
      </p>
    </div>
  );
}

function ThresholdModal({
  open,
  onOpenChange,
  minutes,
  seconds,
  onMinutesChange,
  onSecondsChange,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: string;
  seconds: string;
  onMinutesChange: (v: string) => void;
  onSecondsChange: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const min = parseInt(minutes);
  const canSave = !isNaN(min) && min >= 4 && min <= 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Your Threshold Pace</DialogTitle>
          <DialogDescription>
            Your threshold pace is the fastest pace you could uncomfortably hold
            for about an hour. All your training zones are derived from this number.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Input
                type="number"
                min={4}
                max={20}
                value={minutes}
                onChange={(e) => onMinutesChange(e.target.value)}
                placeholder="min"
                className="h-10 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                min
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (e.target.value === "" || (val >= 0 && val <= 59)) {
                    onSecondsChange(e.target.value);
                  }
                }}
                placeholder="sec"
                className="h-10 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                sec
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-400">
            Not sure? A recent 5K race pace + ~45 sec/mi is a good estimate.
          </p>

          <Button
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="w-full rounded-xl bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {isSaving ? "Saving..." : "Save Threshold Pace"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
