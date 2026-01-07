# Plan Builder V2: Comprehensive Design Document

## Executive Summary

V2 of the col.run plan builder represents a fundamental reimagining of how training plans are generated. Instead of a single monolithic LLM call that generates an entire plan from a JSON schema, V2 uses an **agentic orchestration system** inspired by Claude Code's architecture: simple primitives, specialist agents, iterative refinement, and real-world data integration.

**Key Principles:**
1. **Data-Driven**: Integrate with Strava to understand actual fitness, not just self-reported metrics
2. **Composable**: Build plans from structured workout blocks that can be validated and adjusted
3. **Agentic**: Use specialized agents for different aspects of plan creation
4. **Iterative**: Allow plans to adapt based on execution feedback
5. **Extensible**: Design for future integrations (Garmin, TrainingPeaks, etc.)

---

## Part 1: Data Architecture

### 1.1 Enhanced User Fitness Model

The current `TrainingBackground` relies entirely on self-reported data. V2 introduces a comprehensive fitness model derived from actual training data.

```typescript
// New: Fitness model derived from Strava + user input
interface AthleteFitnessProfile {
  userId: string;
  lastUpdated: number; // epoch ms

  // Self-reported (from onboarding)
  selfReported: {
    experience: "beginner" | "intermediate" | "advanced";
    injuries: string[];
    goals: RaceGoal;
    constraints: TrainingConstraints;
  };

  // Derived from Strava/activity data
  activityDerived: {
    // Training load metrics
    fitnessScore: number;        // CTL - Chronic Training Load (42-day weighted avg)
    fatigueScore: number;        // ATL - Acute Training Load (7-day weighted avg)
    formScore: number;           // TSB = CTL - ATL (Training Stress Balance)

    // Volume metrics (last 12 weeks)
    weeklyVolume: WeeklyVolumeSummary[];
    averageWeeklyMiles: number;
    averageWeeklyVertical: number;  // feet
    averageWeeklyDuration: number;  // minutes

    // Performance metrics
    estimatedThresholdPace: number;    // seconds per mile
    estimatedVO2maxPace: number;       // seconds per mile
    heartRateZones: HeartRateZone[];   // derived from actual HR data
    paceZones: PaceZone[];             // derived from actual pace data

    // Elevation proficiency
    uphillPaceDecay: number;     // % pace loss per 1000ft gain
    downhillPaceBonus: number;   // % pace gain per 1000ft loss

    // Training patterns
    preferredDays: DayPattern[];        // which days they typically run
    typicalLongRunDay: string;          // "Saturday" | "Sunday"
    averageRunsPerWeek: number;

    // Injury risk indicators
    acuteChronicRatio: number;   // ACR - injury risk metric
    rapidLoadIncrease: boolean;  // flagged if volume spiked recently
  };

  // Confidence scores (0-1) for derived metrics
  confidence: {
    paceZones: number;
    heartRateZones: number;
    elevationProficiency: number;
    volumeBaseline: number;
  };
}

interface WeeklyVolumeSummary {
  weekStart: number;     // epoch ms
  totalMiles: number;
  totalVertical: number;
  totalDuration: number;
  runCount: number;
  longRunMiles: number;
  trainingStress: number; // TSS equivalent
}

interface TrainingConstraints {
  availableDays: string[];           // ["Monday", "Tuesday", ...]
  maxHoursPerWeek: number;
  blackoutDates: DateRange[];        // vacations, etc.
  requiredRestDays: string[];        // e.g., ["Friday"]
  hasGymAccess: boolean;
  hasHillAccess: boolean;
  hasTrackAccess: boolean;
}
```

### 1.2 Structured Workout Blocks

Replace free-text workout descriptions with structured, composable blocks.

```typescript
// A workout is a sequence of blocks
interface StructuredWorkout {
  id: string;
  day: string;                    // "Monday", "Tuesday", etc.
  date: number;                   // epoch ms
  type: WorkoutType;
  category: WorkoutCategory;

  // The core structure: ordered sequence of blocks
  blocks: WorkoutBlock[];

  // Calculated totals
  totalDuration: number;          // minutes
  totalDistance?: number;         // miles
  totalElevationGain?: number;    // feet
  estimatedTSS: number;           // Training Stress Score

  // Coaching context
  purpose: string;                // Why this workout exists in the plan
  keyPoints: string[];            // 2-3 things to focus on
  alternatives?: WorkoutBlock[];  // If conditions don't allow planned workout

  // Execution tracking
  status: "scheduled" | "completed" | "skipped" | "modified";
  actualExecution?: ActivitySummary;  // linked Strava activity
}

type WorkoutType =
  | "rest"
  | "recovery"
  | "easy_run"
  | "long_run"
  | "tempo"
  | "intervals"
  | "hill_repeats"
  | "fartlek"
  | "race_pace"
  | "strength"
  | "cross_training"
  | "race";

type WorkoutCategory =
  | "recovery"      // Zone 1, very easy
  | "aerobic"       // Zone 1-2, base building
  | "threshold"     // Zone 3-4, lactate threshold
  | "vo2max"        // Zone 5, high intensity
  | "strength"      // Gym/bodyweight work
  | "race"          // Goal race or tune-up
  | "rest";         // Complete rest

// The atomic unit of a workout
interface WorkoutBlock {
  id: string;
  type: BlockType;
  sequence: number;              // order in workout

  // Duration can be time OR distance based
  duration: {
    type: "time" | "distance";
    value: number;               // minutes or miles
    flexible: boolean;           // can extend/shorten based on feel
  };

  // Intensity prescription
  intensity: IntensityPrescription;

  // Terrain requirements
  terrain?: {
    type: "flat" | "rolling" | "hilly" | "mountainous" | "track" | "trail" | "any";
    elevationTarget?: number;    // feet of gain for this block
  };

  // Block-specific instructions
  instructions?: string;

  // For interval blocks: repeat structure
  repeat?: {
    times: number;
    restBetween: WorkoutBlock;   // nested block for rest intervals
  };
}

type BlockType =
  | "warmup"
  | "cooldown"
  | "easy"
  | "steady"
  | "tempo"
  | "threshold"
  | "interval"
  | "sprint"
  | "hill"
  | "recovery_jog"
  | "walk"
  | "rest"
  | "strength_circuit"
  | "drills";

interface IntensityPrescription {
  // Multiple ways to prescribe intensity
  zone?: number;                  // 1-5
  heartRateRange?: {
    min: number;
    max: number;
  };
  paceRange?: {
    min: number;                  // seconds per mile
    max: number;
  };
  rpe?: number;                   // 1-10 perceived effort
  description: string;            // "Conversational pace" or "Hard but sustainable"
}
```

