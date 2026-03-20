/**
 * Plan Review Checklist
 *
 * Structured list of things the reviewer agent should check.
 * These are holistic/semantic checks that go beyond what the
 * rule-based plan-evaluation.ts can catch — things that require
 * understanding the plan as a coherent whole.
 *
 * To add a new check: append an item to REVIEW_CHECKLIST.
 * The reviewer agent will automatically pick it up.
 *
 * NOTE: The live checklist is in Firestore (reviewChecklist/current).
 * This static file is used as the seed/fallback. After updating here,
 * also update Firestore via /review/checklist or the API.
 */

export type ChecklistCategory =
  | "narrative_coherence"
  | "phase_appropriateness"
  | "taper_quality"
  | "workout_variety"
  | "race_specificity"
  | "effort_distribution";

export type ChecklistSeverity = "critical" | "major" | "minor";

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  severity: ChecklistSeverity;
  description: string;
  rationale: string;
}

export const REVIEW_CHECKLIST: ChecklistItem[] = [
  {
    id: "PLAN_PROGRESSION",
    category: "narrative_coherence",
    severity: "major",
    description:
      "Does the plan start at the athlete's current fitness level and build logically through phases? Week 1 volume should be close to current weekly mileage. Volume should increase systematically toward a planned peak — no random spikes in early weeks, and the highest volume weeks should be in the peak phase, not scattered throughout.",
    rationale:
      "Starting too high risks injury. Starting too low wastes time. Random volume spikes indicate poor periodization. The plan should read as a coherent story from current fitness to race readiness.",
  },
  {
    id: "PHASE_WORKOUT_MATCH",
    category: "phase_appropriateness",
    severity: "major",
    description:
      "Are workout types appropriate for each phase, with intensity introduced gradually? Base phase should be mostly easy aerobic runs. Build phase should introduce tempo/threshold at moderate volume (shorter reps, fewer sets). Peak phase should have race-specific work at full volume. There should be no sudden jump from zero intensity to high-volume hard workouts.",
    rationale:
      "Periodization only works if each phase has the right stimulus. Hard intervals in base phase or only easy runs in peak phase defeats the purpose. Abruptly introducing hard work increases injury risk.",
  },
  {
    id: "TAPER_QUALITY",
    category: "taper_quality",
    severity: "critical",
    description:
      "Does the taper progressively reduce volume with no hard workouts? Volume should decrease monotonically through the taper period. No tempo or interval sessions — only easy running and possibly short strides. Race week (final week) should be very light with no training stress in the 2-3 days before race day.",
    rationale:
      "The taper sheds fatigue while maintaining fitness. Hard workouts or volume increases during taper prevent recovery. The athlete must arrive at race day fresh — any meaningful stress in final days undermines the entire taper.",
  },
  {
    id: "WORKOUT_VARIETY",
    category: "workout_variety",
    severity: "major",
    description:
      "Does the plan include sufficient workout variety, including meaningful intensity work? At least 3 different workout types should appear across the cycle (easy, longRun, and tempo or intervals). Plans with only easy runs and short strides/sprints are insufficient — there should be sustained threshold or tempo efforts to develop race-pace fitness.",
    rationale:
      "Variety develops different energy systems and prevents staleness. A plan without meaningful tempo or threshold work fails to develop the physiological adaptations needed for race performance at any level.",
  },
  {
    id: "LONG_RUN_PLACEMENT",
    category: "effort_distribution",
    severity: "major",
    description:
      "Are long runs consistently placed on weekends (Saturday or Sunday) and followed by easy/rest days? Long runs on mid-week days without recovery after are a red flag.",
    rationale:
      "Long runs are the highest-stress single workout. Placing them mid-week without recovery risks overtraining and injury.",
  },
  {
    id: "PEAK_WEEK_TIMING",
    category: "race_specificity",
    severity: "major",
    description:
      "Is the peak volume week placed 2-4 weeks before race day (before taper begins)? Peak too early wastes fitness; peak too late doesn't allow recovery.",
    rationale:
      "Peak training should happen close enough to race day that fitness is maintained through taper, but early enough to recover.",
  },
  {
    id: "EASY_DAY_EFFORT_LEVELS",
    category: "effort_distribution",
    severity: "minor",
    description:
      "Are easy days actually easy? Days with only 'easy' type blocks should use z1-z2 effort, not z3+. Easy runs at z3 are not easy.",
    rationale:
      "The 80/20 principle requires easy days to be truly easy. Running easy days too hard is the most common amateur mistake.",
  },
  {
    id: "RECOVERY_WEEK_FREQUENCY",
    category: "effort_distribution",
    severity: "major",
    description:
      "Are recovery weeks scheduled appropriately? Plans longer than 4-5 weeks should include periodic down weeks (typically every 3-4 weeks) to allow adaptation and prevent overreaching.",
    rationale:
      "Continuous loading without recovery weeks leads to accumulated fatigue and increased injury risk. Recovery weeks allow the body to adapt to training stress.",
  },
];
