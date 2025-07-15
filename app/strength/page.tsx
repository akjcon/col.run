import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dumbbell,
  Target,
  Clock,
  Zap,
  AlertTriangle,
} from "lucide-react";

export default function StrengthTraining() {
  const strengthExercises = [
    {
      exercise: "Box Step-ups",
      sets: "4 × 6 each leg",
      progression: "Start bodyweight → +10-15% BW",
      rest: "2 min",
      notes: "Focus on control and knee tracking",
    },
    {
      exercise: "Front Lunges",
      sets: "4 × 6 each leg",
      progression: "Start bodyweight → +10-15% BW",
      rest: "2 min",
      notes: "Step forward dynamically",
    },
    {
      exercise: "Split Jump Squats",
      sets: "4 × 6 each leg",
      progression: "Bodyweight or +5-10% BW",
      rest: "2 min",
      notes: "Explosive movement, soft landing",
    },
    {
      exercise: "Squat Jumps",
      sets: "4 × 6",
      progression: "Bodyweight",
      rest: "2 min",
      notes: "Maximum height, quiet landing",
    },
  ];

  const coreProgression = [
    {
      exercise: "Plank",
      week12: "5 × 30 sec",
      week34: "5 × 45 sec",
      week5plus: "5 × 60 sec",
      notes: "Add weight if too easy",
    },
    {
      exercise: "Windshield Wipers",
      week12: "3 × 8 each side",
      week34: "3 × 10 each side",
      week5plus: "3 × 12 each side",
      notes: "Control the movement",
    },
    {
      exercise: "Marching Plank",
      week12: "3 × 30 sec",
      week34: "3 × 45 sec",
      week5plus: "3 × 60 sec",
      notes: "Alternate limbs smoothly",
    },
  ];

  const exerciseGuides = [
    {
      name: "Box Step-ups",
      steps: [
        "Use a box height where thigh is parallel to ground when foot is on box",
        "Place entire foot on box, drive through heel",
        "Fully extend hip at top, pause briefly",
        "Control the descent, don't drop down",
        "Keep torso upright throughout movement",
      ],
    },
    {
      name: "Front Lunges",
      steps: [
        "Step forward with control, landing heel first",
        "Lower until both knees at 90 degrees",
        "Front knee tracks over toes, not caving inward",
        "Drive through front heel to return to start",
        "Keep core engaged and chest proud",
      ],
    },
    {
      name: "Split Jump Squats",
      steps: [
        "Start in lunge position",
        "Jump explosively, switching legs in air",
        "Land softly in opposite lunge position",
        "Immediately jump again",
        "Focus on height and control, not speed",
      ],
    },
  ];

  const phases = [
    {
      title: "Weeks 1-6: Building Phase",
      frequency:
        "2× per week strength training (Tuesday PM, Thursday PM)",
      notes:
        "Allow 4-6 hours between running and strength sessions",
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "Weeks 7-10: Maintenance Phase",
      frequency:
        "1× per week strength training (Wednesday PM)",
      notes: "Reduce volume but maintain intensity",
      color: "bg-green-50 border-green-200",
    },
    {
      title: "Weeks 11-12: Taper",
      frequency: "Optional light strength work",
      notes: "Focus on mobility and activation only",
      color: "bg-yellow-50 border-yellow-200",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:space-y-8 md:p-6">
        {/* Header */}
        <div className="space-y-4 py-4 text-center md:py-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl lg:text-5xl">
            Strength Training Program
          </h1>
          <p className="mx-auto max-w-2xl px-4 text-base text-gray-600 sm:text-lg md:text-xl">
            Mountain-specific strength training to enhance
            power, stability, and injury prevention
          </p>
        </div>

        {/* Stage 3 Strength Program */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Stage 3 Strength Program
            </CardTitle>
            <CardDescription className="text-gray-600">
              Frequency: 2×/week (Weeks 1-6), then 1×/week
              maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Exercise
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Sets × Reps
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Weight Progression
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Rest
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {strengthExercises.map(
                    (exercise, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {exercise.exercise}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {exercise.sets}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {exercise.progression}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {exercise.rest}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {exercise.notes}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Core Strength Progression */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Core Strength Progression
            </CardTitle>
            <CardDescription className="text-gray-600">
              Progressive core strengthening throughout the
              program
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Exercise
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Week 1-2
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Week 3-4
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Week 5+
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coreProgression.map((exercise, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {exercise.exercise}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {exercise.week12}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {exercise.week34}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {exercise.week5plus}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {exercise.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Hill Sprint Protocol */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Hill Sprint Protocol
            </CardTitle>
            <CardDescription className="text-gray-600">
              Power development for mountain running
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Target className="h-5 w-5" />
                  Specifications
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="font-medium text-gray-900">
                      Gradient:
                    </span>
                    <span className="text-gray-700">
                      20-30% grade minimum
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="font-medium text-gray-900">
                      Duration:
                    </span>
                    <span className="text-gray-700">
                      8-10 seconds maximum effort
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="font-medium text-gray-900">
                      Recovery:
                    </span>
                    <span className="text-gray-700">
                      2-3 minutes complete rest
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="font-medium text-gray-900">
                      Volume:
                    </span>
                    <span className="text-gray-700">
                      Start 6 reps → build to 10 reps
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 py-2">
                    <span className="font-medium text-gray-900">
                      Frequency:
                    </span>
                    <span className="text-gray-700">
                      1×/week throughout plan
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Zap className="h-5 w-5" />
                  Execution Tips
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"></div>
                    <p className="text-sm text-gray-700">
                      Find the steepest hill available
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"></div>
                    <p className="text-sm text-gray-700">
                      Focus on explosive power, not speed
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"></div>
                    <p className="text-sm text-gray-700">
                      Drive knees high and pump arms
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"></div>
                    <p className="text-sm text-gray-700">
                      Full recovery between reps is crucial
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"></div>
                    <p className="text-sm text-gray-700">
                      Quality over quantity always
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500"></div>
                    <p className="text-sm text-gray-700">
                      Stop if form deteriorates
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <Zap className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div>
                  <p className="mb-1 font-semibold text-yellow-800">
                    Purpose:
                  </p>
                  <p className="text-sm text-yellow-700">
                    Hill sprints develop explosive power,
                    improve running economy, and build
                    fatigue-resistant muscle fibers crucial
                    for mountain running.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercise Technique Guide */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Exercise Technique Guide
            </CardTitle>
            <CardDescription className="text-gray-600">
              Proper form and execution for maximum benefit
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-8">
              {exerciseGuides.map((guide, idx) => (
                <div key={idx}>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Dumbbell className="h-5 w-5" />
                    {guide.name}
                  </h3>
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIdx) => (
                      <li
                        key={stepIdx}
                        className="flex items-start gap-3"
                      >
                        <span className="min-w-[24px] rounded-full bg-gray-100 px-2 py-1 text-center text-sm font-medium text-gray-700">
                          {stepIdx + 1}
                        </span>
                        <p className="text-sm text-gray-700">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Integration with Running Schedule */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Integration with Running Schedule
            </CardTitle>
            <CardDescription className="text-gray-600">
              How strength training fits into your overall
              program
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {phases.map((phase, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${phase.color}`}
                >
                  <h4 className="mb-2 font-semibold text-gray-900">
                    {phase.title}
                  </h4>
                  <p className="mb-1 text-sm text-gray-700">
                    {phase.frequency}
                  </p>
                  <p className="text-sm text-gray-600">
                    {phase.notes}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progression Guidelines */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900">
              Progression Guidelines
            </CardTitle>
            <CardDescription className="text-gray-600">
              How and when to advance your training
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Clock className="h-5 w-5" />
                  Weight Progression
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
                    <p className="text-sm text-gray-700">
                      Week 1-2: Master form with bodyweight
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
                    <p className="text-sm text-gray-700">
                      Week 3-4: Add 5-10% body weight
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
                    <p className="text-sm text-gray-700">
                      Week 5-6: Progress to 10-15% body
                      weight
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
                    <p className="text-sm text-gray-700">
                      Use dumbbells, weighted vest, or
                      barbell
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
                    <p className="text-sm text-gray-700">
                      Never sacrifice form for weight
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <AlertTriangle className="h-5 w-5" />
                  When to Progress
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
                    <p className="text-sm text-gray-700">
                      Can complete all sets with perfect
                      form
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
                    <p className="text-sm text-gray-700">
                      No excessive soreness lasting more
                      than 48 hours
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
                    <p className="text-sm text-gray-700">
                      Feel recovered between sessions
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
                    <p className="text-sm text-gray-700">
                      Movement feels controlled and stable
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
                    <p className="text-sm text-gray-700">
                      Ready for increased challenge
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
