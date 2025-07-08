export default function RaceWeekPhase() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="phase-header">
        <h1 className="text-3xl font-bold">Week 12: Race Week</h1>
        <p className="text-green-100 mt-2">
          Target: 15-20 miles + RACE, 2,000-3,000 ft vertical
        </p>
      </div>

      {/* Daily Schedule */}
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Race Week Schedule
        </h2>

        {/* Monday */}
        <div className="workout-card border-l-gray-400 mb-4">
          <h3 className="font-bold text-lg mb-2">Monday 9/9: Rest</h3>
          <p>
            <span className="font-semibold">Workout:</span> Complete rest
          </p>
          <div className="mt-2 text-sm bg-gray-50 p-3 rounded">
            <p className="font-semibold">To-Do List:</p>
            <ul className="ml-4 mt-1">
              <li>• Prep all race gear</li>
              <li>• Finalize logistics (travel, accommodation)</li>
              <li>• Review race course and aid stations</li>
              <li>• Hydrate well</li>
            </ul>
          </div>
        </div>

        {/* Tuesday */}
        <div className="workout-card border-l-green-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Tuesday 9/10: Sharpener</h3>
          <p>
            <span className="font-semibold">Distance:</span> 4 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1/Z4
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 500 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> 4×30 sec @ race
            pace (3 min recovery)
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Feel the speed, stay sharp
          </p>
        </div>

        {/* Wednesday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Wednesday 9/11: Easy + Strides
          </h3>
          <p>
            <span className="font-semibold">Distance:</span> 3 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 400 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> 6×20 sec strides
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Stay loose and relaxed
          </p>
        </div>

        {/* Thursday */}
        <div className="workout-card border-l-gray-400 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Thursday 9/12: Rest or Easy
          </h3>
          <p>
            <span className="font-semibold">Workout:</span> Listen to your body
          </p>
          <p>
            <span className="font-semibold">Option 1:</span> Complete rest if
            feeling flat
          </p>
          <p>
            <span className="font-semibold">Option 2:</span> 20 min easy jog if
            antsy
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 0-200 ft
          </p>
          <div className="mt-2 text-sm bg-gray-50 p-3 rounded">
            <p className="font-semibold">Pre-Race Prep:</p>
            <ul className="ml-4 mt-1">
              <li>• Carb loading continues</li>
              <li>• Pack drop bags if needed</li>
              <li>• Set out race clothes</li>
              <li>• Early to bed!</li>
            </ul>
          </div>
        </div>

        {/* Friday */}
        <div className="workout-card border-l-yellow-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Friday 9/13: Activation</h3>
          <p>
            <span className="font-semibold">Distance:</span> 3 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 500 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> 3×30 sec pickups +
            4×20 sec strides
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Final prep, check all systems
          </p>
          <div className="mt-2 text-sm bg-gray-50 p-3 rounded">
            <p className="font-semibold">Race Eve Checklist:</p>
            <ul className="ml-4 mt-1">
              <li>• Pin bib to race shirt</li>
              <li>• Charge all electronics</li>
              <li>• Prepare race breakfast</li>
              <li>• Review pacing strategy</li>
            </ul>
          </div>
        </div>

        {/* Saturday - RACE DAY */}
        <div className="workout-card border-l-red-600 border-l-8 mb-4 bg-gradient-to-r from-red-50 to-orange-50">
          <h3 className="font-bold text-xl mb-2 text-red-600">
            Saturday 9/14: RACE DAY! 🏃‍♂️⛰️
          </h3>
          <p>
            <span className="font-semibold">Event:</span> 50K Trail Race
          </p>
          <p>
            <span className="font-semibold">Distance:</span> 31 miles
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 10,000 ft
          </p>
          <p className="font-semibold mt-2">
            Goal: Execute race plan, finish strong and healthy
          </p>
        </div>

        {/* Sunday */}
        <div className="workout-card border-l-blue-300 mb-4">
          <h3 className="font-bold text-lg mb-2">Sunday 9/15: Recovery</h3>
          <p>
            <span className="font-semibold">Workout:</span> Easy walk or light
            movement
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Celebrate and begin recovery process 🎉
          </p>
        </div>
      </div>

      {/* Race Day Strategy */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Race Day Strategy
        </h2>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Pacing Strategy</h3>
          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded">
              <p className="font-semibold">Miles 1-8: Start Conservative</p>
              <p className="text-sm">
                Zone 1 pace, settle in, find your rhythm
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="font-semibold">Miles 9-20: Build Momentum</p>
              <p className="text-sm">
                Build to Zone 2, find sustainable rhythm
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <p className="font-semibold">Miles 21-28: Stay Strong</p>
              <p className="text-sm">Manage fatigue, stay strong on climbs</p>
            </div>
            <div className="bg-orange-50 p-4 rounded">
              <p className="font-semibold">Miles 29-31: Empty the Tank</p>
              <p className="text-sm">
                Give everything you have left, finish strong!
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Nutrition Plan</h3>
            <ul className="space-y-1 text-sm">
              <li>
                • <strong>Pre-race:</strong> 3-4 hours before - familiar
                breakfast
              </li>
              <li>
                • <strong>Start fueling:</strong> 45-60 minutes in
              </li>
              <li>
                • <strong>Target:</strong> 200-300 calories/hour
              </li>
              <li>
                • <strong>Sources:</strong> Gels, bars, real food at aid
                stations
              </li>
              <li>
                • <strong>Hydration:</strong> Drink to thirst + electrolytes
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Mental Strategy</h3>
            <ul className="space-y-1 text-sm">
              <li>• Break race into segments</li>
              <li>• Focus on current mile only</li>
              <li>• Use positive self-talk</li>
              <li>• Smile at aid stations</li>
              <li>• Remember: You&#39;ve done the work!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Race Morning Timeline */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Race Morning Timeline
        </h3>
        <div className="space-y-2">
          <div className="flex">
            <span className="font-semibold w-24">-3:00</span>
            <span>Wake up, eat breakfast</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-24">-2:00</span>
            <span>Hydrate, final prep</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-24">-1:00</span>
            <span>Arrive at venue, check-in</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-24">-0:30</span>
            <span>Warm-up jog, dynamic stretches</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-24">-0:10</span>
            <span>Final bathroom stop, line up</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-24">0:00</span>
            <span>GO TIME! 🚀</span>
          </div>
        </div>
      </div>

      {/* Gear Checklist */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Race Day Gear Checklist
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Essential Gear</h4>
            <ul className="space-y-1 text-sm">
              <li>□ Trail shoes (tested, not new!)</li>
              <li>□ Race outfit (moisture-wicking)</li>
              <li>□ GPS watch (charged)</li>
              <li>□ Race bib + pins</li>
              <li>□ Hydration system</li>
              <li>□ Nutrition (gels, bars)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Additional Items</h4>
            <ul className="space-y-1 text-sm">
              <li>□ Hat/visor</li>
              <li>□ Sunglasses</li>
              <li>□ Sunscreen</li>
              <li>□ Anti-chafe products</li>
              <li>□ Emergency gear (if required)</li>
              <li>□ Drop bag items (if applicable)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Final Thoughts */}
      <div className="section-card mt-6 bg-gradient-to-r from-green-50 to-blue-50">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          You&#39;re Ready!
        </h3>
        <p className="mb-2">
          You&#39;ve put in 12 weeks of dedicated training. Trust your fitness,
          execute your plan, and enjoy the journey.
        </p>
        <p className="font-semibold text-green-700">
          Good luck - you&#39;ve got this! 🏔️✨
        </p>
      </div>
    </div>
  );
}
