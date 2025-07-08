import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Target, TrendingUp, Mountain, Quote } from "lucide-react";

export default function Overview() {
  const trainingZones = [
    {
      zone: "Zone 1",
      heartRate: "<130 HR",
      pace: "~9:30-10:00/mi",
      description: "Very Easy/Recovery - Feels almost too easy",
      color: "bg-slate-100 text-slate-700 border-slate-200",
    },
    {
      zone: "Zone 2",
      heartRate: "130-140 HR",
      pace: "~8:30-9:00/mi",
      description: "Aerobic Capacity - Comfortable, conversational",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      zone: "Zone 3",
      heartRate: "140-165 HR",
      pace: "~7:00-8:00/mi",
      description: "Threshold - Comfortably hard, sustainable",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      zone: "Zone 4",
      heartRate: "165-180 HR",
      pace: "~6:30-7:00/mi",
      description: "Above Threshold - Hard, challenging effort",
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

  const trainingPhases = [
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
      focus: "Add Zone 3 threshold work (140-165 HR), muscular endurance",
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

  const athleteProfile = [
    {
      label: "Background",
      value: "Former D1 Nordic skier (excellent aerobic base)",
    },
    { label: "Current Volume", value: "30-50 miles/week" },
    { label: "Longest Run", value: "50 miles" },
    { label: "Marathon PR", value: "2:57 (current fitness ~3:20)" },
    { label: "Easy Z2 Pace", value: "~9:00/mi at 137 HR" },
    { label: "Threshold Feel", value: "155-170 HR (from skiing background)" },
    { label: "Aerobic Development", value: "Strong - small AeT-LT gap" },
  ];

  const backToBackBenefits = [
    "Reduced injury risk vs single 20+ mile runs",
    "Faster recovery (1-2 days vs 3-4 days)",
    "Glycogen depletion training for fat adaptation",
    "Simulates cumulative fatigue of ultra racing",
    "Better time management vs 4+ hour single runs",
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-4 md:py-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Training Overview
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Comprehensive 12-week trail running program tailored for your 50K
            race
          </p>
        </div>

        {/* Athlete Profile */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Athlete Profile
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your background and current fitness level
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {athleteProfile.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-start py-2 border-b border-gray-100"
                >
                  <span className="font-medium text-gray-900">
                    {item.label}:
                  </span>
                  <span className="text-gray-700 text-right max-w-[60%]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coaching Note */}
        <Card className="border shadow-sm bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-2">
                  🏃‍♂️ Zones Adjusted for Your Background
                </p>
                <p className="text-blue-800 text-sm">
                  Based on your Nordic skiing background and threshold feel of
                  155-170 HR, these zones reflect your actual physiological
                  thresholds. Your strong aerobic development means Z1 will feel
                  &ldquo;stupidly easy&rdquo; but is still valuable for
                  recovery.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training Zones */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Training Zones
            </CardTitle>
            <CardDescription className="text-gray-600">
              Customized heart rate zones based on your skiing background and
              threshold feel
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Zone
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Heart Rate
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Pace
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trainingZones.map((zone, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <Badge
                          variant="outline"
                          className={`${zone.color} border text-sm`}
                        >
                          {zone.zone}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-900">
                        {zone.heartRate}
                      </td>
                      <td className="py-4 px-4 text-gray-700">{zone.pace}</td>
                      <td className="py-4 px-4 text-gray-600">
                        {zone.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Training Phase Overview */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Training Phase Overview
            </CardTitle>
            <CardDescription className="text-gray-600">
              12-week progression from base building to race day
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Weeks
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Phase
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Weekly Miles
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Vertical
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Focus
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trainingPhases.map((phase, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-900">
                        {phase.weeks}
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900">
                        {phase.phase}
                      </td>
                      <td className="py-4 px-4 text-gray-700">{phase.miles}</td>
                      <td className="py-4 px-4 text-gray-700">
                        {phase.vertical}
                      </td>
                      <td className="py-4 px-4 text-gray-600">{phase.focus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Back-to-Back Long Runs */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Mountain className="h-5 w-5" />
              Why Back-to-Back Long Runs?
            </CardTitle>
            <CardDescription className="text-gray-600">
              The science behind this training approach
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
              <Quote className="h-5 w-5 text-blue-600 mb-2" />
              <blockquote className="text-blue-800 italic mb-3">
                &ldquo;This gives you a similar training effect as doing one
                very long day by mimicking some of the demands of your event,
                but it reduces the stress and shortens the recovery time
                significantly.&rdquo;
              </blockquote>
              <cite className="text-blue-700 text-sm">
                - Training for the Uphill Athlete
              </cite>
            </div>

            <div className="space-y-3">
              {backToBackBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