### 1.3 Plan Structure

```typescript
interface TrainingPlanV2 {
  id: string;
  userId: string;
  version: 2;

  // Plan metadata
  name: string;                   // "24-Week 50K Plan for Austin"
  goal: RaceGoal;

  // Timing
  startDate: number;
  endDate: number;
  totalWeeks: number;
  currentWeek: number;

  // Periodization structure
  mesocycles: Mesocycle[];        // 3-6 week training blocks

  // Weekly plans
  weeks: WeekPlanV2[];

  // Athlete-specific calibration
  zones: {
    heartRate: HeartRateZone[];
    pace: PaceZone[];
  };

  // Plan generation context
  generation: {
    generatedAt: number;
    fitnessProfileSnapshot: AthleteFitnessProfile;
    agentDecisions: AgentDecision[];  // Audit trail of planning decisions
    methodology: string[];            // Which book sections were referenced
  };

  // Adaptation tracking
  adaptations: PlanAdaptation[];     // Log of changes made post-generation
}

interface Mesocycle {
  id: string;
  name: string;                      // "Base 1", "Build 2", "Peak"
  phase: "base" | "build" | "peak" | "taper" | "recovery";
  weekRange: { start: number; end: number };

  // Mesocycle goals
  primaryFocus: string;              // "Aerobic development"
  secondaryFocus?: string;           // "Strength maintenance"

  // Volume progression
  volumeProgression: "ascending" | "descending" | "wave" | "stable";
  peakWeekNumber: number;            // Which week is highest volume

  // Key workouts introduced/maintained in this mesocycle
  keyWorkouts: string[];             // ["Hill repeats", "Back-to-back long runs"]
}

interface WeekPlanV2 {
  weekNumber: number;
  startDate: number;
  phase: string;
  mesocycleId: string;

  // Volume targets
  targets: {
    totalMiles: { min: number; max: number };
    totalVertical: { min: number; max: number };
    totalHours: { min: number; max: number };
    trainingStress: { min: number; max: number };
  };

  // Planned workouts
  workouts: StructuredWorkout[];

  // Week-level coaching
  weekFocus: string;
  coachingNotes: string[];

  // For adaptive planning
  status: "planned" | "in_progress" | "completed";
  actualVolume?: {
    totalMiles: number;
    totalVertical: number;
    totalHours: number;
    trainingStress: number;
    complianceRate: number;        // 0-1, how much of plan was executed
  };
}
```

---

## Part 2: Strava Integration

### 2.1 OAuth Flow

```typescript
// Strava OAuth configuration
interface StravaConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: ["read", "activity:read", "activity:read_all"];
}

// User's Strava connection
interface StravaConnection {
  userId: string;
  athleteId: number;
  accessToken: string;           // encrypted at rest
  refreshToken: string;          // encrypted at rest
  expiresAt: number;
  scope: string[];
  connectedAt: number;
  lastSync: number;
}
```

### 2.2 Activity Sync Service

```typescript
// Service for syncing Strava activities
class StravaActivityService {
  // Initial sync: fetch last 12 weeks of activities
  async initialSync(userId: string): Promise<ActivitySummary[]>;

  // Incremental sync: fetch activities since last sync
  async incrementalSync(userId: string): Promise<ActivitySummary[]>;

  // Detailed activity fetch (for specific analysis)
  async getActivityDetails(activityId: number): Promise<DetailedActivity>;

  // Stream data for deep analysis (HR, pace, elevation)
  async getActivityStreams(activityId: number): Promise<ActivityStreams>;
}

interface ActivitySummary {
  id: number;                     // Strava activity ID
  name: string;
  type: "Run" | "Trail Run" | "Virtual Run" | "Workout";
  startDate: number;

  // Core metrics
  distance: number;               // meters
  duration: number;               // seconds
  elevationGain: number;          // meters

  // Optional metrics (if available)
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePace?: number;           // seconds per meter

  // Calculated
  trainingStress?: number;        // TSS-like score
  intensityFactor?: number;       // IF
}

interface DetailedActivity extends ActivitySummary {
  // Lap/split data
  laps: Lap[];
  splits: Split[];

  // Best efforts
  bestEfforts: BestEffort[];      // e.g., fastest 5K, 10K within activity

  // Segment performance
  segmentEfforts: SegmentEffort[];
}

interface ActivityStreams {
  time: number[];
  distance: number[];
  heartRate?: number[];
  pace?: number[];
  altitude?: number[];
  cadence?: number[];
  grade?: number[];               // gradient percentage
}
```

### 2.3 Fitness Calculation Engine

```typescript
// Calculate fitness metrics from activity history
class FitnessCalculator {
  // Calculate Training Stress Score for an activity
  calculateTSS(activity: ActivitySummary, zones: HeartRateZone[]): number;

  // Calculate chronic training load (fitness)
  calculateCTL(activities: ActivitySummary[], days: number = 42): number;

  // Calculate acute training load (fatigue)
  calculateATL(activities: ActivitySummary[], days: number = 7): number;

  // Calculate training stress balance (form)
  calculateTSB(ctl: number, atl: number): number;

  // Estimate threshold pace from recent activities
  estimateThresholdPace(activities: DetailedActivity[]): number;

  // Derive heart rate zones from max HR and activity data
  deriveHeartRateZones(activities: DetailedActivity[]): HeartRateZone[];

  // Analyze elevation proficiency
  analyzeElevationProficiency(activities: DetailedActivity[]): ElevationProfile;
}
```

