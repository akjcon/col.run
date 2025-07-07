"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Mountain, TrendingUp, Activity } from "lucide-react";

interface DailyWorkout {
  week: number;
  day: string;
  type: string;
  distance: string;
  vertical: string;
  zone: string;
  details: string;
  notes?: string;
}

// Complete 12-week training schedule
const trainingSchedule: DailyWorkout[] = [
  // Week 1 - Base Phase
  {
    week: 1,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest day",
  },
  {
    week: 1,
    day: "Tuesday",
    type: "Base + Strength",
    distance: "5-6 miles",
    vertical: "1,000 ft",
    zone: "Zone 1",
    details: "Easy run + PM: Stage 3 strength training",
  },
  {
    week: 1,
    day: "Wednesday",
    type: "Base",
    distance: "6-7 miles",
    vertical: "1,200 ft",
    zone: "Zone 1",
    details: "Easy aerobic run",
  },
  {
    week: 1,
    day: "Thursday",
    type: "Base + Hill Sprints",
    distance: "5 miles",
    vertical: "800 ft",
    zone: "Zone 1/5",
    details: "Easy run + 6×10 sec hill sprints",
  },
  {
    week: 1,
    day: "Friday",
    type: "Recovery",
    distance: "4 miles",
    vertical: "500 ft",
    zone: "Zone 1",
    details: "Very easy recovery run",
  },
  {
    week: 1,
    day: "Saturday",
    type: "Long Run",
    distance: "12 miles",
    vertical: "3,000 ft",
    zone: "Zone 1-2",
    details: "Mountain-specific long run",
  },
  {
    week: 1,
    day: "Sunday",
    type: "Long Base",
    distance: "8-10 miles",
    vertical: "2,000 ft",
    zone: "Zone 1",
    details: "Back-to-back long run, stay aerobic",
  },

  // Week 2 - Base Phase
  {
    week: 2,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest day",
  },
  {
    week: 2,
    day: "Tuesday",
    type: "Base + Strength",
    distance: "6-7 miles",
    vertical: "1,200 ft",
    zone: "Zone 1",
    details: "Easy run + PM: Stage 3 strength",
  },
  {
    week: 2,
    day: "Wednesday",
    type: "Base",
    distance: "7-8 miles",
    vertical: "1,400 ft",
    zone: "Zone 1",
    details: "Easy aerobic run",
  },
  {
    week: 2,
    day: "Thursday",
    type: "Base + Hill Sprints",
    distance: "5-6 miles",
    vertical: "1,000 ft",
    zone: "Zone 1/5",
    details: "Easy run + 8×10 sec hill sprints",
  },
  {
    week: 2,
    day: "Friday",
    type: "Recovery",
    distance: "4 miles",
    vertical: "500 ft",
    zone: "Zone 1",
    details: "Very easy recovery run",
  },
  {
    week: 2,
    day: "Saturday",
    type: "Long Run",
    distance: "14 miles",
    vertical: "3,500 ft",
    zone: "Zone 1-2",
    details: "Mountain-specific long run",
  },
  {
    week: 2,
    day: "Sunday",
    type: "Long Base",
    distance: "10-12 miles",
    vertical: "2,500 ft",
    zone: "Zone 1",
    details: "Back-to-back long run",
  },

  // Week 3 - Base Phase
  {
    week: 3,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest day",
  },
  {
    week: 3,
    day: "Tuesday",
    type: "Base + Strength",
    distance: "7-8 miles",
    vertical: "1,400 ft",
    zone: "Zone 1",
    details: "Easy run + PM: Stage 3 strength",
  },
  {
    week: 3,
    day: "Wednesday",
    type: "Base",
    distance: "8-9 miles",
    vertical: "1,600 ft",
    zone: "Zone 1",
    details: "Easy aerobic run",
  },
  {
    week: 3,
    day: "Thursday",
    type: "Base + Hill Sprints",
    distance: "6 miles",
    vertical: "1,200 ft",
    zone: "Zone 1/5",
    details: "Easy run + 10×10 sec hill sprints",
  },
  {
    week: 3,
    day: "Friday",
    type: "Recovery",
    distance: "5 miles",
    vertical: "600 ft",
    zone: "Zone 1",
    details: "Very easy recovery run",
  },
  {
    week: 3,
    day: "Saturday",
    type: "Long Run",
    distance: "16 miles",
    vertical: "4,000 ft",
    zone: "Zone 1-2",
    details: "Mountain-specific long run, peak base volume",
  },
  {
    week: 3,
    day: "Sunday",
    type: "Long Base",
    distance: "12 miles",
    vertical: "3,000 ft",
    zone: "Zone 1",
    details: "Back-to-back long run",
  },

  // Week 4 - Recovery Week
  {
    week: 4,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest day",
  },
  {
    week: 4,
    day: "Tuesday",
    type: "Base",
    distance: "5 miles",
    vertical: "800 ft",
    zone: "Zone 1",
    details: "Easy recovery run",
  },
  {
    week: 4,
    day: "Wednesday",
    type: "Base",
    distance: "6 miles",
    vertical: "1,000 ft",
    zone: "Zone 1",
    details: "Easy aerobic run",
  },
  {
    week: 4,
    day: "Thursday",
    type: "Base + Strides",
    distance: "5 miles",
    vertical: "800 ft",
    zone: "Zone 1",
    details: "Easy run + 6×20 sec strides",
  },
  {
    week: 4,
    day: "Friday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest",
  },
  {
    week: 4,
    day: "Saturday",
    type: "Medium Long",
    distance: "10 miles",
    vertical: "2,500 ft",
    zone: "Zone 1",
    details: "Reduced volume recovery week",
  },
  {
    week: 4,
    day: "Sunday",
    type: "Easy",
    distance: "6 miles",
    vertical: "1,200 ft",
    zone: "Zone 1",
    details: "Easy recovery run",
  },

  // Week 5 - Intensity Phase
  {
    week: 5,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest or 30 min easy activity",
  },
  {
    week: 5,
    day: "Tuesday",
    type: "Intervals + ME",
    distance: "6-7 miles",
    vertical: "1,200 ft",
    zone: "Zone 3",
    details: "AM: 3×8 min @ Z3 (3 min recovery), PM: Muscular Endurance",
  },
  {
    week: 5,
    day: "Wednesday",
    type: "Base",
    distance: "7-8 miles",
    vertical: "1,500 ft",
    zone: "Zone 1",
    details: "Easy pace, active recovery",
  },
  {
    week: 5,
    day: "Thursday",
    type: "Base + Sprints",
    distance: "5-6 miles",
    vertical: "800 ft",
    zone: "Zone 1/5",
    details: "Easy run + 6×10 sec hill sprints (reduced volume)",
  },
  {
    week: 5,
    day: "Friday",
    type: "Recovery",
    distance: "4-5 miles",
    vertical: "500 ft",
    zone: "Zone 1",
    details: "Prepare for weekend volume",
  },
  {
    week: 5,
    day: "Saturday",
    type: "Long Specific",
    distance: "12-14 miles",
    vertical: "3,500-4,000 ft",
    zone: "Zone 1-2",
    details: "Include 20-30 min Z2 effort in middle",
  },
  {
    week: 5,
    day: "Sunday",
    type: "Long Base",
    distance: "10-12 miles",
    vertical: "2,500 ft",
    zone: "Zone 1",
    details: "Stay aerobic, build volume",
  },

  // Week 6 - Intensity Phase
  {
    week: 6,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest or 30 min easy activity",
  },
  {
    week: 6,
    day: "Tuesday",
    type: "Intervals + ME",
    distance: "7-8 miles",
    vertical: "1,400 ft",
    zone: "Zone 3",
    details: "AM: 4×8 min @ Z3 (3 min recovery), PM: Muscular Endurance",
  },
  {
    week: 6,
    day: "Wednesday",
    type: "Base + Strength",
    distance: "8 miles",
    vertical: "1,600 ft",
    zone: "Zone 1",
    details: "Easy run + PM: Maintenance strength",
  },
  {
    week: 6,
    day: "Thursday",
    type: "Tempo",
    distance: "6-7 miles",
    vertical: "1,200 ft",
    zone: "Zone 3",
    details: "20 min sustained @ Zone 3",
  },
  {
    week: 6,
    day: "Friday",
    type: "Recovery",
    distance: "5 miles",
    vertical: "600 ft",
    zone: "Zone 1",
    details: "Easy shakeout",
  },
  {
    week: 6,
    day: "Saturday",
    type: "Long Specific",
    distance: "14-16 miles",
    vertical: "4,000-4,500 ft",
    zone: "Zone 1-3",
    details: "2×15 min @ Zone 3 efforts",
  },
  {
    week: 6,
    day: "Sunday",
    type: "Long Base",
    distance: "12 miles",
    vertical: "3,000 ft",
    zone: "Zone 1",
    details: "Recovery pace",
  },

  // Week 7 - Intensity Phase
  {
    week: 7,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest",
  },
  {
    week: 7,
    day: "Tuesday",
    type: "Intervals + ME",
    distance: "8 miles",
    vertical: "1,500 ft",
    zone: "Zone 3",
    details: "AM: 5×8 min @ Z3 (3 min recovery), PM: ME work",
  },
  {
    week: 7,
    day: "Wednesday",
    type: "Base",
    distance: "8-9 miles",
    vertical: "1,800 ft",
    zone: "Zone 1",
    details: "Easy recovery pace",
  },
  {
    week: 7,
    day: "Thursday",
    type: "Tempo",
    distance: "7-8 miles",
    vertical: "1,400 ft",
    zone: "Zone 3",
    details: "25 min sustained @ Zone 3",
  },
  {
    week: 7,
    day: "Friday",
    type: "Recovery",
    distance: "5 miles",
    vertical: "600 ft",
    zone: "Zone 1",
    details: "Easy shakeout",
  },
  {
    week: 7,
    day: "Saturday",
    type: "Long Specific",
    distance: "16-18 miles",
    vertical: "4,500-5,000 ft",
    zone: "Zone 1-3",
    details: "Race pace segments, practice nutrition",
  },
  {
    week: 7,
    day: "Sunday",
    type: "Long Base",
    distance: "12-14 miles",
    vertical: "3,500 ft",
    zone: "Zone 1",
    details: "Steady aerobic effort",
  },

  // Week 8 - Recovery Week
  {
    week: 8,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest",
  },
  {
    week: 8,
    day: "Tuesday",
    type: "Intervals",
    distance: "6 miles",
    vertical: "1,000 ft",
    zone: "Zone 3",
    details: "3×5 min @ Z3 (3 min recovery)",
  },
  {
    week: 8,
    day: "Wednesday",
    type: "Base",
    distance: "6-7 miles",
    vertical: "1,200 ft",
    zone: "Zone 1",
    details: "Easy recovery",
  },
  {
    week: 8,
    day: "Thursday",
    type: "Base + Strides",
    distance: "5 miles",
    vertical: "800 ft",
    zone: "Zone 1",
    details: "Easy + 8×20 sec strides",
  },
  {
    week: 8,
    day: "Friday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest",
  },
  {
    week: 8,
    day: "Saturday",
    type: "Medium Long",
    distance: "12 miles",
    vertical: "3,000 ft",
    zone: "Zone 1-2",
    details: "Controlled effort",
  },
  {
    week: 8,
    day: "Sunday",
    type: "Easy",
    distance: "8 miles",
    vertical: "1,800 ft",
    zone: "Zone 1",
    details: "Recovery pace",
  },

  // Week 9 - Race Specific
  {
    week: 9,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest",
  },
  {
    week: 9,
    day: "Tuesday",
    type: "Zone 4 Intervals",
    distance: "6-7 miles",
    vertical: "1,000 ft",
    zone: "Zone 4",
    details: "30/30s - 2×(10×30 sec @ Z4, 30 sec recovery), 5 min between sets",
  },
  {
    week: 9,
    day: "Wednesday",
    type: "Base + Strength",
    distance: "6-7 miles",
    vertical: "1,200 ft",
    zone: "Zone 1",
    details: "Easy run + PM: Maintenance strength (1×/week now)",
  },
  {
    week: 9,
    day: "Thursday",
    type: "Zone 3 Tempo",
    distance: "6-7 miles",
    vertical: "1,500 ft",
    zone: "Zone 3",
    details: "25-30 min sustained @ race effort",
  },
  {
    week: 9,
    day: "Friday",
    type: "Easy Shakeout",
    distance: "4 miles",
    vertical: "400 ft",
    zone: "Zone 1",
    details: "Keep legs loose for weekend",
  },
  {
    week: 9,
    day: "Saturday",
    type: "Race Simulation",
    distance: "16-18 miles",
    vertical: "4,500-5,000 ft",
    zone: "Zone 1-3",
    details: "Full race simulation - practice everything!",
  },
  {
    week: 9,
    day: "Sunday",
    type: "Recovery Long",
    distance: "8-10 miles",
    vertical: "2,500 ft",
    zone: "Zone 1",
    details: "Easy recovery pace",
  },

  // Week 10 - Race Specific
  {
    week: 10,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest",
  },
  {
    week: 10,
    day: "Tuesday",
    type: "Zone 4 Intervals",
    distance: "6-7 miles",
    vertical: "1,000 ft",
    zone: "Zone 4",
    details: "4×4 min @ Z4 (3 min recovery)",
  },
  {
    week: 10,
    day: "Wednesday",
    type: "Base",
    distance: "7-8 miles",
    vertical: "1,400 ft",
    zone: "Zone 1",
    details: "Easy recovery pace",
  },
  {
    week: 10,
    day: "Thursday",
    type: "Zone 3 Tempo",
    distance: "7 miles",
    vertical: "1,500 ft",
    zone: "Zone 3",
    details: "30 min @ race effort",
  },
  {
    week: 10,
    day: "Friday",
    type: "Easy",
    distance: "4 miles",
    vertical: "400 ft",
    zone: "Zone 1",
    details: "Pre-race simulation shakeout",
  },
  {
    week: 10,
    day: "Saturday",
    type: "Race Simulation",
    distance: "18 miles",
    vertical: "5,000 ft",
    zone: "Zone 1-3",
    details: "Final race rehearsal - dial in everything!",
  },
  {
    week: 10,
    day: "Sunday",
    type: "Recovery",
    distance: "10 miles",
    vertical: "2,500 ft",
    zone: "Zone 1",
    details: "Easy recovery",
  },

  // Week 11 - Taper
  {
    week: 11,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Begin taper period",
  },
  {
    week: 11,
    day: "Tuesday",
    type: "Zone 4 Intervals",
    distance: "5 miles",
    vertical: "800 ft",
    zone: "Zone 4",
    details: "4×3 min @ Z4 (3 min recovery) - reduced volume",
  },
  {
    week: 11,
    day: "Wednesday",
    type: "Easy",
    distance: "4-5 miles",
    vertical: "800 ft",
    zone: "Zone 1",
    details: "Keep it comfortable",
  },
  {
    week: 11,
    day: "Thursday",
    type: "Easy + Strides",
    distance: "4 miles",
    vertical: "500 ft",
    zone: "Zone 1",
    details: "Easy + 6×20 sec strides",
  },
  {
    week: 11,
    day: "Friday",
    type: "Recovery",
    distance: "3 miles",
    vertical: "300 ft",
    zone: "Zone 1",
    details: "Minimal stress",
  },
  {
    week: 11,
    day: "Saturday",
    type: "Medium Long",
    distance: "10-12 miles",
    vertical: "3,000 ft",
    zone: "Zone 1-3",
    details: "Include 15 min Z3, final gear check",
  },
  {
    week: 11,
    day: "Sunday",
    type: "Easy",
    distance: "5-6 miles",
    vertical: "1,000 ft",
    zone: "Zone 1",
    details: "Relaxed pace, feel good",
  },

  // Week 12 - Race Week
  {
    week: 12,
    day: "Monday",
    type: "Rest",
    distance: "0",
    vertical: "0",
    zone: "Rest",
    details: "Complete rest - prep gear, finalize logistics",
  },
  {
    week: 12,
    day: "Tuesday",
    type: "Sharpener",
    distance: "4 miles",
    vertical: "500 ft",
    zone: "Zone 1/4",
    details: "4×30 sec @ race pace (3 min recovery)",
  },
  {
    week: 12,
    day: "Wednesday",
    type: "Easy + Strides",
    distance: "3 miles",
    vertical: "400 ft",
    zone: "Zone 1",
    details: "6×20 sec strides - stay loose",
  },
  {
    week: 12,
    day: "Thursday",
    type: "Rest or Easy",
    distance: "0-3 miles",
    vertical: "0-200 ft",
    zone: "Rest/Zone 1",
    details: "Listen to body - rest or 20 min easy jog",
  },
  {
    week: 12,
    day: "Friday",
    type: "Activation",
    distance: "3 miles",
    vertical: "500 ft",
    zone: "Zone 1",
    details: "3×30 sec pickups + 4×20 sec strides",
  },
  {
    week: 12,
    day: "Saturday",
    type: "🏃‍♂️ RACE DAY! 🏔️",
    distance: "31 miles",
    vertical: "10,000 ft",
    zone: "Race",
    details: "50K Trail Race - Execute your plan, trust your fitness!",
  },
  {
    week: 12,
    day: "Sunday",
    type: "Recovery",
    distance: "Walk",
    vertical: "0",
    zone: "Rest",
    details: "Celebrate! Easy walk or light movement",
  },
];

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState("1");
  const [currentTrainingDay, setCurrentTrainingDay] = useState("");
  const [tomorrowTrainingDay, setTomorrowTrainingDay] = useState("");

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const days = [
      "Sunday", // 0
      "Monday", // 1
      "Tuesday", // 2
      "Wednesday", // 3
      "Thursday", // 4
      "Friday", // 5
      "Saturday", // 6
    ];

    const todayName = days[dayOfWeek];
    const tomorrowIndex = (dayOfWeek + 1) % 7;
    const tomorrowName = days[tomorrowIndex];

    setCurrentTrainingDay(todayName);
    setTomorrowTrainingDay(tomorrowName);
  }, []);

  const currentWeekWorkouts = trainingSchedule.filter(
    (w) => w.week === parseInt(selectedWeek)
  );

  // Get today's workout (default to week 1 for display)
  const todaysWorkout = trainingSchedule.find(
    (w) => w.week === 1 && w.day === currentTrainingDay
  );

  // Get tomorrow's workout
  const tomorrowsWorkout = trainingSchedule.find(
    (w) => w.week === 1 && w.day === tomorrowTrainingDay
  );

  const getZoneColor = (zone: string) => {
    if (zone.includes("1"))
      return "bg-slate-100 text-slate-700 border-slate-200";
    if (zone.includes("2")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (zone.includes("3"))
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (zone.includes("4"))
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (zone.includes("5")) return "bg-red-50 text-red-700 border-red-200";
    if (zone === "Rest") return "bg-gray-50 text-gray-600 border-gray-200";
    return "bg-gray-50 text-gray-600 border-gray-200";
  };

  const getPhaseForWeek = (week: number) => {
    if (week <= 4) return "Base Phase";
    if (week <= 8) return "Intensity Phase";
    if (week <= 10) return "Race Specific";
    if (week === 11) return "Taper";
    return "Race Week";
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold text-gray-900">
            50K Trail Training Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A comprehensive 12-week program for your September 14th race
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <Mountain className="h-4 w-4" />
              31 miles
            </span>
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              10,000ft vertical
            </span>
          </div>
        </div>

        {/* Today's Workout */}
        {todaysWorkout && (
          <Card className="border shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-900">
                    Today&apos;s Workout
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    {currentTrainingDay} • Week 1 - Base Phase
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`${getZoneColor(
                    todaysWorkout.zone
                  )} text-sm px-3 py-1 border`}
                >
                  {todaysWorkout.zone}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-lg text-gray-900">
                      {todaysWorkout.type}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-gray-700">
                      <TrendingUp className="h-4 w-4" />
                      <span>{todaysWorkout.distance}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Mountain className="h-4 w-4" />
                      <span>{todaysWorkout.vertical} vertical</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="font-semibold mb-2 text-gray-900">
                    Workout Details:
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {todaysWorkout.details}
                  </p>
                  {todaysWorkout.notes && (
                    <p className="text-gray-600 mt-3 text-sm">
                      {todaysWorkout.notes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tomorrow's Workout */}
        {tomorrowsWorkout && (
          <Card className="border shadow-sm">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-blue-900">
                    Tomorrow&apos;s Workout
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    {tomorrowTrainingDay} • Week 1 - Base Phase
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`${getZoneColor(
                    tomorrowsWorkout.zone
                  )} text-sm px-3 py-1 border`}
                >
                  {tomorrowsWorkout.zone}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {tomorrowsWorkout.type}
                  </span>
                  <span className="text-blue-700 text-sm">
                    {tomorrowsWorkout.distance} • {tomorrowsWorkout.vertical}{" "}
                    vert
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week Selector and Overview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-semibold text-gray-900">
              Training Schedule
            </h2>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[240px] border-gray-200">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    Week {i + 1} - {getPhaseForWeek(i + 1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weekly Overview */}
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-gray-900">
                Week {selectedWeek} - {getPhaseForWeek(parseInt(selectedWeek))}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {currentWeekWorkouts.map((workout, idx) => {
                  const isToday =
                    workout.day === currentTrainingDay &&
                    parseInt(selectedWeek) === 1;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-6 hover:bg-gray-50 transition-colors ${
                        isToday ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        <div className="min-w-[100px]">
                          <p className="font-semibold text-gray-900">
                            {workout.day}
                            {isToday && (
                              <span className="text-xs text-blue-600 block">
                                Today
                              </span>
                            )}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getZoneColor(
                            workout.zone
                          )} border text-xs`}
                        >
                          {workout.zone}
                        </Badge>
                        <div>
                          <p className="font-medium text-gray-900">
                            {workout.type}
                          </p>
                          <p className="text-sm text-gray-600">
                            {workout.distance} • {workout.vertical} vert
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 hidden lg:block max-w-[400px] text-right">
                        {workout.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/phase/base">
            <Card className="hover:shadow-md transition-all cursor-pointer border hover:border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  Training Phases
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Detailed weekly schedules
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/strength">
            <Card className="hover:shadow-md transition-all cursor-pointer border hover:border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  Strength Training
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Exercises & progressions
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/nutrition-recovery">
            <Card className="hover:shadow-md transition-all cursor-pointer border hover:border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">
                  Nutrition & Recovery
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Fueling & recovery protocols
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-end">
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Training Zones Reference - More Subtle */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Training Zones Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-lg bg-slate-50 border">
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-slate-700 border-slate-200 mb-3"
                >
                  Zone 1
                </Badge>
                <p className="text-sm font-medium text-gray-900">
                  Easy/Recovery
                </p>
                <p className="text-xs text-gray-600 mt-1">&lt;130 HR</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 mb-3"
                >
                  Zone 2
                </Badge>
                <p className="text-sm font-medium text-gray-900">Aerobic</p>
                <p className="text-xs text-gray-600 mt-1">130-140 HR</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-200">
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 mb-3"
                >
                  Zone 3
                </Badge>
                <p className="text-sm font-medium text-gray-900">Threshold</p>
                <p className="text-xs text-gray-600 mt-1">140-165 HR</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-700 border-orange-200 mb-3"
                >
                  Zone 4
                </Badge>
                <p className="text-sm font-medium text-gray-900">
                  Above Threshold
                </p>
                <p className="text-xs text-gray-600 mt-1">165-180 HR</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 mb-3"
                >
                  Zone 5
                </Badge>
                <p className="text-sm font-medium text-gray-900">Max/Sprint</p>
                <p className="text-xs text-gray-600 mt-1">180+ HR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
