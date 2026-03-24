/**
 * Goal Feasibility Analyzer
 *
 * Pre-flight check before plan generation to determine if a goal
 * is achievable given the athlete's current fitness and experience.
 */

import type { FitnessProfile, ExperienceProfile } from "@/lib/strava/types";
import { getRaceRequirements, adjustForElevation, type RaceRequirements } from "./race-requirements";

// =============================================================================
// Types
// =============================================================================

export interface FeasibilityInput {
  raceType: string;
  weeksUntilRace: number;
  elevationGain?: number; // feet
  currentFitness: FitnessProfile;
  experience: ExperienceProfile;
}

export interface FeasibilityResult {
  feasible: boolean;
  confidence: "high" | "medium" | "low";
  riskLevel: "low" | "moderate" | "high" | "extreme";

  // What we're working with
  assessment: {
    experienceLevel: string;
    currentWeeklyMileage: number;
    requiredPeakMileage: number;
    currentLongRun: number;
    requiredLongRun: number;
    weeksAvailable: number;
    weeksNeeded: number;
  };

  // Issues found
  warnings: string[];
  blockers: string[]; // Critical issues that make the goal infeasible

  // Recommendations
  recommendations: {
    startingWeeklyMileage: number;
    targetPeakMileage: number;
    targetPeakLongRun: number;
    suggestedApproach: string;
  };

  // The race requirements used
  raceRequirements: RaceRequirements;
}

// =============================================================================
// Feasibility Analysis
// =============================================================================

/**
 * Analyze whether a race goal is feasible
 */