---

## Part 3: Agentic Plan Generation

### 3.1 Agent Architecture Overview

Inspired by Claude Code's architecture, V2 uses specialized agents orchestrated by a central planner.

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                          │
│  Coordinates the plan generation process, delegates to          │
│  specialists, validates outputs, handles conflicts              │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  ANALYST AGENT  │  │ PERIODIZATION   │  │   WORKOUT       │
│                 │  │     AGENT       │  │   DESIGNER      │
│  Analyzes user  │  │                 │  │                 │
│  fitness data,  │  │  Designs macro  │  │  Creates daily  │
│  derives zones, │  │  structure:     │  │  workout blocks │
│  identifies     │  │  phases, meso-  │  │  based on phase │
│  strengths/     │  │  cycles, volume │  │  and athlete    │
│  limiters       │  │  progression    │  │  profile        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    VALIDATOR    │  │   ADAPTATION    │  │   METHODOLOGY   │
│      AGENT      │  │      AGENT      │  │   CONSULTANT    │
│                 │  │                 │  │                 │
│  Checks plan    │  │  Adjusts plan   │  │  RAG over book  │
│  for safety,    │  │  based on       │  │  content,       │
│  progression    │  │  execution      │  │  provides       │
│  limits, injury │  │  feedback and   │  │  evidence-based │
│  risk           │  │  real results   │  │  guidance       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3.2 Agent Definitions

```typescript
// Base agent interface
interface PlanAgent {
  id: string;
  name: string;
  description: string;

  // Agent's specific tools/capabilities
  tools: AgentTool[];

  // Execute the agent's task
  execute(input: AgentInput): Promise<AgentOutput>;
}

// Orchestrator: The main coordinator
interface OrchestratorAgent extends PlanAgent {
  // Plan generation phases
  phases: [
    "analyze_athlete",
    "design_periodization",
    "generate_workouts",
    "validate_plan",
    "finalize"
  ];

  // Conflict resolution between agents
  resolveConflict(conflict: AgentConflict): AgentDecision;

  // Quality check on final plan
  finalReview(plan: TrainingPlanV2): ReviewResult;
}

// Analyst: Understands the athlete
interface AnalystAgent extends PlanAgent {
  analyzeStravaData(activities: ActivitySummary[]): AthleteAnalysis;
  deriveTrainingZones(analysis: AthleteAnalysis): ZoneConfig;
  identifyLimiters(analysis: AthleteAnalysis): Limiter[];
  assessReadiness(profile: AthleteFitnessProfile, goal: RaceGoal): ReadinessAssessment;
}

interface AthleteAnalysis {
  currentFitness: {
    ctl: number;
    atl: number;
    tsb: number;
  };
  volumeTrend: "increasing" | "stable" | "decreasing";
  consistencyScore: number;      // 0-1, how regularly they train
  strengthAreas: string[];       // e.g., "climbing", "endurance"
  limiters: Limiter[];           // e.g., "speed", "descending"
  injuryRiskFactors: string[];
  recommendedStartingVolume: {
    weekly: { miles: number; hours: number };
    longRun: { miles: number };
  };
}

interface Limiter {
  area: string;
  severity: "minor" | "moderate" | "significant";
  evidence: string;              // What data supports this
  recommendation: string;        // How to address it
}

// Periodization: Macro planning
interface PeriodizationAgent extends PlanAgent {
  designMesocycles(
    goal: RaceGoal,
    currentFitness: AthleteAnalysis,
    constraints: TrainingConstraints
  ): Mesocycle[];

  calculateVolumeProgression(
    mesocycles: Mesocycle[],
    startingVolume: number,
    peakVolume: number
  ): WeeklyVolumeTarget[];
}

// Workout Designer: Creates individual workouts
interface WorkoutDesignerAgent extends PlanAgent {
  generateWeekWorkouts(
    weekNumber: number,
    mesocycle: Mesocycle,
    volumeTarget: WeeklyVolumeTarget,
    athleteProfile: AthleteFitnessProfile,
    constraints: TrainingConstraints
  ): StructuredWorkout[];

  createWorkoutBlocks(
    workoutType: WorkoutType,
    duration: number,
    zones: ZoneConfig
  ): WorkoutBlock[];
}

// Validator: Safety and quality checks
interface ValidatorAgent extends PlanAgent {
  validateWeek(week: WeekPlanV2, previousWeek?: WeekPlanV2): ValidationResult;
  validateProgression(weeks: WeekPlanV2[]): ValidationResult;
  checkInjuryRisk(plan: TrainingPlanV2, profile: AthleteFitnessProfile): RiskAssessment;
}

interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  suggestions: string[];
}

interface ValidationWarning {
  type: "volume_spike" | "insufficient_recovery" | "missing_workout_type" | "intensity_distribution";
  message: string;
  weekNumber?: number;
  severity: "low" | "medium" | "high";
}

// Methodology Consultant: RAG over training book
interface MethodologyAgent extends PlanAgent {
  // Query the training book for relevant guidance
  consultBook(query: string): MethodologyGuidance;

  // Get workout templates from book
  getWorkoutTemplate(workoutType: WorkoutType, phase: string): WorkoutTemplate;

  // Validate approach against methodology
  validateApproach(decision: AgentDecision): MethodologyAlignment;
}

interface MethodologyGuidance {
  relevantSections: BookSection[];
  keyPrinciples: string[];
  specificRecommendations: string[];
  caveats: string[];
}

// Adaptation: Post-generation adjustments
interface AdaptationAgent extends PlanAgent {
  analyzeExecutionGap(
    planned: WeekPlanV2,
    actual: ActivitySummary[]
  ): ExecutionAnalysis;

  proposeAdaptation(
    analysis: ExecutionAnalysis,
    remainingPlan: WeekPlanV2[]
  ): PlanAdaptation;
}

interface PlanAdaptation {
  id: string;
  timestamp: number;
  reason: string;
  type: "volume_reduction" | "volume_increase" | "workout_swap" | "recovery_insertion" | "goal_adjustment";
  changes: PlanChange[];
  approved: boolean;
  appliedAt?: number;
}
```

