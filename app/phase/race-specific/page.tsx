export default function RaceSpecificPhase() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="phase-header">
        <h1 className="text-3xl font-bold">Weeks 9-10: Race Specificity</h1>
        <p className="text-green-100 mt-2">
          Target: 50-55 miles/week, 12,000+ ft vertical
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Weekly Schedule Template
        </h2>

        {/* Monday */}
        <div className="workout-card border-l-gray-400 mb-4">
          <h3 className="font-bold text-lg mb-2">Monday: Rest</h3>
          <p>
            <span className="font-semibold">Workout:</span> Complete rest
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Full recovery for intensity work
          </p>
        </div>

        {/* Tuesday */}
        <div className="workout-card border-l-red-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Tuesday: Zone 4 Intervals</h3>
          <div className="space-y-2">
            <div>
              <p className="font-semibold">Workout: High-intensity intervals</p>
              <p>• Distance: 6-7 miles</p>
              <p>• Zone: Z4 (185+ HR)</p>
              <p>• Vertical: 1,000 ft</p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">Week 9 Structure:</p>
              <p>• 30/30s - 2×(10×30 sec @ Z4, 30 sec recovery)</p>
              <p>• 5 min recovery between sets</p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">Week 10 Structure:</p>
              <p>• 4×4 min @ Z4 (3 min recovery)</p>
              <p>• Focus on sustainable hard effort</p>
            </div>
          </div>
        </div>

        {/* Wednesday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">
            Wednesday: Zone 1 + Strength Maintenance
          </h3>
          <div className="space-y-2">
            <div>
              <p className="font-semibold">AM Workout:</p>
              <p>• 6-7 miles easy run</p>
              <p>• Zone: Z1</p>
              <p>• Vertical: 1,200 ft</p>
            </div>
            <div className="mt-3">
              <p className="font-semibold">PM Workout:</p>
              <p>• Maintenance strength (reduced volume)</p>
              <p>• Frequency: 1×/week vs 2×/week in base phase</p>
              <p>• Focus on power and injury prevention</p>
            </div>
          </div>
        </div>

        {/* Thursday */}
        <div className="workout-card border-l-yellow-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Thursday: Zone 3 Tempo</h3>
          <p>
            <span className="font-semibold">Distance:</span> 6-7 miles total
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z3 (170-175 HR)
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 1,500 ft
          </p>
          <p>
            <span className="font-semibold">Structure:</span> 25-30 min
            sustained @ race effort
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Practice race pacing and effort
          </p>
        </div>

        {/* Friday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Friday: Easy Shakeout</h3>
          <p>
            <span className="font-semibold">Distance:</span> 4 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 400 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Keep legs loose for weekend
          </p>
        </div>

        {/* Saturday */}
        <div className="workout-card border-l-purple-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Saturday: Race Simulation</h3>
          <p>
            <span className="font-semibold">Distance:</span> 16-18 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1-Z3
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 4,500-5,000 ft
          </p>
          <div className="mt-2">
            <p className="font-semibold">Structure:</p>
            <ul className="ml-4 text-sm space-y-1">
              <li>• Miles 1-6: Z1 (race start pace)</li>
              <li>• Miles 7-14: Alternate Z2/Z3 every 2 miles</li>
              <li>• Final miles: Z1 cooldown</li>
            </ul>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            Notes: Practice all race day logistics, nutrition, gear
          </p>
        </div>

        {/* Sunday */}
        <div className="workout-card border-l-blue-500 mb-4">
          <h3 className="font-bold text-lg mb-2">Sunday: Recovery Long</h3>
          <p>
            <span className="font-semibold">Distance:</span> 8-10 miles
          </p>
          <p>
            <span className="font-semibold">Zone:</span> Z1
          </p>
          <p>
            <span className="font-semibold">Vertical:</span> 2,500 ft
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Notes: Practice recovery, stay aerobic
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
            <p className="text-2xl">12,000+ ft</p>
          </div>
        </div>
      </div>

      {/* Race Simulation Details */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Race Simulation Guidelines
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Logistics Practice</h4>
            <ul className="space-y-1 ml-4">
              <li>• Use exact race day nutrition plan</li>
              <li>• Wear race day clothing and shoes</li>
              <li>• Practice hydration system</li>
              <li>• Test all gear (watch, pack, poles if using)</li>
              <li>• Start at planned race start time</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Pacing Strategy</h4>
            <ul className="space-y-1 ml-4">
              <li>• Start conservatively (Z1) to simulate race day</li>
              <li>• Practice effort management on climbs</li>
              <li>• Work on consistent pacing in Z2/Z3</li>
              <li>• Learn how effort feels at different stages</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Mental Preparation</h4>
            <ul className="space-y-1 ml-4">
              <li>• Visualize race segments</li>
              <li>• Practice positive self-talk</li>
              <li>• Work through challenging moments</li>
              <li>• Build confidence in your fitness</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Key Focus Points */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Key Focus Points
        </h3>
        <ul className="space-y-2">
          <li>• Peak intensity with Zone 4 work</li>
          <li>• Maintain high vertical gain for race specificity</li>
          <li>• Full race rehearsal on Saturday</li>
          <li>• Reduce strength training to maintenance only</li>
          <li>• Fine-tune nutrition and hydration strategy</li>
          <li>• Build mental confidence through simulation</li>
        </ul>
      </div>
    </div>
  );
}
