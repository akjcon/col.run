"use client";

import { useState } from "react";
import { Check, X, Loader2, Gauge } from "lucide-react";
import { useUser } from "@/lib/user-context-rtk";
import { useAppDispatch } from "@/lib/store/hooks";
import { baseApi } from "@/lib/store/api/baseApi";
import type { PaceZoneUpdateData } from "@/lib/chat-context";
import { toast } from "sonner";
import {
  calculatePaceZones,
  formatPace,
  formatPaceRange,
} from "@/lib/pace-zones";
import { effortToColor, effortToZoneLabel } from "@/lib/workout-display";
import type { EffortLevel } from "@/lib/blocks/types";

const ZONE_ORDER: EffortLevel[] = ["z1", "z2", "z3", "z4", "z5"];

interface PaceZoneUpdateCardProps {
  data: PaceZoneUpdateData;
  messageId?: string;
  onStatusChange: (status: PaceZoneUpdateData["status"], error?: string) => void;
}

export function PaceZoneUpdateCard({
  data,
  onStatusChange,
}: PaceZoneUpdateCardProps) {
  const { userId } = useUser();
  const dispatch = useAppDispatch();
  const [isApplying, setIsApplying] = useState(false);

  const newZones = calculatePaceZones(data.newThresholdPace);
  const currentZones = data.currentThresholdPace
    ? calculatePaceZones(data.currentThresholdPace)
    : null;

  const handleApply = async () => {
    if (!userId) return;

    setIsApplying(true);
    onStatusChange("applying");

    try {
      const response = await fetch("/api/plan/threshold-pace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          thresholdPace: data.newThresholdPace,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update threshold pace");
      }

      onStatusChange("applied");
      toast.success("Pace zones updated");
      // Invalidate snapshot + training background caches
      dispatch(
        baseApi.util.invalidateTags(["AthleteSnapshot", "TrainingBackground"])
      );
    } catch {
      onStatusChange("error", "Failed to update threshold pace");
      toast.error("Failed to update pace zones. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleDismiss = () => {
    onStatusChange("error", "Update dismissed");
  };

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2">
        {data.status === "applied" ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : data.status === "error" ? (
          <X className="h-3.5 w-3.5 text-neutral-400" />
        ) : (
          <Gauge className="h-3.5 w-3.5 text-neutral-500" />
        )}
        <span className="text-xs font-medium text-neutral-700">
          {data.status === "applied"
            ? "Pace Zones Updated"
            : data.status === "error"
              ? "Update Not Applied"
              : "Proposed Pace Zone Update"}
        </span>
      </div>

      {/* Threshold pace change */}
      <div className="border-b border-neutral-200 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-neutral-500">Threshold:</span>
          {data.currentThresholdPace && (
            <>
              <span className="text-xs text-neutral-400 line-through">
                {formatPace(data.currentThresholdPace)}/mi
              </span>
              <span className="text-xs text-neutral-400">&rarr;</span>
            </>
          )}
          <span className="text-xs font-semibold text-neutral-900">
            {formatPace(data.newThresholdPace)}/mi
          </span>
        </div>
      </div>

      {/* Zone comparison table */}
      <div className="px-3 py-2">
        <div className="space-y-1.5">
          {ZONE_ORDER.map((zone) => (
            <div key={zone} className="flex items-center gap-2">
              <div
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: effortToColor(zone) }}
              />
              <span className="w-16 text-[11px] font-medium text-neutral-700">
                {effortToZoneLabel(zone)}
              </span>
              {currentZones && (
                <>
                  <span className="w-24 text-[11px] tabular-nums text-neutral-400 line-through">
                    {formatPaceRange(currentZones[zone])}
                  </span>
                  <span className="text-[11px] text-neutral-300">&rarr;</span>
                </>
              )}
              <span className="text-[11px] font-medium tabular-nums text-neutral-900">
                {formatPaceRange(newZones[zone])}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error message */}
      {data.status === "error" && data.error && (
        <div className="border-t border-neutral-200 px-3 py-2">
          <p className="text-[11px] text-red-600">{data.error}</p>
        </div>
      )}

      {/* Actions */}
      {data.status === "proposed" && (
        <div className="flex gap-2 border-t border-neutral-200 px-3 py-2">
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#E98A15] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#d47d13] disabled:opacity-50"
          >
            {isApplying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Update Pace Zones
          </button>
          <button
            onClick={handleDismiss}
            disabled={isApplying}
            className="flex items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            <X className="h-3 w-3" />
            Keep Current
          </button>
        </div>
      )}

      {/* Applying state */}
      {data.status === "applying" && (
        <div className="flex items-center justify-center gap-2 border-t border-neutral-200 px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
          <span className="text-xs text-neutral-500">Updating pace zones...</span>
        </div>
      )}
    </div>
  );
}