### 3.3 Agent Orchestration Flow

```typescript
// The main plan generation pipeline
async function generatePlanV2(
  userId: string,
  goal: RaceGoal,
  constraints: TrainingConstraints
): Promise<TrainingPlanV2> {

  const orchestrator = new OrchestratorAgent();
  const context: PlanGenerationContext = {
    userId,
    goal,
    constraints,
    decisions: [],
    currentPhase: "analyze_athlete"
  };

  // Phase 1: Analyze Athlete
  // ========================
  const analyst = new AnalystAgent();

  // Fetch and analyze Strava data
  const activities = await stravaService.getRecentActivities(userId, 12); // 12 weeks
  const analysis = await analyst.analyzeStravaData(activities);
  const zones = await analyst.deriveTrainingZones(analysis);
  const readiness = await analyst.assessReadiness(analysis, goal);

  context.athleteAnalysis = analysis;
  context.zones = zones;
  context.decisions.push({
    agent: "analyst",
    decision: "Starting volume recommendation",
    value: analysis.recommendedStartingVolume,
    reasoning: readiness.reasoning
  });

  // Check if goal is realistic
  if (!readiness.isRealistic) {
    // Orchestrator intervenes
    const adjustedGoal = await orchestrator.negotiateGoal(goal, readiness);
    context.goal = adjustedGoal;
  }

  // Phase 2: Design Periodization
  // =============================
  context.currentPhase = "design_periodization";
  const periodizationAgent = new PeriodizationAgent();
  const methodologyAgent = new MethodologyAgent();

  // Consult methodology for periodization principles
  const periodizationGuidance = await methodologyAgent.consultBook(
    `periodization for ${goal.raceDistance} with ${context.athleteAnalysis.currentFitness.ctl} CTL`
  );

  // Design mesocycle structure
  const mesocycles = await periodizationAgent.designMesocycles(
    context.goal,
    context.athleteAnalysis,
    constraints
  );

  // Calculate volume progression
  const volumeProgression = await periodizationAgent.calculateVolumeProgression(
    mesocycles,
    analysis.recommendedStartingVolume.weekly.miles,
    calculatePeakVolume(goal, analysis)
  );

  context.mesocycles = mesocycles;
  context.volumeProgression = volumeProgression;

  // Phase 3: Generate Workouts
  // ==========================
  context.currentPhase = "generate_workouts";
  const workoutDesigner = new WorkoutDesignerAgent();

  const weeks: WeekPlanV2[] = [];

  for (let weekNum = 1; weekNum <= goal.totalWeeks; weekNum++) {
    const mesocycle = findMesocycle(mesocycles, weekNum);
    const volumeTarget = volumeProgression[weekNum - 1];

    // Generate workouts for this week
    const workouts = await workoutDesigner.generateWeekWorkouts(
      weekNum,
      mesocycle,
      volumeTarget,
      context.athleteProfile,
      constraints
    );

    weeks.push({
      weekNumber: weekNum,
      startDate: calculateWeekStart(goal.startDate, weekNum),
      phase: mesocycle.phase,
      mesocycleId: mesocycle.id,
      targets: volumeTarget,
      workouts,
      weekFocus: mesocycle.primaryFocus,
      coachingNotes: [],
      status: "planned"
    });
  }

  // Phase 4: Validate Plan
  // ======================
  context.currentPhase = "validate_plan";
  const validator = new ValidatorAgent();

  // Validate each week and overall progression
  const validationResult = await validator.validateProgression(weeks);

  if (!validationResult.valid) {
    // Orchestrator coordinates fixes
    for (const error of validationResult.errors) {
      const fix = await orchestrator.resolvePlanError(error, weeks, context);
      applyFix(weeks, fix);
    }

    // Re-validate
    const revalidation = await validator.validateProgression(weeks);
    if (!revalidation.valid) {
      throw new PlanGenerationError("Could not resolve validation errors", revalidation.errors);
    }
  }

  // Add coaching notes based on warnings
  for (const warning of validationResult.warnings) {
    addCoachingNote(weeks, warning);
  }

  // Phase 5: Finalize
  // =================
  context.currentPhase = "finalize";

  const plan: TrainingPlanV2 = {
    id: generateId(),
    userId,
    version: 2,
    name: `${goal.totalWeeks}-Week ${goal.raceDistance} Plan`,
    goal,
    startDate: goal.startDate,
    endDate: calculateEndDate(goal),
    totalWeeks: goal.totalWeeks,
    currentWeek: 1,
    mesocycles,
    weeks,
    zones: context.zones,
    generation: {
      generatedAt: Date.now(),
      fitnessProfileSnapshot: context.athleteProfile,
      agentDecisions: context.decisions,
      methodology: periodizationGuidance.relevantSections.map(s => s.id)
    },
    adaptations: []
  };

  // Final orchestrator review
  const review = await orchestrator.finalReview(plan);
  if (review.issues.length > 0) {
    await orchestrator.applyFinalFixes(plan, review.issues);
  }

  return plan;
}
```

### 3.4 Skills Library

Skills are reusable, atomic operations that agents can invoke.