export function analyzeFeasibility(input: FeasibilityInput): FeasibilityResult {
  const {
    raceType,
    weeksUntilRace,
    elevationGain = 0,
    currentFitness,
    experience,
  } = input;

  // Get race requirements
  let requirements = getRaceRequirements(raceType);
  if (!requirements) {
    throw new Error(`Unknown race type: ${raceType}`);
  }

  // Adjust for elevation if significant
  if (elevationGain > 1000) {
    requirements = adjustForElevation(requirements, elevationGain);
  }

  const warnings: string[] = [];
  const blockers: string[] = [];

  // Determine which "weeks needed" category applies
  const weeksNeeded = determineWeeksNeeded(experience, requirements);

  // Calculate required starting point for safe progression
  const targetPeakMileage = requirements.peakWeeklyMileage.ideal;
  const startingMileageNeeded = calculateStartingMileage(targetPeakMileage, weeksUntilRace);
  const targetPeakLongRun = requirements.peakLongRun.ideal;

  // ==========================================================================
  // Check: Do we have enough time?
  // ==========================================================================
  const hasDistanceExperience = experience.longestRunEver >= requirements.distanceMiles * 0.7;
  const isExperienced = experience.experienceLevel === "elite" || experience.experienceLevel === "advanced";

  if (weeksUntilRace < weeksNeeded) {
    const deficit = weeksNeeded - weeksUntilRace;

    // Experienced athletes with distance experience get more leeway
    if (isExperienced && hasDistanceExperience) {
      if (deficit > 6) {
        warnings.push(
          `Ideally need ${weeksNeeded} weeks, only ${weeksUntilRace} available. ` +
          `However, you have experience at this distance (${experience.longestRunEver}mi longest run). ` +
          `Compressed timeline is higher risk but achievable with smart training.`
        );
      } else {
        warnings.push(
          `Slightly compressed timeline (${weeksUntilRace} vs ideal ${weeksNeeded} weeks). ` +
          `Your experience makes this manageable.`
        );
      }
    } else if (deficit > 4) {
      blockers.push(
        `Need ${weeksNeeded} weeks minimum, only ${weeksUntilRace} available. ` +
        `${deficit} week deficit is too large to safely bridge.`
      );
    } else {
      warnings.push(
        `Ideally need ${weeksNeeded} weeks, only ${weeksUntilRace} available. ` +
        `Plan will be compressed - higher risk but potentially doable.`
      );
    }
  }

  // ==========================================================================
  // Check: Is current fitness sufficient as a starting point?
  // ==========================================================================
  const currentMileage = currentFitness.weeklyMileage;
  const mileageGap = startingMileageNeeded - currentMileage;

  if (mileageGap > 0) {
    // Can we make up the gap with 10% weekly increases?
    const weeksToReachStart = Math.ceil(Math.log(startingMileageNeeded / Math.max(currentMileage, 5)) / Math.log(1.1));

    if (weeksToReachStart > weeksUntilRace * 0.3) {
      warnings.push(
        `Current mileage (${currentMileage}mi/week) is below ideal starting point (${Math.round(startingMileageNeeded)}mi/week). ` +
        `Will need ${weeksToReachStart} weeks just to reach proper base.`
      );
    }
  }

  // ==========================================================================
  // Check: Experience appropriate for race?
  // ==========================================================================
  const needsUltraExp = requirements.distanceMiles > 26.2;
  const needsMarathonExp = requirements.distanceMiles >= 26.2;

  if (needsUltraExp && !experience.ultraExperience) {
    warnings.push(
      `${raceType} is an ultra distance but no previous ultra experience detected. ` +
      `First ultras carry higher DNF risk.`
    );
  }

  if (needsMarathonExp && experience.longestRunEver < 20) {
    warnings.push(
      `Longest run ever is ${experience.longestRunEver}mi. ` +
      `Recommend having at least one 20+ mile run before a ${raceType}.`
    );
  }

  // Check if elevation is a concern
  if (elevationGain > 3000 && !experience.trailExperience) {
    warnings.push(
      `Race has ${elevationGain.toLocaleString()}ft of elevation but limited trail/elevation experience detected. ` +
      `Include significant hill training.`
    );
  }

  // ==========================================================================
  // Check: Is experience level mismatched with goal?
  // ==========================================================================
  if (experience.experienceLevel === "beginner" && requirements.distanceMiles > 13.1) {
    blockers.push(
      `Experience level (${experience.experienceLevel}) may be insufficient for ${raceType}. ` +
      `Recommend building up to shorter races first.`
    );
  }

  // ==========================================================================
  // Check: CTL/fitness trajectory
  // ==========================================================================
  if (currentFitness.ctl < 20 && requirements.distanceMiles > 13.1) {
    warnings.push(
      `Current training load (CTL: ${currentFitness.ctl}) is very low. ` +
      `Significant build-up phase needed before race-specific training.`
    );
  }

  // ==========================================================================
  // Determine overall feasibility
  // ==========================================================================
  const feasible = blockers.length === 0;

  let confidence: "high" | "medium" | "low" = "high";
  let riskLevel: "low" | "moderate" | "high" | "extreme" = "low";

  if (blockers.length > 0) {
    confidence = "low";
    riskLevel = "extreme";
  } else if (warnings.length >= 3) {
    confidence = "low";
    riskLevel = "high";
  } else if (warnings.length >= 1) {
    confidence = "medium";
    riskLevel = "moderate";
  }

  // ==========================================================================
  // Generate recommendations
  // ==========================================================================
  let suggestedApproach: string;
  const hasDistExp = experience.longestRunEver >= requirements.distanceMiles * 0.7;
  const isExp = experience.experienceLevel === "advanced" || experience.experienceLevel === "elite";

  if (!feasible) {
    suggestedApproach =
      "Goal is not recommended. Consider a shorter race distance or later race date.";
  } else if (isExp && hasDistExp) {
    if (currentFitness.ctl < 30) {
      suggestedApproach =
        "EXPERIENCED ATHLETE REBUILD: You've done this distance before. " +
        "Start at current volume and build gradually (max 15% per week). " +
        "Your body remembers — the progression will feel comfortable but must still be gradual.";
    } else {
      suggestedApproach =
        "RACE-SPECIFIC PEAK: You have the base and experience. " +
        "Start at current volume and build gradually (max 15% per week). " +
        "Focus on race-specific preparation: long runs with vert, back-to-backs, nutrition practice.";
    }
  } else if (isExp) {
    suggestedApproach =
      "EXPERIENCED BUILD: You know how to train but this distance is new territory. " +
      "Build gradually (max 15% per week) and respect the long run progression.";
  } else if (currentMileage < startingMileageNeeded) {
    suggestedApproach =
      "BUILD-FIRST: Spend initial weeks building base volume before race-specific work.";
  } else {
    suggestedApproach =
      "STANDARD PERIODIZATION: Base → Build → Peak → Taper progression.";
  }

  // ==========================================================================
  // Calculate safe starting and peak volumes
  // ==========================================================================
  // CRITICAL: Week 1 volume MUST be based on current fitness, not goal.
  // Even experienced athletes in a low-volume phase can't safely jump to high volume.
  //
  // Rule: Week 1 can be at most 20% above current weekly mileage (with minimum floor).
  // This respects both the 10% rule AND the reality of where the athlete is now.

  const safeStartingMileage = calculateSafeStartingMileage(
    currentMileage,
    experience,
    weeksUntilRace,
    targetPeakMileage
  );

  // Calculate achievable peak given safe starting point
  // With 15% max weekly increase and recovery weeks every 4th week
  const achievablePeak = calculateAchievablePeak(
    safeStartingMileage,
    weeksUntilRace,
    targetPeakMileage,
  );

  // Add warning if we can't reach ideal peak
  if (achievablePeak < requirements.peakWeeklyMileage.min) {
    warnings.push(
      `Starting at ${safeStartingMileage}mi/week, can only safely reach ${achievablePeak}mi peak. ` +
      `Ideal for ${raceType} is ${requirements.peakWeeklyMileage.min}-${requirements.peakWeeklyMileage.ideal}mi. ` +
      `Consider more training time or accepting a slower pace.`
    );
  } else if (achievablePeak < requirements.peakWeeklyMileage.ideal) {
    warnings.push(
      `Peak mileage (${achievablePeak}mi) will be below ideal (${requirements.peakWeeklyMileage.ideal}mi) ` +
      `due to safe progression from current fitness. This is fine but not optimal.`
    );
  }

  return {
    feasible,
    confidence,
    riskLevel,
    assessment: {
      experienceLevel: experience.experienceLevel,
      currentWeeklyMileage: currentMileage,
      requiredPeakMileage: targetPeakMileage,
      currentLongRun: currentFitness.longestRun,
      requiredLongRun: targetPeakLongRun,
      weeksAvailable: weeksUntilRace,
      weeksNeeded,
    },
    warnings,
    blockers,
    recommendations: {
      startingWeeklyMileage: safeStartingMileage,
      targetPeakMileage: achievablePeak,
      targetPeakLongRun: Math.min(targetPeakLongRun, achievablePeak * 0.35), // Long run ~35% of weekly max
      suggestedApproach,
    },
    raceRequirements: requirements,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine which weeks-needed category applies based on experience
 */
function determineWeeksNeeded(
  experience: ExperienceProfile,
  requirements: RaceRequirements
): number {
  // Key insight: experienced athletes who have done the distance before
  // can get ready faster, even if currently in a low-volume phase

  const hasDistanceExperience = experience.longestRunEver >= requirements.distanceMiles * 0.7;
  const hasVolumeExperience = experience.peakWeeklyMileage >= requirements.peakWeeklyMileage.min * 0.8;
  const isExperienced = experience.experienceLevel === "elite" || experience.experienceLevel === "advanced";

  // Elite/Advanced who have done the distance before = maintenance mode
  // They know what they're doing and can peak quickly
  if (isExperienced && hasDistanceExperience) {
    return requirements.minWeeksNeeded.maintenance;
  }

  // Experienced athlete with good volume history = withBase
  // Even if currently low, they can ramp faster than beginners
  if (isExperienced && hasVolumeExperience) {
    return requirements.minWeeksNeeded.withBase;
  }

  // Has solid base (peak weekly >= 60% of required) = withBase
  if (experience.peakWeeklyMileage >= requirements.peakWeeklyMileage.ideal * 0.6) {
    return requirements.minWeeksNeeded.withBase;
  }

  // Starting from scratch
  return requirements.minWeeksNeeded.fromScratch;
}

/**
 * Calculate what starting weekly mileage is needed to reach peak with 10% rule
 */
function calculateStartingMileage(targetPeak: number, weeksAvailable: number): number {
  // Account for: taper (2 weeks), peak (1 week), so build weeks = total - 3
  const buildWeeks = Math.max(weeksAvailable - 3, 1);

  // With recovery weeks every 4th week, effective build weeks are ~75% of total
  const effectiveBuildWeeks = buildWeeks * 0.75;

  // Working backwards: peak = start * (1.1)^effectiveBuildWeeks
  // start = peak / (1.1)^effectiveBuildWeeks
  const startingMileage = targetPeak / Math.pow(1.1, effectiveBuildWeeks);

  return Math.round(startingMileage);
}

/**
 * Calculate safe starting weekly mileage based on current fitness AND history.
 *
 * Key insight: Experienced athletes in a low-volume phase are NOT the same
 * as beginners. Their bodies have the structural adaptations (bones, tendons,
 * mitochondrial density) from years of training. They can safely return to
 * higher volume faster.
 *
 * Rules for experienced athletes with volume history:
 * - Can start at up to 40-50% of their peak weekly mileage
 * - Their "muscle memory" means faster safe ramp-up
 * - Still capped by what's reasonable (not jumping to peak immediately)
 *
 * Rules for others:
 * - Minimum floor of 10 miles (2-3 easy runs)
 * - Maximum 20-30% above current weekly mileage
 * - More conservative progression
 */
function calculateSafeStartingMileage(
  currentMileage: number,
  experience: ExperienceProfile,
  weeksAvailable: number,
  targetPeak: number
): number {
  const MINIMUM_FLOOR = 10; // miles - at least 2-3 easy runs

  // Always start at the athlete's current mileage.
  // The plan generator handles the ramp — we don't want to tell it to jump.
  const safeStart = Math.max(MINIMUM_FLOOR, Math.round(currentMileage));

  // Never exceed target peak
  return Math.min(safeStart, targetPeak);
}

/**
 * Calculate achievable peak mileage given starting point and time.
 *
 * Progression rates based on experience:
 * - Experienced athletes (with volume history): 15% per week initially, dropping to 10% at higher volumes
 * - Others: 10% per week (standard progression)
 *
 * Recovery weeks every 4th week (no volume gain).
 * Final 2-3 weeks are taper (volume drops).
 */
function calculateAchievablePeak(
  startingMileage: number,
  weeksAvailable: number,
  idealPeak: number,
): number {
  // Reserve 2 weeks for taper, 1 week for peak
  const buildWeeks = Math.max(weeksAvailable - 3, 1);

  // Model the progression week by week at 15% max increase
  let currentVolume = startingMileage;
  let weeksSinceRecovery = 0;

  for (let w = 0; w < buildWeeks; w++) {
    weeksSinceRecovery++;

    // Every 4th week is recovery (no increase)
    if (weeksSinceRecovery >= 4) {
      weeksSinceRecovery = 0;
      continue;
    }

    currentVolume = Math.round(currentVolume * 1.15);

    // Cap at ideal peak - no need to go higher
    if (currentVolume >= idealPeak) {
      return idealPeak;
    }
  }

  return Math.round(currentVolume);
}
