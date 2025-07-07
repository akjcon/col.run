export default function BasePhase() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="phase-header">
        <h1 className="text-3xl font-bold">Weeks 1-4: Base + Strength Phase</h1>
        <p className="text-green-100 mt-2">
          Target: 45-50 miles/week, 8,000-10,000 ft vertical
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Weekly Schedule Template
        </h2>

        {/* Monday */}
        <div className="workout-card border-l-gray-400 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Monday: Rest/Active Recovery
          </h3>
          <p>
            <span className="font-semibold">Workout:</span> Complete rest or
            20-30 min easy walk/bike
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Recovery
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Full recovery after weekend long runs
          </p>
        </div>

        {/* Tuesday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Tuesday: Zone 1 Run + Strength
          </h3>
          <div className="space-y-2">
            <div>
              <p className="font-semibold">AM Workout:</p>
              <p>• 6-8 miles Zone 1 with 8×15 sec pickups</p>
              <p>• Vertical: 1,000-1,500 ft</p>
              <p>• Pickups: 8×15 sec @ Z4 effort (2 min recovery between)</p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">
                PM Workout: Stage 3 Strength Program
              </p>
              <ul className="ml-4 text-sm">
                <li>• Box step-ups: 4×6 reps each leg (weighted)</li>
                <li>• Front lunges: 4×6 reps each leg (weighted)</li>
                <li>• Split jump squats: 4×6 reps each leg</li>
                <li>• Core: 5×30-45 sec planks</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wednesday */}
        <div className="workout-card border-l-green-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Wednesday: Zone 2 Sustained
          </h3>
          <p>
            <span className="font-semibold">Duration:</span> 60-75 minutes
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z2 (155-160 HR)
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 1,500-2,000 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Focus on maintaining steady effort, practice race nutrition
          </p>
        </div>

        {/* Thursday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Thursday: Recovery + Hill Sprints
          </h3>
          <div className="space-y-2">
            <div>
              <p className="font-semibold">AM Workout:</p>
              <p>• 4-5 miles recovery run</p>
              <p>• Zone: Z1</p>
              <p>• Vertical: 500 ft</p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">PM Workout:</p>
              <p>
                • Hill Sprints: 8×10 sec maximum effort uphill (2-3 min
                recovery)
              </p>
              <p>• Core: 6 exercises × max reps</p>
            </div>
          </div>
        </div>

        {/* Friday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Friday: Easy Run</h3>
          <p>
            <span className="font-semibold">Distance:</span> 5-6 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 800 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Keep it comfortable, prepare for weekend
          </p>
        </div>

        {/* Saturday */}
        <div className="workout-card border-l-orange-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Saturday: Long Run #1</h3>
          <p>
            <span className="font-semibold">Distance:</span> 10-12 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1-Z2
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 2,500-3,000 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Practice nutrition, include some Z2 sections
          </p>
        </div>

        {/* Sunday */}
        <div className="workout-card border-l-orange-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Sunday: Long Run #2</h3>
          <p>
            <span className="font-semibold">Distance:</span> 8-10 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 2,000 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Run on partially depleted glycogen, stay aerobic
          </p>
        </div>
      </div>

      {/* Weekly Totals */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">Weekly Totals</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold">Total Distance:</p>
            <p className="text-2xl">45-50 miles</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold">Total Vertical:</p>
            <p className="text-2xl">8,000-10,000 ft</p>
          </div>
        </div>
      </div>

      {/* Key Focus Points */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Key Focus Points
        </h3>
        <ul className="space-y-2">
          <li>• Build consistent aerobic base with primarily Zone 1 running</li>
          <li>• Establish strength training routine 2x per week</li>
          <li>• Practice nutrition strategies during longer runs</li>
          <li>• Focus on running form and efficiency</li>
          <li>• Listen to your body and prioritize recovery</li>
        </ul>
      </div>
    </div>
  );
}