```typescript
// Skills are atomic, reusable operations
interface Skill {
  name: string;
  description: string;
  execute(params: SkillParams): Promise<SkillResult>;
}

// Example skills
const skills = {
  // Volume calculation skills
  calculateWeeklyTSS: {
    name: "calculate_weekly_tss",
    description: "Calculate target Training Stress Score for a week",
    execute: ({ weekNumber, phase, peakTSS, totalWeeks }) => { /* ... */ }
  },

  // Workout creation skills
  createIntervalSession: {
    name: "create_interval_session",
    description: "Create a structured interval workout",
    execute: ({ targetZone, totalDuration, intervalDuration, restDuration, zones }) => { /* ... */ }
  },

  createLongRun: {
    name: "create_long_run",
    description: "Create a long run workout with optional race-pace sections",
    execute: ({ duration, terrain, includeRacePace, zones }) => { /* ... */ }
  },

  createTempoRun: {
    name: "create_tempo_run",
    description: "Create a tempo/threshold run",
    execute: ({ tempoMinutes, warmupMinutes, cooldownMinutes, zones }) => { /* ... */ }
  },

  createHillSession: {
    name: "create_hill_session",
    description: "Create a hill repeat workout",
    execute: ({ hillDuration, restDuration, repeats, terrain, zones }) => { /* ... */ }
  },

  createRecoveryRun: {
    name: "create_recovery_run",
    description: "Create a recovery/easy run",
    execute: ({ duration, zones }) => { /* ... */ }
  },

  createStrengthWorkout: {
    name: "create_strength_workout",
    description: "Create a strength training session",
    execute: ({ focus, duration, equipment }) => { /* ... */ }
  },

  // Validation skills
  checkVolumeProgression: {
    name: "check_volume_progression",
    description: "Validate week-over-week volume increases stay within safe limits",
    execute: ({ previousWeek, currentWeek, maxIncreasePercent }) => { /* ... */ }
  },

  checkIntensityDistribution: {
    name: "check_intensity_distribution",
    description: "Verify 80/20 or polarized distribution",
    execute: ({ workouts, targetEasyPercent, targetHardPercent }) => { /* ... */ }
  },

  checkRecoveryAdequacy: {
    name: "check_recovery_adequacy",
    description: "Ensure sufficient recovery between hard sessions",
    execute: ({ workouts, minEasyDaysBetweenHard }) => { /* ... */ }
  },

  // Zone calculation skills
  calculateHRZones: {
    name: "calculate_hr_zones",
    description: "Calculate heart rate zones from max HR or threshold HR",
    execute: ({ maxHR, thresholdHR, method }) => { /* ... */ }
  },

  calculatePaceZones: {
    name: "calculate_pace_zones",
    description: "Calculate pace zones from threshold pace or race times",
    execute: ({ thresholdPace, recentRaces }) => { /* ... */ }
  },

  // Methodology skills
  lookupBookSection: {
    name: "lookup_book_section",
    description: "Find relevant section in training book using semantic search",
    execute: ({ query, topK }) => { /* ... */ }
  },

  getWorkoutExamples: {
    name: "get_workout_examples",
    description: "Get example workouts from the book for a given type and phase",
    execute: ({ workoutType, phase, athleteLevel }) => { /* ... */ }
  }
};
```

---

## Part 4: Methodology Integration (RAG)

### 4.1 Book Embedding & Retrieval

Replace the 14,000-line context dump with semantic search.

```typescript
// Chunk the book into meaningful sections
interface BookChunk {
  id: string;
  section: string;           // "Chapter 5: Heart Rate Training"
  subsection?: string;       // "Determining Your Zones"
  content: string;           // Actual text
  embedding: number[];       // Vector embedding
  metadata: {
    topics: string[];        // ["heart rate", "zones", "lactate"]
    workoutTypes: string[];  // ["tempo", "intervals"]
    phases: string[];        // ["base", "build"]
    athleteLevel: string[];  // ["beginner", "intermediate"]
  };
}

// Semantic search over book content
class MethodologyRAG {
  private vectorStore: VectorStore;

  async indexBook(bookContent: string): Promise<void> {
    const chunks = this.chunkBook(bookContent);
    const embeddings = await this.embedChunks(chunks);
    await this.vectorStore.upsert(embeddings);
  }

  async query(question: string, topK: number = 5): Promise<BookChunk[]> {
    const queryEmbedding = await this.embed(question);
    return this.vectorStore.search(queryEmbedding, topK);
  }

  async getRelevantContext(
    workoutType: WorkoutType,
    phase: string,
    athleteLevel: string
  ): Promise<BookChunk[]> {
    // Hybrid search: semantic + metadata filtering
    return this.vectorStore.hybridSearch({
      query: `${phase} phase ${workoutType} workout design`,
      filters: {
        workoutTypes: [workoutType],
        phases: [phase],
        athleteLevel: [athleteLevel]
      },
      topK: 3
    });
  }
}
```

### 4.2 Embedding Pipeline

```typescript
// Process the book into searchable chunks
async function processTrainingBook(): Promise<void> {
  const bookContent = await fs.readFile("lib/optimized_book.md", "utf-8");

  // Parse markdown structure
  const sections = parseMarkdownSections(bookContent);

  // Create chunks with overlap
  const chunks: BookChunk[] = [];
  for (const section of sections) {
    const sectionChunks = chunkWithOverlap(section, {
      maxTokens: 500,
      overlap: 50
    });

    for (const chunk of sectionChunks) {
      chunks.push({
        id: generateId(),
        section: section.title,
        subsection: chunk.subsection,
        content: chunk.text,
        embedding: [], // Will be filled
        metadata: extractMetadata(chunk)
      });
    }
  }

  // Generate embeddings (batch for efficiency)
  const embeddings = await generateEmbeddings(
    chunks.map(c => c.content),
    { model: "text-embedding-3-small" }
  );

  // Store in vector database
  await vectorStore.upsert(
    chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }))
  );
}
```

---

## Part 5: Adaptive Planning

### 5.1 Execution Feedback Loop

