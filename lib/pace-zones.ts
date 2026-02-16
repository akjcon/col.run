/**
 * Pace Zone Utilities
 *
 * Derives personalized pace ranges from a threshold pace (pace holdable for ~1 hour).
 * Uses the "Training for the Uphill Athlete" zone model where:
 *   - Threshold pace = top of Zone 3 (100% threshold speed)
 *   - Z1/Z2 are aerobic zones (below threshold)
 *   - Z4/Z5 are above threshold (VO2max and anaerobic)
 *
 * Since pace = time/distance, slower pace = lower speed percentage:
 *   pace_at_percent = threshold_pace / (speed_percent / 100)
 */

import type { EffortLevel } from "@/lib/blocks/types";

export interface PaceRange {
  minPace: number; // slower end (higher number = slower, min/mi)
  maxPace: number; // faster end (lower number = faster, min/mi)
}

export type PaceZones = Record<EffortLevel, PaceRange>;

/**
 * Speed as % of threshold for each zone.
 * Threshold = 100% = top of Z3.
 */
const ZONE_SPEED_PERCENTAGES: Record<EffortLevel, { min: number; max: number }> = {
  z1: { min: 65, max: 76 },   // Recovery: very easy
  z2: { min: 76, max: 90 },   // Aerobic/Easy: conversational, bulk of training
  z3: { min: 90, max: 100 },  // Tempo → Threshold (threshold = ceiling)
  z4: { min: 100, max: 110 }, // VO2max: above threshold intervals
  z5: { min: 110, max: 130 }, // Anaerobic: near max
};

/**
 * Calculate pace zones from a threshold pace.
 * @param thresholdPace - pace in min/mi (e.g. 7.0 for 7:00/mi)
 */
export function calculatePaceZones(thresholdPace: number): PaceZones {
  const clamped = Math.max(4, Math.min(20, thresholdPace));

  const zones = {} as PaceZones;
  for (const [zone, pct] of Object.entries(ZONE_SPEED_PERCENTAGES)) {
    zones[zone as EffortLevel] = {
      minPace: clamped / (pct.min / 100), // slower end (lower speed %)
      maxPace: clamped / (pct.max / 100), // faster end (higher speed %)
    };
  }
  return zones;
}

/**
 * Format a pace value to "M:SS" string.
 * @param paceMinPerMile - e.g. 8.5 → "8:30"
 */
export function formatPace(paceMinPerMile: number): string {
  const minutes = Math.floor(paceMinPerMile);
  const seconds = Math.round((paceMinPerMile - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format a pace range to "M:SS-M:SS/mi" string.
 * maxPace is faster (lower number), minPace is slower (higher number).
 */
export function formatPaceRange(range: PaceRange): string {
  return `${formatPace(range.maxPace)}-${formatPace(range.minPace)}/mi`;
}

/**
 * Parse minutes + seconds input into decimal min/mi.
 * @example parsePaceInput(8, 30) → 8.5
 */
export function parsePaceInput(minutes: number, seconds: number): number {
  return minutes + seconds / 60;
}
