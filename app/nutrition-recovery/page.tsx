export default function NutritionRecovery() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Nutrition & Recovery Guidelines
      </h1>

      {/* Daily Recovery Protocols */}
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Daily Recovery Protocols
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Sleep</h3>
            <ul className="space-y-2 text-sm">
              <li>• Target: 8+ hours nightly</li>
              <li>• Consistent sleep/wake times</li>
              <li>• Dark, cool room (65-68°F)</li>
              <li>• No screens 1 hour before bed</li>
              <li>• Consider sleep tracking</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Hydration</h3>
            <ul className="space-y-2 text-sm">
              <li>• Pale yellow urine as guide</li>
              <li>• 0.5-1oz per pound body weight daily</li>
              <li>• Add electrolytes for runs over 90 min</li>
              <li>• Hydrate before feeling thirsty</li>
              <li>• Monitor sweat rate in training</li>
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold mb-3">Post-Workout Nutrition</h3>
          <div className="bg-blue-50 p-4 rounded">
            <p className="font-semibold">Within 30 minutes:</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• 3:1 or 4:1 carbohydrate:protein ratio</li>
              <li>• 100-200 calories for workouts less than 1 hour</li>
              <li>• 200-400 calories for workouts greater than 1 hour</li>
              <li>
                • Examples: Chocolate milk, banana + nut butter, recovery drink
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Weekly Recovery */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Weekly Recovery Strategies
        </h2>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold">Rest Days</h4>
            <p className="text-sm">One complete rest day per week minimum</p>
            <p className="text-sm mt-1">
              Light walking or easy movement is fine, but no structured training
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold">Easy Runs</h4>
            <p className="text-sm">
              Should feel genuinely easy - conversational pace throughout
            </p>
            <p className="text-sm mt-1">
              If you can&apos;t speak in full sentences, you&apos;re going too
              hard
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold">Monitoring</h4>
            <p className="text-sm">Check morning heart rate daily</p>
            <p className="text-sm mt-1">
              5+ bpm elevation = possible overreaching, consider extra recovery
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold">Recovery Weeks</h4>
            <p className="text-sm">Every 4th week built into plan</p>
            <p className="text-sm mt-1">
              Reduced volume while maintaining some intensity
            </p>
          </div>
        </div>
      </div>

      {/* Foam Rolling & Mobility */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Foam Rolling & Mobility
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Foam Rolling Protocol</h3>
            <p className="text-sm mb-2">10-15 minutes, 3-4× per week</p>
            <ul className="space-y-1 text-sm">
              <li>• IT bands - 60 seconds each side</li>
              <li>• Calves - 60 seconds each</li>
              <li>• Quads - 90 seconds each</li>
              <li>• Hamstrings - 90 seconds each</li>
              <li>• Glutes - 60 seconds each</li>
              <li>• Lower back - 60 seconds (careful!)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Dynamic Stretching</h3>
            <p className="text-sm mb-2">Pre-run activation (5-10 minutes)</p>
            <ul className="space-y-1 text-sm">
              <li>• Leg swings - 10 each direction</li>
              <li>• Walking lunges - 10 each leg</li>
              <li>• High knees - 20 steps</li>
              <li>• Butt kicks - 20 steps</li>
              <li>• Lateral lunges - 10 each side</li>
              <li>• Ankle circles - 10 each direction</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Race Nutrition Strategy */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Race Nutrition Strategy
        </h2>

        <div className="mb-4">
          <h3 className="font-semibold mb-3">Pre-Race (3 Days Out)</h3>
          <div className="bg-yellow-50 p-4 rounded">
            <h4 className="font-semibold">Carb Loading Protocol</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Increase carbs to 3-4g per pound body weight</li>
              <li>• Reduce fiber intake to prevent GI issues</li>
              <li>• Stay well hydrated</li>
              <li>• Avoid trying new foods</li>
              <li>• Light training only</li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Race Morning</h3>
            <p className="text-sm font-semibold">3-4 hours before:</p>
            <ul className="space-y-1 text-sm">
              <li>• Familiar breakfast (300-500 calories)</li>
              <li>• Examples: Oatmeal + banana, toast + PB</li>
              <li>• 16-24 oz fluids</li>
              <li>• Minimal fiber and fat</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">During Race</h3>
            <p className="text-sm font-semibold">Fueling plan:</p>
            <ul className="space-y-1 text-sm">
              <li>• Start at 45-60 minutes</li>
              <li>• 200-300 calories per hour</li>
              <li>• Mix of gels, bars, real food</li>
              <li>• Practice everything in training</li>
              <li>• Drink to thirst + electrolytes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Training Nutrition */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Daily Training Nutrition
        </h2>

        <div className="overflow-x-auto">
          <table className="training-table">
            <thead>
              <tr>
                <th>Workout Type</th>
                <th>Pre-Workout</th>
                <th>During</th>
                <th>Post-Workout</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">Easy Runs (&lt;60 min)</td>
                <td>Optional small snack</td>
                <td>Water only</td>
                <td>Normal meal within 2 hours</td>
              </tr>
              <tr>
                <td className="font-semibold">Long Runs</td>
                <td>200-300 cal, 2 hrs before</td>
                <td>150-250 cal/hour after 60 min</td>
                <td>Recovery drink + meal</td>
              </tr>
              <tr>
                <td className="font-semibold">Intensity Work</td>
                <td>100-200 cal, 1-2 hrs before</td>
                <td>Sports drink if over 60 min</td>
                <td>Recovery drink within 30 min</td>
              </tr>
              <tr>
                <td className="font-semibold">Back-to-Back</td>
                <td>Normal breakfast</td>
                <td>Practice race nutrition</td>
                <td>Focus on recovery between</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Common Issues & Solutions */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Common Issues & Solutions
        </h2>

        <div className="space-y-4">
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold">GI Distress</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Reduce fiber 24-48 hours before long runs/race</li>
              <li>• Avoid high-fat foods pre-run</li>
              <li>• Start fueling earlier with smaller amounts</li>
              <li>• Test different fuel sources in training</li>
            </ul>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold">Energy Crashes</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Increase fueling frequency</li>
              <li>• Mix fuel types (liquid + solid)</li>
              <li>• Check overall daily calorie intake</li>
              <li>• Consider adding more complex carbs</li>
            </ul>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold">Cramping</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Increase electrolyte intake</li>
              <li>• Check hydration status</li>
              <li>• Add salt to meals</li>
              <li>• Consider electrolyte supplements</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Key Supplements */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Beneficial Supplements
        </h2>

        <div className="bg-green-50 p-4 rounded mb-4">
          <p className="text-sm italic">
            Always consult with a healthcare provider before starting
            supplements
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Performance</h4>
            <ul className="space-y-1 text-sm">
              <li>• Caffeine: 3-6mg/kg before hard efforts</li>
              <li>• Beta-alanine: 3-5g daily</li>
              <li>• Creatine: 3-5g daily (optional)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Recovery</h4>
            <ul className="space-y-1 text-sm">
              <li>• Vitamin D: 1000-2000 IU daily</li>
              <li>• Omega-3: 1-2g EPA/DHA daily</li>
              <li>• Magnesium: 200-400mg before bed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
