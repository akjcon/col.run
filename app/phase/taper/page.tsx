export default function TaperPhase() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="phase-header">
        <h1 className="text-3xl font-bold">Week 11: Taper</h1>
        <p className="text-green-100 mt-2">
          Target: 30-35 miles, 7,000 ft vertical (60% reduction)
        </p>
      </div>

      {/* Taper Principles */}
      <div className="section-card mb-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Taper Principles
        </h2>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p className="font-semibold mb-2">
            🎯 Goal: Arrive at race day fresh while maintaining fitness
          </p>
          <ul className="space-y-1 text-sm">
            <li>• Reduce volume by 60% from peak weeks</li>
            <li>• Maintain intensity to keep systems sharp</li>
            <li>• Prioritize sleep and recovery</li>
            <li>• Trust the taper - fitness is in the bank!</li>
          </ul>
        </div>
      </div>

      {/* Daily Schedule */}
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Daily Schedule
        </h2>

        {/* Monday */}
        <div className="workout-card border-l-gray-400 mb-4">
          <h3 className="font-bold text-lg mb-2">Monday: Rest</h3>
          <p>
            <span className="font-semibold">Workout:</span> Complete rest
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Begin taper period
          </p>
        </div>

        {/* Tuesday */}
        <div className="workout-card border-l-orange-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Tuesday: Zone 4 Intervals (Reduced)
          </h3>
          <p>
            <span className="font-semibold">Distance:</span> 5 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z4 (185+ HR)
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 800 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> 4×3 min @ Z4 (3
            min recovery)
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: 30% volume reduction from previous weeks
          </p>
        </div>

        {/* Wednesday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Wednesday: Easy Run</h3>
          <p>
            <span className="font-semibold">Distance:</span> 4-5 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 800 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Keep it comfortable
          </p>
        </div>

        {/* Thursday */}
        <div className="workout-card border-l-green-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Thursday: Easy + Strides</h3>
          <p>
            <span className="font-semibold">Distance:</span> 4 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 500 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> Include 6×20 sec
            strides
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Maintain leg speed
          </p>
        </div>

        {/* Friday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Friday: Recovery</h3>
          <p>
            <span className="font-semibold">Distance:</span> 3 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 300 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">Notes: Minimal stress</p>
        </div>

        {/* Saturday */}
        <div className="workout-card border-l-yellow-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Saturday: Medium Long</h3>
          <p>
            <span className="font-semibold">Distance:</span> 10-12 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1-Z3
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 3,000 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> Include 15 min Z3
            effort
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Practice race day routine, final gear check
          </p>
        </div>

        {/* Sunday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Sunday: Easy</h3>
          <p>
            <span className="font-semibold">Distance:</span> 5-6 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 1,000 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Relaxed pace, focus on feeling good
          </p>
        </div>
      </div>

      {/* Weekly Totals */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">Weekly Total</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold">Total Distance:</p>
            <p className="text-2xl">31-35 miles</p>
            <p className="text-sm text-gray-600 mt-1">
              60% reduction from peak
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-semibold">Total Vertical:</p>
            <p className="text-2xl">6,400-7,400 ft</p>
            <p className="text-sm text-gray-600 mt-1">
              Maintaining specificity
            </p>
          </div>
        </div>
      </div>

      {/* Taper Week Focus */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Taper Week Focus Areas
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Physical Preparation</h4>
            <ul className="space-y-1 text-sm">
              <li>• Prioritize sleep (8+ hours)</li>
              <li>• Stay hydrated</li>
              <li>• Light stretching/mobility work</li>
              <li>• Avoid new activities</li>
              <li>• Maintain normal diet</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Mental Preparation</h4>
            <ul className="space-y-1 text-sm">
              <li>• Review race plan</li>
              <li>• Visualize success</li>
              <li>• Trust your training</li>
              <li>• Stay positive if feeling flat</li>
              <li>• Prepare race logistics</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Common Taper Feelings */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Common Taper Experiences
        </h3>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="font-semibold mb-2">
            ⚠️ Don&apos;t panic if you experience:
          </p>
          <ul className="space-y-1 text-sm">
            <li>• Feeling sluggish or heavy legs</li>
            <li>• Minor aches that seem magnified</li>
            <li>• Anxiety about losing fitness</li>
            <li>• Restlessness from reduced training</li>
            <li>• Doubts about your preparation</li>
          </ul>
          <p className="text-sm mt-3 font-semibold">
            These are normal! Your body is adapting and will be ready on race
            day.
          </p>
        </div>
      </div>
    </div>
  );
}
