// Utility functions for training plan calculations

export function calculatePlanLength(raceDate?: Date): number {
  if (!raceDate) {
    return 12; // Default to 12 weeks if no race date provided
  }

  const today = new Date();
  const race = new Date(raceDate);

  // Calculate days between now and race
  const timeDiff = race.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Convert to weeks, minimum 4 weeks, maximum 24 weeks
  const weeksDiff = Math.ceil(daysDiff / 7);

  // Clamp between 4 and 24 weeks for reasonable training plans
  return Math.max(4, Math.min(24, weeksDiff));
}

export function getPlanTypeString(distance: string, weeks: number): string {
  return `${weeks}-week ${distance} Training Plan`;
}

export function getPhaseDistribution(totalWeeks: number): {
  baseWeeks: number;
  buildWeeks: number;
  peakWeeks: number;
  taperWeeks: number;
} {
  if (totalWeeks <= 4) {
    // Very short plan - mostly build and taper
    return {
      baseWeeks: 1,
      buildWeeks: 2,
      peakWeeks: 0,
      taperWeeks: 1,
    };
  } else if (totalWeeks <= 8) {
    // Short plan - base, build, taper
    return {
      baseWeeks: Math.ceil(totalWeeks * 0.5), // 50% base
      buildWeeks: Math.ceil(totalWeeks * 0.375), // 37.5% build
      peakWeeks: 0,
      taperWeeks: 1, // Always 1 week taper minimum
    };
  } else if (totalWeeks <= 12) {
    // Standard plan - base, build, peak, taper
    return {
      baseWeeks: Math.ceil(totalWeeks * 0.5), // 50% base
      buildWeeks: Math.ceil(totalWeeks * 0.25), // 25% build
      peakWeeks: Math.ceil(totalWeeks * 0.125), // 12.5% peak
      taperWeeks: Math.max(1, Math.ceil(totalWeeks * 0.125)), // 12.5% taper, min 1 week
    };
  } else {
    // Long plan - extended base
    return {
      baseWeeks: Math.ceil(totalWeeks * 0.6), // 60% base for longer plans
      buildWeeks: Math.ceil(totalWeeks * 0.225), // 22.5% build
      peakWeeks: Math.ceil(totalWeeks * 0.1), // 10% peak
      taperWeeks: Math.max(2, Math.ceil(totalWeeks * 0.075)), // 7.5% taper, min 2 weeks
    };
  }
}

export function formatRaceCountdown(raceDate?: Date): string {
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

export function getRacePhaseGuidance(weeksUntilRace: number): string {
  if (weeksUntilRace <= 1) {
    return "Taper week - maintain fitness, prioritize rest and race prep";
  } else if (weeksUntilRace <= 2) {
    return "Final preparation - reduce volume, maintain intensity, practice race routine";
  } else if (weeksUntilRace <= 4) {
    return "Peak phase - race-specific workouts, fine-tune systems";
  } else if (weeksUntilRace <= 8) {
    return "Build phase - increase intensity, add race-specific elements";
  } else {
    return "Base phase - focus on aerobic development and volume";
  }
}
