import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Droplets, Moon, Activity, AlertCircle } from "lucide-react";

export default function NutritionRecovery() {
  const recoveryProtocols = [
    {
      category: "Sleep",
      icon: Moon,
      items: [
        "Target: 8+ hours nightly",
        "Consistent sleep/wake times",
        "Dark, cool room (65-68°F)",
        "No screens 1 hour before bed",
        "Consider sleep tracking",
      ],
    },
    {
      category: "Hydration",
      icon: Droplets,
      items: [
        "Pale yellow urine as guide",
        "0.5-1oz per pound body weight daily",
        "Add electrolytes for runs over 90 min",
        "Hydrate before feeling thirsty",
        "Monitor sweat rate in training",
      ],
    },
  ];

  const weeklyRecovery = [
    {
      title: "Rest Days",
      description: "One complete rest day per week minimum",
      details:
        "Light walking or easy movement is fine, but no structured training",
    },
    {
      title: "Easy Runs",
      description:
        "Should feel genuinely easy - conversational pace throughout",
      details: "If you can't speak in full sentences, you're going too hard",
    },
    {
      title: "Monitoring",
      description: "Check morning heart rate daily",
      details:
        "5+ bpm elevation = possible overreaching, consider extra recovery",
    },
    {
      title: "Recovery Weeks",
      description: "Every 4th week built into plan",
      details: "Reduced volume while maintaining some intensity",
    },
  ];

  const mobilityProtocols = [
    {
      category: "Foam Rolling Protocol",
      duration: "10-15 minutes, 3-4× per week",
      exercises: [
        { name: "IT bands", duration: "60 seconds each side" },
        { name: "Calves", duration: "60 seconds each" },
        { name: "Quads", duration: "90 seconds each" },
        { name: "Hamstrings", duration: "90 seconds each" },
        { name: "Glutes", duration: "60 seconds each" },
        { name: "Lower back", duration: "60 seconds (careful!)" },
      ],
    },
    {
      category: "Dynamic Stretching",
      duration: "Pre-run activation (5-10 minutes)",
      exercises: [
        { name: "Leg swings", duration: "10 each direction" },
        { name: "Walking lunges", duration: "10 each leg" },
        { name: "High knees", duration: "20 steps" },
        { name: "Butt kicks", duration: "20 steps" },
        { name: "Lateral lunges", duration: "10 each side" },
        { name: "Ankle circles", duration: "10 each direction" },
      ],
    },
  ];

  const nutritionTable = [
    {
      workoutType: "Easy Runs (<60 min)",
      preWorkout: "Optional small snack",
      during: "Water only",
      postWorkout: "Normal meal within 2 hours",
    },
    {
      workoutType: "Long Runs",
      preWorkout: "200-300 cal, 2 hrs before",
      during: "150-250 cal/hour after 60 min",
      postWorkout: "Recovery drink + meal",
    },
    {
      workoutType: "Intensity Work",
      preWorkout: "100-200 cal, 1-2 hrs before",
      during: "Sports drink if over 60 min",
      postWorkout: "Recovery drink within 30 min",
    },
    {
      workoutType: "Back-to-Back",
      preWorkout: "Normal breakfast",
      during: "Practice race nutrition",
      postWorkout: "Focus on recovery between",
    },
  ];

  const commonIssues = [
    {
      issue: "GI Distress",
      solutions: [
        "Reduce fiber 24-48 hours before long runs/race",
        "Avoid high-fat foods pre-run",
        "Start fueling earlier with smaller amounts",
        "Test different fuel sources in training",
      ],
    },
    {
      issue: "Energy Crashes",
      solutions: [
        "Increase fueling frequency",
        "Mix fuel types (liquid + solid)",
        "Check overall daily calorie intake",
        "Consider adding more complex carbs",
      ],
    },
    {
      issue: "Cramping",
      solutions: [
        "Increase electrolyte intake",
        "Check hydration status",
        "Add salt to meals",
        "Consider electrolyte supplements",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold text-gray-900">
            Nutrition & Recovery Guidelines
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Optimize your fueling and recovery strategies for peak performance
            and adaptation
          </p>
        </div>

        {/* Daily Recovery Protocols */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Daily Recovery Protocols
            </CardTitle>
            <CardDescription className="text-gray-600">
              Essential daily habits for optimal recovery
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-8">
              {recoveryProtocols.map((protocol, idx) => {
                const Icon = protocol.icon;
                return (
                  <div key={idx}>
                    <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {protocol.category}
                    </h3>
                    <div className="space-y-2">
                      {protocol.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 text-sm">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Post-Workout Nutrition
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">
                  Within 30 minutes:
                </p>
                <div className="space-y-1 text-sm text-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>3:1 or 4:1 carbohydrate:protein ratio</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>100-200 calories for workouts less than 1 hour</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>200-400 calories for workouts greater than 1 hour</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      Examples: Chocolate milk, banana + nut butter, recovery
                      drink
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Recovery Strategies */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Weekly Recovery Strategies
            </CardTitle>
            <CardDescription className="text-gray-600">
              Structured approaches to managing training stress
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {weeklyRecovery.map((strategy, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {strategy.title}
                  </h4>
                  <p className="text-gray-700 text-sm mb-2">
                    {strategy.description}
                  </p>
                  <p className="text-gray-600 text-sm">{strategy.details}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Foam Rolling & Mobility */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Foam Rolling & Mobility
            </CardTitle>
            <CardDescription className="text-gray-600">
              Movement quality and tissue maintenance protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-8">
              {mobilityProtocols.map((protocol, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">
                    {protocol.category}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {protocol.duration}
                  </p>
                  <div className="space-y-2">
                    {protocol.exercises.map((exercise, exerciseIdx) => (
                      <div
                        key={exerciseIdx}
                        className="flex justify-between items-center py-1 border-b border-gray-100"
                      >
                        <span className="text-gray-700 text-sm">
                          • {exercise.name}
                        </span>
                        <span className="text-gray-600 text-sm">
                          {exercise.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Race Nutrition Strategy */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Race Nutrition Strategy
            </CardTitle>
            <CardDescription className="text-gray-600">
              Fueling plan for race day success
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">
                Pre-Race (3 Days Out)
              </h3>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-3">
                  Carb Loading Protocol
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-yellow-800 text-sm">
                      Increase carbs to 3-4g per pound body weight
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-yellow-800 text-sm">
                      Reduce fiber intake to prevent GI issues
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-yellow-800 text-sm">
                      Stay well hydrated
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-yellow-800 text-sm">
                      Avoid trying new foods
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-yellow-800 text-sm">
                      Light training only
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-900">
                  Race Morning
                </h3>
                <p className="font-semibold text-gray-900 mb-3">
                  3-4 hours before:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      Familiar breakfast (300-500 calories)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      Examples: Oatmeal + banana, toast + PB
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">16-24 oz fluids</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      Minimal fiber and fat
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-900">
                  During Race
                </h3>
                <p className="font-semibold text-gray-900 mb-3">
                  Fueling plan:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      Start at 45-60 minutes
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      200-300 calories per hour
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      Mix of gels, bars, real food
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      Practice everything in training
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm">
                      Drink to thirst + electrolytes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Training Nutrition */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Daily Training Nutrition
            </CardTitle>
            <CardDescription className="text-gray-600">
              Fueling strategies for different workout types
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Workout Type
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Pre-Workout
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      During
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Post-Workout
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {nutritionTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-900">
                        {row.workoutType}
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm">
                        {row.preWorkout}
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm">
                        {row.during}
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm">
                        {row.postWorkout}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues & Solutions */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Common Issues & Solutions
            </CardTitle>
            <CardDescription className="text-gray-600">
              Troubleshooting common nutrition challenges
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {commonIssues.map((issue, idx) => (
                <div key={idx} className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    {issue.issue}
                  </h4>
                  <div className="space-y-1">
                    {issue.solutions.map((solution, solutionIdx) => (
                      <div key={solutionIdx} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700 text-sm">{solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