```typescript
// After each completed workout, analyze and potentially adapt
class PlanAdaptationService {
  async processCompletedWorkout(
    userId: string,
    plannedWorkout: StructuredWorkout,
    actualActivity: ActivitySummary
  ): Promise<void> {
    // Link the activity to the workout
    await linkActivityToWorkout(plannedWorkout.id, actualActivity.id);

    // Calculate execution metrics
    const executionAnalysis = analyzeExecution(plannedWorkout, actualActivity);

    // Check for concerning patterns
    if (executionAnalysis.significantDeviation) {
      await this.flagForReview(userId, executionAnalysis);
    }

    // Update rolling metrics
    await this.updateRollingMetrics(userId, actualActivity);
  }

  async weeklyReview(userId: string): Promise<AdaptationRecommendation[]> {
    const plan = await getPlan(userId);
    const completedWeek = getCurrentWeek(plan);
    const plannedWorkouts = completedWeek.workouts;
    const actualActivities = await getWeekActivities(userId, completedWeek);

    // Analyze the gap
    const analysis = await adaptationAgent.analyzeExecutionGap(
      completedWeek,
      actualActivities
    );

    const recommendations: AdaptationRecommendation[] = [];

    // Volume check
    if (analysis.volumeCompliance < 0.7) {
      // Significantly under-trained
      recommendations.push({
        type: "volume_reduction",
        reason: `Only completed ${Math.round(analysis.volumeCompliance * 100)}% of planned volume`,
        suggestion: "Reduce next week's volume by 10-15%",
        automatic: false  // Requires user approval
      });
    }

    if (analysis.volumeCompliance > 1.2) {
      // Over-trained
      recommendations.push({
        type: "recovery_insertion",
        reason: "Exceeded planned volume by 20%+",
        suggestion: "Add extra recovery day or reduce next hard session",
        automatic: true  // Can apply automatically
      });
    }

    // Intensity check
    if (analysis.missedKeyWorkouts.length > 0) {
      recommendations.push({
        type: "workout_reschedule",
        reason: `Missed key workout: ${analysis.missedKeyWorkouts[0].type}`,
        suggestion: "Consider moving to next week if still in same mesocycle",
        automatic: false
      });
    }

    // Fatigue check
    if (analysis.estimatedTSB < -25) {
      recommendations.push({
        type: "recovery_insertion",
        reason: "High fatigue detected (TSB below -25)",
        suggestion: "Insert recovery week or reduce upcoming volume",
        automatic: false,
        priority: "high"
      });
    }

    return recommendations;
  }

  async applyAdaptation(
    userId: string,
    adaptation: PlanAdaptation
  ): Promise<void> {
    const plan = await getPlan(userId);

    // Apply changes to plan
    for (const change of adaptation.changes) {
      applyChange(plan, change);
    }

    // Log the adaptation
    plan.adaptations.push({
      ...adaptation,
      appliedAt: Date.now()
    });

    await savePlan(plan);
  }
}
```

### 5.2 Automatic Adjustments

```typescript
// Rules for automatic adjustments (no user approval needed)
const automaticAdjustmentRules = [
  {
    condition: (analysis: ExecutionAnalysis) =>
      analysis.missedDays >= 3 && analysis.reason === "illness",
    action: "extend_recovery",
    description: "Extended recovery after illness"
  },
  {
    condition: (analysis: ExecutionAnalysis) =>
      analysis.estimatedACR > 1.5,  // Acute:Chronic ratio danger zone
    action: "reduce_volume_10_percent",
    description: "Volume reduction due to high injury risk"
  },
  {
    condition: (analysis: ExecutionAnalysis) =>
      analysis.consistentOverperformance && analysis.weeksAtLevel >= 3,
    action: "increase_targets_5_percent",
    description: "Progressive overload based on consistent execution"
  }
];
```

---

## Part 6: API Design

### 6.1 New API Routes

```
/api/v2/
├── strava/
│   ├── connect/route.ts         # OAuth initiation
│   ├── callback/route.ts        # OAuth callback
│   ├── sync/route.ts            # Manual sync trigger
│   └── disconnect/route.ts      # Revoke access
│
├── fitness/
│   ├── profile/route.ts         # GET athlete fitness profile
│   ├── zones/route.ts           # GET/PUT training zones
│   └── analysis/route.ts        # GET detailed analysis
│
├── plan/
│   ├── generate/route.ts        # POST generate new plan
│   ├── [planId]/
│   │   ├── route.ts             # GET/DELETE plan
│   │   ├── weeks/route.ts       # GET all weeks
│   │   ├── weeks/[weekNum]/route.ts     # GET specific week
│   │   └── workouts/[workoutId]/route.ts # GET/PUT workout
│   │
│   ├── adapt/route.ts           # POST trigger adaptation review
│   └── adapt/[adaptationId]/route.ts    # POST apply/reject adaptation
│
└── workouts/
    ├── link/route.ts            # POST link Strava activity to workout
    └── complete/route.ts        # POST mark workout complete (manual)
```

### 6.2 RTK Query API Slices

