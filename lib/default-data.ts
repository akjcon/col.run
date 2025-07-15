import {
  UserData,
  TrainingBackground,
  GeneratedProfile,
  TrainingZone,
  TrainingPhase,
  TrainingPlan,
  WeekPlan,
  Workout,
} from "./types";

// Default data that matches current hardcoded content - YOUR ACTUAL TRAINING PLAN
const defaultTrainingZones: TrainingZone[] = [
  {
    zone: "Zone 1",
    heartRate: "<130 HR",
    pace: "~9:30-10:00/mi",
    description:
      "Very Easy/Recovery - Feels almost too easy",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    zone: "Zone 2",
    heartRate: "130-140 HR",
    pace: "~8:30-9:00/mi",
    description:
      "Aerobic Capacity - Comfortable, conversational",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    zone: "Zone 3",
    heartRate: "140-165 HR",
    pace: "~7:00-8:00/mi",
    description:
      "Threshold - Comfortably hard, sustainable",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    zone: "Zone 4",
    heartRate: "165-180 HR",
    pace: "~6:30-7:00/mi",
    description:
      "Above Threshold - Hard, challenging effort",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    zone: "Zone 5",
    heartRate: "180+ HR",
    pace: "Sprint",
    description: "Max/Sprint - Very hard, unsustainable",
    color: "bg-red-50 text-red-700 border-red-200",
  },
];

const defaultTrainingPhases: TrainingPhase[] = [
  {
    weeks: "1-4",
    phase: "Base + Strength",
    miles: "45-50",
    vertical: "8,000-10,000 ft",
    focus:
      "Z1/Z2 aerobic work, strength foundation (strong base from skiing)",
  },
  {
    weeks: "5-8",
    phase: "Intensity Introduction",
    miles: "50-55",
    vertical: "10,000-12,000 ft",
    focus:
      "Add Zone 3 threshold work (140-165 HR), muscular endurance",
  },
  {
    weeks: "9-10",
    phase: "Race Specificity",
    miles: "50-55",
    vertical: "12,000+ ft",
    focus: "Zone 4 intervals (165-180 HR), race simulation",
  },
  {
    weeks: "11",
    phase: "Taper",
    miles: "30-35",
    vertical: "7,000 ft",
    focus: "Reduce volume, maintain sharpness",
  },
  {
    weeks: "12",
    phase: "Race Week",
    miles: "15-20",
    vertical: "2,000-3,000 ft",
    focus: "Final prep and race",
  },
];

const defaultBasePhaseWorkouts: Workout[] = [
  {
    day: "Monday",
    type: "Rest/Active Recovery",
    zone: "Recovery",
    description:
      "Complete rest or 20-30 min easy walk/bike",
    notes: "Full recovery after weekend long runs",
  },
  {
    day: "Tuesday",
    type: "Zone 1-2 Run + Strength",
    zone: "Zone 1-2",
    description: "6-8 miles Z1/Z2 with 8×15 sec pickups",
    details: [
      "Vertical: 1,000-1,500 ft",
      "Mix Z1 (<130 HR) and Z2 (130-140 HR) running",
      "Pickups: 8×15 sec @ Z4 effort (165-180 HR, 2 min recovery)",
      "PM: Stage 3 Strength Program",
    ],
    notes:
      "Use Z2 for base building given strong aerobic development",
  },
  {
    day: "Wednesday",
    type: "Zone 2 Sustained",
    zone: "Zone 2",
    description: "60-75 minutes sustained effort",
    details: [
      "Zone: Z2 (130-140 HR)",
      "Vertical: 1,500-2,000 ft",
    ],
    notes:
      "Focus on maintaining steady effort, practice race nutrition",
  },
  {
    day: "Thursday",
    type: "Recovery + Hill Sprints",
    zone: "Zone 1/5",
    description: "4-5 miles recovery run + hill sprints",
    details: [
      "AM: Zone 1 recovery run (<130 HR), 500 ft vertical",
      "PM: 8×10 sec maximum effort uphill (180+ HR, 2-3 min recovery)",
      "Core: 6 exercises × max reps",
    ],
    notes:
      "Focus on explosive power, full recovery between efforts",
  },
  {
    day: "Friday",
    type: "Easy Run",
    zone: "Zone 1",
    description: "5-6 miles easy pace",
    details: ["Vertical: 800 ft"],
    notes: "Keep it comfortable, prepare for weekend",
  },
  {
    day: "Saturday",
    type: "Long Run #1",
    zone: "Zone 1-2",
    description: "10-12 miles mountain-specific",
    details: [
      "Vertical: 2,500-3,000 ft",
      "Include some Z2 sections",
    ],
    notes: "Practice nutrition, focus on consistent effort",
  },
  {
    day: "Sunday",
    type: "Long Run #2",
    zone: "Zone 1",
    description: "8-10 miles back-to-back",
    details: [
      "Vertical: 2,000 ft",
      "Run on partially depleted glycogen",
    ],
    notes: "Stay aerobic, build aerobic capacity",
  },
];

