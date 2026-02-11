// Utility functions for training plan calculations

export function calculatePlanLength(raceDate?: number): number {
  if (!raceDate) {
    return 12;
  }

  const today = new Date();
  const race = new Date(raceDate);
  const timeDiff = race.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const weeksDiff = Math.ceil(daysDiff / 7);

  return Math.max(4, Math.min(24, weeksDiff));
}

export function formatRaceCountdown(raceDate?: number): string {
  if (!raceDate) {
    return "No race date set";
  }

  const today = new Date();
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
  const today = new Date();
  const start = new Date(startDate);

  const startDayOfWeek = start.getDay();
  const daysFromMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const startWeekMonday = new Date(start);
  startWeekMonday.setDate(start.getDate() - daysFromMonday);
  startWeekMonday.setHours(0, 0, 0, 0);

  const todayDayOfWeek = today.getDay();
  const todayDaysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
  const todayWeekMonday = new Date(today);
  todayWeekMonday.setDate(today.getDate() - todayDaysFromMonday);
  todayWeekMonday.setHours(0, 0, 0, 0);

  const timeDiff = todayWeekMonday.getTime() - startWeekMonday.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(daysDiff / 7) + 1;

  return Math.max(1, Math.min(totalWeeks, weekNumber));
}