```typescript
// lib/store/api/planApiV2.ts
export const planApiV2 = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Generate new plan
    generatePlanV2: builder.mutation<TrainingPlanV2, GeneratePlanRequest>({
      query: (body) => ({
        url: "/api/v2/plan/generate",
        method: "POST",
        body
      }),
      invalidatesTags: ["TrainingPlan"]
    }),

    // Get current plan
    getCurrentPlan: builder.query<TrainingPlanV2, string>({
      query: (userId) => `/api/v2/plan/current?userId=${userId}`,
      providesTags: ["TrainingPlan"]
    }),

    // Get week details
    getWeek: builder.query<WeekPlanV2, { planId: string; weekNum: number }>({
      query: ({ planId, weekNum }) =>
        `/api/v2/plan/${planId}/weeks/${weekNum}`,
      providesTags: (result, error, { weekNum }) =>
        [{ type: "TrainingPlan", id: `week-${weekNum}` }]
    }),

    // Update workout
    updateWorkout: builder.mutation<StructuredWorkout, UpdateWorkoutRequest>({
      query: ({ planId, workoutId, ...body }) => ({
        url: `/api/v2/plan/${planId}/workouts/${workoutId}`,
        method: "PUT",
        body
      }),
      invalidatesTags: ["TrainingPlan"]
    }),

    // Get adaptation recommendations
    getAdaptations: builder.query<AdaptationRecommendation[], string>({
      query: (planId) => `/api/v2/plan/${planId}/adapt`,
      providesTags: ["PlanAdaptation"]
    }),

    // Apply adaptation
    applyAdaptation: builder.mutation<void, ApplyAdaptationRequest>({
      query: ({ planId, adaptationId }) => ({
        url: `/api/v2/plan/${planId}/adapt/${adaptationId}`,
        method: "POST"
      }),
      invalidatesTags: ["TrainingPlan", "PlanAdaptation"]
    })
  })
});

// lib/store/api/stravaApi.ts
export const stravaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get connection status
    getStravaConnection: builder.query<StravaConnection | null, string>({
      query: (userId) => `/api/v2/strava/status?userId=${userId}`,
      providesTags: ["StravaConnection"]
    }),

    // Trigger sync
    syncStrava: builder.mutation<SyncResult, string>({
      query: (userId) => ({
        url: "/api/v2/strava/sync",
        method: "POST",
        body: { userId }
      }),
      invalidatesTags: ["StravaActivities", "FitnessProfile"]
    }),

    // Disconnect
    disconnectStrava: builder.mutation<void, string>({
      query: (userId) => ({
        url: "/api/v2/strava/disconnect",
        method: "POST",
        body: { userId }
      }),
      invalidatesTags: ["StravaConnection", "StravaActivities"]
    })
  })
});

// lib/store/api/fitnessApi.ts
export const fitnessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get fitness profile
    getFitnessProfile: builder.query<AthleteFitnessProfile, string>({
      query: (userId) => `/api/v2/fitness/profile?userId=${userId}`,
      providesTags: ["FitnessProfile"]
    }),

    // Get/update zones
    getZones: builder.query<ZoneConfig, string>({
      query: (userId) => `/api/v2/fitness/zones?userId=${userId}`,
      providesTags: ["TrainingZones"]
    }),

    updateZones: builder.mutation<ZoneConfig, UpdateZonesRequest>({
      query: ({ userId, zones }) => ({
        url: "/api/v2/fitness/zones",
        method: "PUT",
        body: { userId, zones }
      }),
      invalidatesTags: ["TrainingZones"]
    })
  })
});
```

---

## Part 7: UI/UX Considerations

### 7.1 New Onboarding Flow

```
1. Welcome & Account Creation (Clerk - existing)
   ↓
2. Strava Connection (NEW)
   - Explain benefits
   - OAuth flow
   - Handle "Skip for now" gracefully
   ↓
3. Fitness Analysis (NEW - if Strava connected)
   - Show syncing progress
   - Display derived metrics
   - Allow zone adjustments
   ↓
4. Goal Setting (enhanced)
   - Race selection
   - Date picker
   - Readiness assessment shown
   ↓
5. Constraints (NEW)
   - Available days
   - Time per week
   - Blackout dates
   - Equipment access
   ↓
6. Plan Generation (enhanced)
   - Show agent progress
   - Preview mesocycle structure
   - Allow phase adjustments
   ↓
7. Plan Review (NEW)
   - Full plan overview
   - Week-by-week preview
   - Confirm or request adjustments
   ↓
8. Complete → Dashboard
```

### 7.2 Workout Display Components

```typescript
// Component for displaying structured workout blocks
interface WorkoutBlockDisplayProps {
  block: WorkoutBlock;
  zones: ZoneConfig;
  compact?: boolean;
}

function WorkoutBlockDisplay({ block, zones, compact }: WorkoutBlockDisplayProps) {
  // Visual representation of block type + intensity
  // Color-coded by zone
  // Duration bar visualization
  // Expandable for details
}

// Full workout view with timeline
interface WorkoutTimelineProps {
  workout: StructuredWorkout;
  zones: ZoneConfig;
  showComparison?: ActivitySummary;  // Overlay actual vs planned
}

function WorkoutTimeline({ workout, zones, showComparison }: WorkoutTimelineProps) {
  // Horizontal timeline of blocks
  // Stacked bar for intensity distribution
  // Hover for block details
  // If showComparison: overlay actual HR/pace data
}
```

---

## Part 8: Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Define new TypeScript types (Part 1)
- [ ] Set up Strava OAuth flow
- [ ] Create Strava activity sync service
- [ ] Implement fitness calculation engine
- [ ] Set up vector store for book RAG

### Phase 2: Agent Framework (Weeks 3-4)
- [ ] Build base agent interface
- [ ] Implement Analyst Agent
- [ ] Implement Periodization Agent
- [ ] Implement Workout Designer Agent
- [ ] Implement Validator Agent
- [ ] Implement Orchestrator Agent

### Phase 3: Core Generation (Weeks 5-6)
- [ ] Build skills library
- [ ] Implement RAG methodology consultant
- [ ] Build end-to-end generation pipeline
- [ ] Create validation and safety checks
- [ ] Test with sample athlete profiles

### Phase 4: API & Storage (Week 7)
- [ ] Implement new API routes
- [ ] Update Firestore schema
- [ ] Create RTK Query slices
- [ ] Migration utility for v1 plans

### Phase 5: UI/UX (Weeks 8-9)
- [ ] New onboarding flow
- [ ] Strava connection UI
- [ ] Workout block components
- [ ] Plan overview/review screens
- [ ] Week detail views

### Phase 6: Adaptation (Week 10)
- [ ] Activity-workout linking
- [ ] Weekly review system
- [ ] Adaptation recommendation engine
- [ ] Adaptation approval flow

### Phase 7: Polish & Launch (Weeks 11-12)
- [ ] Error handling refinement
- [ ] Performance optimization
- [ ] Documentation
- [ ] Beta testing
- [ ] Launch

---

## Part 9: Technical Considerations

### 9.1 LLM Usage Optimization

```typescript
// Agent-specific model selection
const agentModels = {
  orchestrator: "claude-sonnet-4",      // Needs reasoning
  analyst: "claude-haiku",               // Data processing, fast
  periodization: "claude-sonnet-4",      // Complex decisions
  workoutDesigner: "claude-haiku",       // Template-based, fast
  validator: "claude-haiku",             // Rule checking, fast
  methodologyRAG: "claude-haiku",        // Query + summarize
  adaptationAgent: "claude-sonnet-4"     // Nuanced decisions
};

// Caching strategy
const cacheStrategy = {
  // Cache book embeddings indefinitely
  bookEmbeddings: { ttl: "infinite" },

  // Cache fitness profile for 1 hour
  fitnessProfile: { ttl: 3600 },

  // Cache Strava activities for 15 minutes
  stravaActivities: { ttl: 900 },

  // Don't cache plan generation (unique per request)
  planGeneration: { ttl: 0 }
};
```