export const createDefaultUserData = (): UserData => {
  // Create workout variations for different weeks
  const basePhaseWorkoutsWeek2: Workout[] = [
    {
      day: "Monday",
      type: "Rest/Active Recovery",
      zone: "Recovery",
      description:
        "Complete rest or gentle yoga/stretching",
      notes: "Full recovery, focus on mobility",
    },
    {
      day: "Tuesday",
      type: "Zone 1-2 Run + Strength",
      zone: "Zone 1-2",
      description: "7-9 miles Z1/Z2 with 6×20 sec pickups",
      details: [
        "Vertical: 1,200-1,800 ft",
        "Progressive effort from Z1 to Z2",
        "Pickups: 6×20 sec @ Z4 effort (165-180 HR, 90 sec recovery)",
        "PM: Stage 3 Strength Program",
      ],
      notes:
        "Slightly longer pickups than week 1 for progression",
    },
    {
      day: "Wednesday",
      type: "Zone 2 Sustained",
      zone: "Zone 2",
      description: "70-80 minutes sustained effort",
      details: [
        "Zone: Z2 (130-140 HR)",
        "Vertical: 1,800-2,200 ft",
      ],
      notes: "Build endurance, focus on consistent pacing",
    },
    {
      day: "Thursday",
      type: "Recovery + Hill Sprints",
      zone: "Zone 1/5",
      description: "5-6 miles recovery run + hill sprints",
      details: [
        "AM: Zone 1 recovery run (<130 HR), 600 ft vertical",
        "PM: 6×12 sec maximum effort uphill (180+ HR, 3 min recovery)",
        "Core: 8 exercises × max reps",
      ],
      notes:
        "Slightly longer sprints, maintain quality over quantity",
    },
    {
      day: "Friday",
      type: "Easy Run",
      zone: "Zone 1",
      description: "6-7 miles easy pace",
      details: ["Vertical: 1,000 ft"],
      notes: "Stay relaxed, prepare for weekend volume",
    },
    {
      day: "Saturday",
      type: "Long Run #1",
      zone: "Zone 1-2",
      description: "11-13 miles mountain-specific",
      details: [
        "Vertical: 2,800-3,200 ft",
        "Mix Z1 and Z2 as terrain dictates",
      ],
      notes: "Practice fueling every 45-60 minutes",
    },
    {
      day: "Sunday",
      type: "Long Run #2",
      zone: "Zone 1",
      description: "9-11 miles back-to-back",
      details: [
        "Vertical: 2,200 ft",
        "Start on tired legs from Saturday",
      ],
      notes:
        "Focus on mental toughness and form when fatigued",
    },
  ];

  const intensityPhaseWorkoutsWeek5: Workout[] = [
    {
      day: "Monday",
      type: "Rest/Active Recovery",
      zone: "Recovery",
      description: "Complete rest or 30 min easy walk",
      notes: "Recovery from intensity introduction",
    },
    {
      day: "Tuesday",
      type: "Zone 3 Threshold + Strength",
      zone: "Zone 3",
      description: "8-10 miles with 3×10 min Z3 intervals",
      details: [
        "Vertical: 1,500-2,000 ft",
        "Warm-up: 15 min Z1-Z2",
        "Main: 3×10 min Z3 (140-165 HR, 3 min Z1 recovery)",
        "Cool-down: 10 min Z1",
        "PM: Stage 3 Strength Program",
      ],
      notes:
        "First introduction to threshold work - should feel comfortably hard",
    },
    {
      day: "Wednesday",
      type: "Zone 2 Sustained",
      zone: "Zone 2",
      description: "75-85 minutes sustained effort",
      details: [
        "Zone: Z2 (130-140 HR)",
        "Vertical: 2,000-2,500 ft",
      ],
      notes: "Active recovery from threshold work",
    },
    {
      day: "Thursday",
      type: "Recovery + Hill Sprints",
      zone: "Zone 1/5",
      description:
        "5-6 miles recovery + neuromuscular work",
      details: [
        "AM: Zone 1 recovery run (<130 HR), 800 ft vertical",
        "PM: 8×8 sec maximum effort uphill (180+ HR, 3-4 min recovery)",
        "Core: 8 exercises × max reps",
      ],
      notes:
        "Maintain speed work while building aerobic base",
    },
    {
      day: "Friday",
      type: "Easy Run",
      zone: "Zone 1",
      description: "6-8 miles easy pace",
      details: ["Vertical: 1,200 ft"],
      notes: "Easy pace, prepare for weekend long efforts",
    },
    {
      day: "Saturday",
      type: "Long Run with Tempo",
      zone: "Zone 1-3",
      description: "12-14 miles with 20 min Z3 section",
      details: [
        "Vertical: 3,000-3,500 ft",
        "Build-up: 60 min Z1-Z2",
        "Tempo: 20 min Z3 (140-165 HR)",
        "Cool-down: remainder Z1",
      ],
      notes: "Practice race effort within long run context",
    },
    {
      day: "Sunday",
      type: "Long Run Recovery",
      zone: "Zone 1",
      description: "10-12 miles recovery pace",
      details: ["Vertical: 2,500 ft", "Full aerobic pace"],
      notes: "Build aerobic capacity on tired legs",
    },
  ];

  const weeks: WeekPlan[] = [
    {
      weekNumber: 1,
      phase: "Base + Strength",
      targetMiles: "45-50",
      targetVertical: "8,000-10,000 ft",
      workouts: defaultBasePhaseWorkouts,
    },
    {
      weekNumber: 2,
      phase: "Base + Strength",
      targetMiles: "45-50",
      targetVertical: "8,000-10,000 ft",
      workouts: basePhaseWorkoutsWeek2,
    },
    {
      weekNumber: 3,
      phase: "Base + Strength",
      targetMiles: "47-52",
      targetVertical: "8,500-10,500 ft",
      workouts: defaultBasePhaseWorkouts, // Can reuse with slight variations
    },
    {
      weekNumber: 4,
      phase: "Base + Strength",
      targetMiles: "47-52",
      targetVertical: "8,500-10,500 ft",
      workouts: basePhaseWorkoutsWeek2, // Can reuse with slight variations
    },
    {
      weekNumber: 5,
      phase: "Intensity Introduction",
      targetMiles: "50-55",
      targetVertical: "10,000-12,000 ft",
      workouts: intensityPhaseWorkoutsWeek5,
    },
  ];

  // Set start date to yesterday so we're currently in week 1, day 2
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - 1); // Yesterday
  const startDate = startDateObj.getTime(); // Convert to timestamp

  // Calculate current week based on start date
  const today = new Date();
  const daysSinceStart = Math.floor(
    (today.getTime() - startDate) / (1000 * 60 * 60 * 24)
  );
  const currentWeek = Math.min(
    Math.floor(daysSinceStart / 7) + 1,
    12
  ); // 1-indexed, cap at 12 weeks

  const trainingPlan: TrainingPlan = {
    id: "default-plan",
    userId: "default-user",
    planType: "12-week 50K",
    startDate: startDate,
    currentWeek: currentWeek,
    totalWeeks: 12,
    zones: defaultTrainingZones,
    phases: defaultTrainingPhases,
    weeks,
    coachingNotes: [
      "Based on your Nordic skiing background and threshold feel of 155-170 HR, these zones reflect your actual physiological thresholds.",
      "Your strong aerobic development means Z1 will feel 'stupidly easy' but is still valuable for recovery.",
    ],
    generatedAt: Date.now(),
  };

  const trainingBackground: TrainingBackground = {
    experience: "advanced",
    weeklyMileage: 40,
    longestRun: 50,
    marathonPR: "2:57",
    currentFitness: "~3:20",
    background:
      "Former D1 Nordic skier (excellent aerobic base)",
    goals: {
      raceDistance: "50K",
      targetTime: "no clue",
    },
  };

  const generatedProfile: GeneratedProfile = {
    fitnessAssessment:
      "Strong aerobic base from Nordic skiing background with small AeT-LT gap",
    recommendedPlan: trainingPlan,
    strengths: [
      "Excellent aerobic base",
      "Strong threshold capacity",
      "Mental toughness from skiing",
    ],
    focusAreas: [
      "Running-specific strength",
      "Ultra-distance pacing",
      "Nutrition strategies",
    ],
    aiAnalysis:
      "Your skiing background provides an excellent foundation for trail running with strong aerobic development and threshold capacity.",
  };

  return {
    profile: {
      id: "default-user",
      email: "user@example.com",
      name: "Trail Runner",
      createdAt: Date.now(),
      completedOnboarding: true,
    },
    trainingBackground,
    generatedProfile,
    chatHistory: [],
  };
};
