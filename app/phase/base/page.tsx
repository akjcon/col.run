import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mountain, TrendingUp, Activity } from "lucide-react";

export default function BasePhase() {
  const getZoneColor = (zone: string) => {
    if (zone.includes("1") || zone === "Recovery")
      return "bg-slate-100 text-slate-700 border-slate-200";
    if (zone.includes("2")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (zone.includes("3"))
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (zone.includes("4"))
      return "bg-orange-50 text-orange-700 border-orange-200";
    if (zone.includes("5")) return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-50 text-gray-600 border-gray-200";
  };

  const workouts = [
    {
      day: "Monday",
      type: "Rest/Active Recovery",
      zone: "Recovery",
      description: "Complete rest or 20-30 min easy walk/bike",
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
      notes: "Use Z2 for base building given strong aerobic development",
    },
    {
      day: "Wednesday",
      type: "Zone 2 Sustained",
      zone: "Zone 2",
      description: "60-75 minutes sustained effort",
      details: ["Zone: Z2 (130-140 HR)", "Vertical: 1,500-2,000 ft"],
      notes: "Focus on maintaining steady effort, practice race nutrition",
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
      notes: "Focus on explosive power, full recovery between efforts",
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
      details: ["Vertical: 2,500-3,000 ft", "Include some Z2 sections"],
      notes: "Practice nutrition, focus on consistent effort",
    },
    {
      day: "Sunday",
      type: "Long Run #2",
      zone: "Zone 1",
      description: "8-10 miles back-to-back",
      details: ["Vertical: 2,000 ft", "Run on partially depleted glycogen"],
      notes: "Stay aerobic, build aerobic capacity",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold text-gray-900">
            Weeks 1-4: Base + Strength Phase
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Leveraging your strong aerobic base from skiing with Z1/Z2 mix and
            strength training
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              45-50 miles/week
            </span>
            <span className="flex items-center gap-2">
              <Mountain className="h-4 w-4" />
              8,000-10,000 ft vertical
            </span>
          </div>
        </div>

        {/* Weekly Schedule */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Weekly Schedule Template
            </CardTitle>
            <CardDescription className="text-gray-600">
              Optimized for athletes with strong aerobic development - more Z2
              work and early intensity
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {workouts.map((workout, idx) => (
                <div
                  key={idx}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="min-w-[80px]">
                          <p className="font-semibold text-gray-900">
                            {workout.day}
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
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900">
                            {workout.type}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-2">
                        {workout.description}
                      </p>

                      {workout.details && (
                        <ul className="space-y-1 text-sm text-gray-600 mb-2">
                          {workout.details.map((detail, detailIdx) => (
                            <li key={detailIdx}>• {detail}</li>
                          ))}
                        </ul>
                      )}

                      {workout.notes && (
                        <p className="text-sm text-gray-500 italic">
                          {workout.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Totals */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gray-900">
                45-50
              </CardTitle>
              <CardDescription className="text-gray-600">
                Miles per week
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gray-900">
                8,000-10,000
              </CardTitle>
              <CardDescription className="text-gray-600">
                Feet of vertical per week
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Coaching Adjustments */}
        <Card className="border shadow-sm bg-green-50 border-green-200">
          <CardHeader className="border-b border-green-200">
            <CardTitle className="text-green-900">
              🎯 Coaching Adjustments Made
            </CardTitle>
            <CardDescription className="text-green-700">
              Plan customized based on your Nordic skiing background and
              threshold feel
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-green-800">
                  <strong>Heart Rate Zones Adjusted:</strong> Based on your
                  threshold feel of 155-170 HR from skiing
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-green-800">
                  <strong>More Z2 Work:</strong> Your strong aerobic base allows
                  for more 130-140 HR training
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-green-800">
                  <strong>Small AeT-LT Gap:</strong> Good aerobic development
                  means you can handle intensity earlier
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Focus Points */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">Key Focus Points</CardTitle>
            <CardDescription className="text-gray-600">
              Essential principles for this phase
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Build aerobic base with Z1/Z2 mix (strong aerobic
                    development from skiing)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Establish strength training routine 2x per week
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Practice nutrition strategies during longer runs
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Focus on running form and efficiency
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Listen to your body and prioritize recovery
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    Build consistent training habits and routines
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
