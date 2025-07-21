import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Workout zone utilities
export function getZoneColor(zone: string): string {
  if (zone.includes("1") || zone === "Recovery") return "bg-neutral-400";
  if (zone.includes("2")) return "bg-neutral-500";
  if (zone.includes("3")) return "bg-neutral-600";
  if (zone.includes("4")) return "bg-neutral-700";
  if (zone.includes("5")) return "bg-neutral-900";
  return "bg-neutral-500";
}

export function getZoneText(zone: string): string {
  if (zone.includes("1") || zone === "Recovery") return "Recovery";
  if (zone.includes("2")) return "Zone 2";
  if (zone.includes("3")) return "Zone 3";
  if (zone.includes("4")) return "Zone 4";
  if (zone.includes("5")) return "Zone 5";
  return zone;
}

// Extract distance and vertical from workout description or details
export function extractWorkoutMetrics(workout: {
  description?: string;
  details?: string[];
}): { distance: string; vertical: string } {
  let distance = "";
  let vertical = "";

  // Look in description first
  if (workout.description) {
    const distanceMatch = workout.description.match(
      /(\d+(?:\.\d+)?)\s*(?:miles?|km|k(?!\w))/i
    );
    const verticalMatch = workout.description.match(
      /(\d{1,4}[,\d]*)\s*(?:ft|feet|meters?|m(?!\w))/i
    );

    if (distanceMatch) distance = distanceMatch[1];
    if (verticalMatch) vertical = verticalMatch[1];
  }

  // Look in details if not found
  if (workout.details && (!distance || !vertical)) {
    workout.details.forEach((detail: string) => {
      if (!distance) {
        const distanceMatch = detail.match(
          /(\d+(?:\.\d+)?)\s*(?:miles?|km|k(?!\w))/i
        );
        if (distanceMatch) distance = distanceMatch[1];
      }
      if (!vertical) {
        const verticalMatch = detail.match(
          /(\d{1,4}[,\d]*)\s*(?:ft|feet|meters?|m(?!\w))/i
        );
        if (verticalMatch) vertical = verticalMatch[1];
      }
    });
  }

  return { distance, vertical };
}