### 9.2 Error Handling

```typescript
// Graceful degradation
const fallbackStrategies = {
  // If Strava fails, use self-reported data
  stravaFailure: async (userId: string) => {
    console.warn("Strava sync failed, using self-reported data");
    return createProfileFromSelfReported(userId);
  },

  // If RAG fails, use cached common sections
  ragFailure: async (query: string) => {
    console.warn("RAG query failed, using default methodology");
    return getCachedDefaultMethodology();
  },

  // If agent fails, orchestrator retries with simpler approach
  agentFailure: async (agent: string, error: Error) => {
    console.warn(`${agent} failed: ${error.message}`);
    return getSimplifiedFallback(agent);
  }
};
```

### 9.3 Observability

```typescript
// Track agent decisions for debugging and improvement
interface AgentTrace {
  traceId: string;
  userId: string;
  timestamp: number;

  agents: AgentExecution[];
  totalDuration: number;
  tokenUsage: {
    input: number;
    output: number;
    byAgent: Record<string, { input: number; output: number }>;
  };

  // For debugging
  rawOutputs: Record<string, unknown>;
  validationResults: ValidationResult[];
}

// Log all agent executions
async function executeWithTracing<T>(
  agent: PlanAgent,
  input: AgentInput,
  traceId: string
): Promise<T> {
  const start = Date.now();

  try {
    const result = await agent.execute(input);

    logAgentExecution({
      traceId,
      agent: agent.id,
      duration: Date.now() - start,
      success: true,
      inputTokens: countTokens(input),
      outputTokens: countTokens(result)
    });

    return result;
  } catch (error) {
    logAgentExecution({
      traceId,
      agent: agent.id,
      duration: Date.now() - start,
      success: false,
      error: error.message
    });
    throw error;
  }
}
```

---

## Part 10: Future Extensions

### 10.1 Additional Integrations
- **Garmin Connect**: Alternative to Strava
- **TrainingPeaks**: For athletes who use it
- **Whoop/Oura**: Recovery and readiness data
- **Weather API**: Adjust workouts for conditions

### 10.2 Advanced Features
- **Social Training**: Train with friends, compare plans
- **Race Predictor**: ML-based race time predictions
- **Injury Prevention**: Pattern recognition for injury risk
- **Nutrition Integration**: Fueling recommendations

### 10.3 Coach Mode
- **Coach Dashboard**: Manage multiple athletes
- **Plan Templates**: Reusable plan structures
- **Override Controls**: Coach can manually adjust
- **Communication**: In-app messaging with athletes

---

## Appendix A: Strava API Reference

```typescript
// Key Strava endpoints we'll use
const stravaEndpoints = {
  // OAuth
  authorize: "https://www.strava.com/oauth/authorize",
  token: "https://www.strava.com/oauth/token",

  // Athlete
  athlete: "GET /athlete",
  athleteZones: "GET /athlete/zones",

  // Activities
  activities: "GET /athlete/activities",
  activity: "GET /activities/{id}",
  activityStreams: "GET /activities/{id}/streams",

  // Segments (for future use)
  segments: "GET /segments/{id}",
  starredSegments: "GET /segments/starred"
};

// Rate limits
const stravaRateLimits = {
  shortTerm: { requests: 100, window: "15 minutes" },
  daily: { requests: 1000, window: "24 hours" }
};
```

---

## Appendix B: Sample Agent Prompts

### Analyst Agent System Prompt

```
You are an expert running coach and sports scientist specializing in trail and ultra running.

Your task is to analyze an athlete's training data and provide actionable insights.

Given:
- 12 weeks of activity data from Strava
- Self-reported experience level and goals
- Any injury history

Analyze and return:
1. Current fitness level (CTL, ATL, TSB)
2. Training consistency score (0-1)
3. Strength areas (what they're good at)
4. Limiters (what's holding them back)
5. Recommended starting volume for a new plan
6. Any injury risk flags

Be specific and data-driven. Reference actual numbers from their training.
```

### Periodization Agent System Prompt

```
You are an expert running coach designing periodized training plans for trail and ultra runners.

You follow the principles from "Training for the Uphill Athlete":
- Aerobic base before intensity
- Polarized training distribution (80% easy, 20% hard)
- Progressive overload with recovery weeks
- Sport-specific preparation closer to race

Given:
- Athlete's current fitness profile
- Goal race (distance, date, terrain)
- Training constraints (available days, hours)
- Methodology context (from book)

Design:
1. Mesocycle structure (base → build → peak → taper)
2. Volume progression (weekly targets)
3. Key workouts for each phase
4. Recovery week placement

Output as structured JSON matching the Mesocycle[] schema.
```

### Workout Designer System Prompt

```
You are an expert running coach creating individual workouts for trail and ultra runners.

You have access to skills for creating different workout types:
- createIntervalSession
- createLongRun
- createTempoRun
- createHillSession
- createRecoveryRun
- createStrengthWorkout

Given:
- Week number and phase
- Volume targets (miles, hours, vertical)
- Athlete's zones (HR and pace)
- Available days and constraints
- Mesocycle focus

Create a week of workouts as structured blocks.
Ensure:
- Hard days followed by easy days
- Long run on preferred day
- Intensity distribution matches phase goals
- Total volume matches targets

Output as StructuredWorkout[] matching the schema.
```

---

## Conclusion

V2 of the plan builder transforms col.run from a simple prompt-based generator to an intelligent, adaptive coaching system. By integrating real training data, using specialized agents, and enabling continuous adaptation, we can deliver genuinely personalized training plans that evolve with the athlete.

The architecture is designed for extensibility—new agents, skills, and integrations can be added without rewriting the core system. This positions col.run to grow from a plan generator into a comprehensive training platform.
