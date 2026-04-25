// Utility functions for training plan calculations

import { getNow } from "@/lib/time";

export function calculatePlanLength(raceDate?: number): number {
  if (!raceDate) {
    return 12;
  }

  const today = getNow();
  const race = new Date(raceDate);
  const timeDiff = race.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.ceil(daysDiff / 7);

  return Math.max(4, Math.min(24, weeksDiff));
}

export function formatRaceCountdown(raceDate?: number): string {
  if (!raceDate) {
    return "Someday soon";
  }

  const today = getNow();
  const race = new Date(raceDate);
  const timeDiff = race.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return "Race has passed";
  } else if (daysDiff === 0) {
    return "Race day is today!";
  } else if (daysDiff === 1) {
    return "Race is tomorrow!";
  } else if (daysDiff <= 7) {
    return `Race in ${daysDiff} days`;
  } else {
    const weeks = Math.ceil(daysDiff / 7);
    return `Race in ${weeks} weeks (${daysDiff} days)`;
  }
}

export function calculateCurrentWeek(
  startDate: number,
  totalWeeks: number
): number {
  const today = getNow();
  const start = new Date(startDate);

  const startDayOfWeek = start.getUTCDay();
  const daysFromMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const startMondayMs = Date.UTC(
    start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() - daysFromMonday, 12
  );

  const todayDayOfWeek = today.getUTCDay();
  const todayDaysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
  const todayMondayMs = Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - todayDaysFromMonday, 12
  );

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const daysDiff = Math.floor((todayMondayMs - startMondayMs) / ONE_DAY);
  const weekNumber = Math.floor(daysDiff / 7) + 1;

  return Math.max(1, Math.min(totalWeeks, weekNumber));
}
