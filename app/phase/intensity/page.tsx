export default function IntensityPhase() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="phase-header">
        <h1 className="text-3xl font-bold">
          Weeks 5-8: Intensity Introduction
        </h1>
        <p className="text-green-100 mt-2">
          Target: 50-55 miles/week, 10,000-12,000 ft vertical
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
            <span className="font-semibold">Workout:</span> Full rest or 30 min
            easy activity
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Recovery from intensity and weekend volume
          </p>
        </div>

        {/* Tuesday */}
        <div className="workout-card border-l-yellow-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Tuesday: Zone 3 Intervals + Muscular Endurance
          </h3>
          <div className="space-y-2">
            <div>
              <p className="font-semibold">AM Workout: Zone 3 intervals</p>
              <p>• Distance: 6-7 miles total</p>
              <p>• Zone: Z3 (165-175 HR)</p>
              <p>• Vertical: 1,200 ft</p>
              <p>• Interval Structure: 3×8 min @ Z3 (3 min recovery)</p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">
                PM Workout: Muscular Endurance Options
              </p>
              <p className="text-sm">Option 1 - Gym Circuit:</p>
              <ul className="ml-4 text-sm">
                <li>• 6×10 reps each exercise (1 min rest)</li>
                <li>• Focus on explosive movement</li>
              </ul>
              <p className="text-sm mt-2">Option 2 - Steep Hill ME:</p>
              <ul className="ml-4 text-sm">
                <li>• 2×15 min Z3 on 20%+ grade</li>
                <li>• 5 min recovery between sets</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wednesday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Wednesday: Zone 1 Base</h3>
          <p>
            <span className="font-semibold">Distance:</span> 7-8 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 1,500 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Easy pace, active recovery from Tuesday
          </p>
        </div>

        {/* Thursday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Thursday: Zone 1 + Hill Sprints
          </h3>
          <div className="space-y-2">
            <div>
              <p className="font-semibold">AM Workout:</p>
              <p>• 5-6 miles easy run</p>
              <p>• Zone: Z1</p>
              <p>• Vertical: 800 ft</p>
              <p>• Hill Sprints: 6×10 sec (reduced volume from ME day)</p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">PM Workout:</p>
              <p>• Light core work</p>
            </div>
          </div>
        </div>

        {/* Friday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Friday: Recovery Run</h3>
          <p>
            <span className="font-semibold">Distance:</span> 4-5 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 500 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Prepare for weekend specificity work
          </p>
        </div>

        {/* Saturday */}
        <div className="workout-card border-l-orange-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Saturday: Long Specific Run
          </h3>
          <p>
            <span className="font-semibold">Distance:</span> 12-14 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1-Z2
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 3,500-4,000 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> Include 20-30 min
            Z2 effort in middle
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Practice race nutrition and pacing
          </p>
        </div>

        {/* Sunday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Sunday: Long Zone 1</h3>
          <p>
            <span className="font-semibold">Distance:</span> 10-12 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 2,500 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Stay aerobic, build volume
          </p>
        </div>
      </div>

      {/* Weekly Totals */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">Weekly Totals</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold">Total Distance:</p>
            <p className="text-2xl">50-55 miles</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold">Total Vertical:</p>
            <p className="text-2xl">10,000-12,000 ft</p>
          </div>
        </div>
      </div>

      {/* Muscular Endurance Details */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Muscular Endurance Training Details
        </h3>

        <div className="mb-4">
          <h4 className="font-semibold mb-2">Gym-Based ME Circuit</h4>
          <p className="text-gray-600 mb-2">
            Structure: 6 exercises, 6×10 reps each, 1 min rest between sets
          </p>
          <ul className="space-y-1 ml-4">
            <li>• Box step-ups (weighted)</li>
            <li>• Front lunges (weighted)</li>
            <li>• Split jump squats</li>
            <li>• Squat jumps</li>
            <li>• Single-leg deadlifts</li>
            <li>• Step-downs</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Steep Hill ME</h4>
          <p className="text-gray-600 mb-2">
            Structure: 2×15 min sustained Z3 effort on 20%+ grade
          </p>
          <ul className="space-y-1 ml-4">
            <li>• Focus on maintaining power output</li>
            <li>• 5 min recovery between sets</li>
            <li>• Emphasizes sport-specific movement</li>
          </ul>
        </div>
      </div>

      {/* Key Changes from Base Phase */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Key Changes from Base Phase
        </h3>
        <ul className="space-y-2">
          <li>• Introduction of Zone 3 intervals on Tuesday</li>
          <li>• Addition of muscular endurance training</li>
          <li>• Increased weekly mileage (10% increase)</li>
          <li>• More vertical gain per week</li>
          <li>• Specific race pace work in Saturday long runs</li>
          <li>• Reduced hill sprint volume to balance with ME work</li>
        </ul>
      </div>
    </div>
  );
}
