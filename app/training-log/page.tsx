"use client";

import { useState } from "react";

export default function TrainingLog() {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const dailyTemplate = `Date: [DATE]
Workout Type: [Easy/Long/Intervals/Tempo/Recovery]
Planned: [DISTANCE] miles, [VERTICAL] ft
Actual: [DISTANCE] miles, [VERTICAL] ft

Duration: [TIME]
Avg HR: [HR] bpm
Avg Pace: [PACE] min/mile

Route/Location: [WHERE]
Weather: [CONDITIONS]

How I Felt:
- Energy (1-10): 
- Legs (1-10): 
- Overall (1-10): 

Notes: [ANY OBSERVATIONS]

Nutrition:
- Pre-run: 
- During: 
- Post-run: 

Tomorrow's Plan: [NEXT WORKOUT]`;

  const weeklyTemplate = `Week [#] Summary
Dates: [START] - [END]

Total Miles: [MILES]
Total Vertical: [VERT] ft
Total Time: [TIME]

Key Workouts:
1. [WORKOUT 1 SUMMARY]
2. [WORKOUT 2 SUMMARY]
3. [WORKOUT 3 SUMMARY]

Strengths This Week:
- 
- 

Areas to Improve:
- 
- 

Sleep Average: [HOURS]
Overall Fatigue (1-10): 
Injury Niggles: 

Next Week's Focus: [GOALS]`;

  const raceReportTemplate = `Race: [RACE NAME]
Date: [DATE]
Distance: [DISTANCE]
Elevation Gain: [VERT] ft

Goal Time: [TIME]
Actual Time: [TIME]
Place: [OVERALL]/[GENDER]/[AG]

RACE EXECUTION
Pre-Race:
- Sleep: [HOURS]
- Breakfast: [WHAT/WHEN]
- Warm-up: [ROUTINE]
- Mental State: [1-10]

Pacing:
- Start (Miles 1-10): [TIME/FEEL]
- Middle (Miles 11-20): [TIME/FEEL]
- Finish (Miles 21-31): [TIME/FEEL]

Nutrition:
- What worked: 
- What didn't: 
- Calories consumed: 

Challenges:
- 
- 

Victories:
- 
- 

Lessons Learned:
- 
- 

What I'd Do Differently:
- 
- 

Overall Satisfaction (1-10): 
Recovery Plan: [NEXT STEPS]`;

  const copyToClipboard = (text: string, templateName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateName);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Training Log Templates</h1>

      {/* Daily Log Template */}
      <div className="section-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-700">
            Daily Training Log
          </h2>
          <button
            onClick={() => copyToClipboard(dailyTemplate, "daily")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            {copiedTemplate === "daily" ? "Copied!" : "Copy Template"}
          </button>
        </div>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm whitespace-pre-wrap">
          {dailyTemplate}
        </pre>
      </div>

      {/* Weekly Summary Template */}
      <div className="section-card mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-700">Weekly Summary</h2>
          <button
            onClick={() => copyToClipboard(weeklyTemplate, "weekly")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            {copiedTemplate === "weekly" ? "Copied!" : "Copy Template"}
          </button>
        </div>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm whitespace-pre-wrap">
          {weeklyTemplate}
        </pre>
      </div>

      {/* Race Report Template */}
      <div className="section-card mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-700">Race Report</h2>
          <button
            onClick={() => copyToClipboard(raceReportTemplate, "race")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            {copiedTemplate === "race" ? "Copied!" : "Copy Template"}
          </button>
        </div>
        <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-sm whitespace-pre-wrap">
          {raceReportTemplate}
        </pre>
      </div>

      {/* Key Metrics to Track */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Key Metrics to Track
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Daily Metrics</h3>
            <ul className="space-y-1 text-sm">
              <li>• Morning heart rate (resting)</li>
              <li>• Sleep quality and duration</li>
              <li>• Energy levels (1-10 scale)</li>
              <li>• Leg freshness (1-10 scale)</li>
              <li>• Any pain or discomfort</li>
              <li>• Weather conditions</li>
              <li>• Nutrition timing and types</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Weekly Metrics</h3>
            <ul className="space-y-1 text-sm">
              <li>• Total mileage</li>
              <li>• Total vertical gain</li>
              <li>• Time in each training zone</li>
              <li>• Number of quality sessions</li>
              <li>• Average sleep hours</li>
              <li>• Body weight trends</li>
              <li>• Overall fatigue level</li>
            </ul>
          </div>
        </div>
      </div>

      {/* RPE Scale Reference */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          RPE (Rate of Perceived Exertion) Scale
        </h2>

        <div className="overflow-x-auto">
          <table className="training-table">
            <thead>
              <tr>
                <th>RPE</th>
                <th>Zone</th>
                <th>Description</th>
                <th>Talk Test</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">1-2</td>
                <td>Recovery</td>
                <td>Very easy, barely moving</td>
                <td>Can sing</td>
              </tr>
              <tr>
                <td className="font-semibold">3-4</td>
                <td>Zone 1</td>
                <td>Easy, all-day pace</td>
                <td>Full conversation</td>
              </tr>
              <tr>
                <td className="font-semibold">5-6</td>
                <td>Zone 2</td>
                <td>Steady, marathon effort</td>
                <td>Sentences</td>
              </tr>
              <tr>
                <td className="font-semibold">7-8</td>
                <td>Zone 3</td>
                <td>Comfortably hard, tempo</td>
                <td>Short phrases</td>
              </tr>
              <tr>
                <td className="font-semibold">9</td>
                <td>Zone 4</td>
                <td>Hard, sustainable for 30-60 min</td>
                <td>Few words</td>
              </tr>
              <tr>
                <td className="font-semibold">10</td>
                <td>Zone 5</td>
                <td>Maximum effort</td>
                <td>Can&apos;t talk</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Training Log Tips */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Effective Logging Tips
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Be Consistent</h3>
            <p className="text-sm">
              Log immediately after runs while details are fresh. Even brief
              notes are valuable.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Track Patterns</h3>
            <p className="text-sm">
              Look for correlations between sleep, nutrition, stress, and
              performance.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Be Honest</h3>
            <p className="text-sm">
              Record how you actually felt, not how you think you should have
              felt.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Review Regularly</h3>
            <p className="text-sm">
              Weekly and monthly reviews help identify trends and adjust
              training.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
