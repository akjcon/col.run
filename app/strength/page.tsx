export default function StrengthTraining() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Strength Training Program</h1>

      {/* Stage 3 Strength Program */}
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Stage 3 Strength Program
        </h2>
        <p className="text-gray-600 mb-4">
          Frequency: 2×/week (Weeks 1-6), then 1×/week maintenance
        </p>

        <div className="overflow-x-auto">
          <table className="training-table">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Sets × Reps</th>
                <th>Weight Progression</th>
                <th>Rest</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">Box Step-ups</td>
                <td>4 × 6 each leg</td>
                <td>Start bodyweight → +10-15% BW</td>
                <td>2 min</td>
                <td>Focus on control and knee tracking</td>
              </tr>
              <tr>
                <td className="font-semibold">Front Lunges</td>
                <td>4 × 6 each leg</td>
                <td>Start bodyweight → +10-15% BW</td>
                <td>2 min</td>
                <td>Step forward dynamically</td>
              </tr>
              <tr>
                <td className="font-semibold">Split Jump Squats</td>
                <td>4 × 6 each leg</td>
                <td>Bodyweight or +5-10% BW</td>
                <td>2 min</td>
                <td>Explosive movement, soft landing</td>
              </tr>
              <tr>
                <td className="font-semibold">Squat Jumps</td>
                <td>4 × 6</td>
                <td>Bodyweight</td>
                <td>2 min</td>
                <td>Maximum height, quiet landing</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Core Strength Progression */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Core Strength Progression
        </h2>

        <div className="overflow-x-auto">
          <table className="training-table">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Week 1-2</th>
                <th>Week 3-4</th>
                <th>Week 5+</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">Plank</td>
                <td>5 × 30 sec</td>
                <td>5 × 45 sec</td>
                <td>5 × 60 sec</td>
                <td>Add weight if too easy</td>
              </tr>
              <tr>
                <td className="font-semibold">Windshield Wipers</td>
                <td>3 × 8 each side</td>
                <td>3 × 10 each side</td>
                <td>3 × 12 each side</td>
                <td>Control the movement</td>
              </tr>
              <tr>
                <td className="font-semibold">Marching Plank</td>
                <td>3 × 30 sec</td>
                <td>3 × 45 sec</td>
                <td>3 × 60 sec</td>
                <td>Alternate limbs smoothly</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hill Sprint Protocol */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Hill Sprint Protocol
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Specifications</h3>
            <ul className="space-y-2">
              <li>
                <span className="font-semibold">Gradient:</span> 20-30% grade
                minimum
              </li>
              <li>
                <span className="font-semibold">Duration:</span> 8-10 seconds
                maximum effort
              </li>
              <li>
                <span className="font-semibold">Recovery:</span> 2-3 minutes
                complete rest (walk down)
              </li>
              <li>
                <span className="font-semibold">Volume:</span> Start 6 reps →
                build to 10 reps
              </li>
              <li>
                <span className="font-semibold">Frequency:</span> 1×/week
                throughout entire plan
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Execution Tips</h3>
            <ul className="space-y-2 text-sm">
              <li>• Find the steepest hill available</li>
              <li>• Focus on explosive power, not speed</li>
              <li>• Drive knees high and pump arms</li>
              <li>• Full recovery between reps is crucial</li>
              <li>• Quality over quantity always</li>
              <li>• Stop if form deteriorates</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
          <p className="font-semibold">⚡ Purpose:</p>
          <p className="text-sm">
            Hill sprints develop explosive power, improve running economy, and
            build fatigue-resistant muscle fibers crucial for mountain running.
          </p>
        </div>
      </div>

      {/* Exercise Descriptions */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Exercise Technique Guide
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Box Step-ups</h3>
            <ol className="list-decimal ml-6 space-y-1 text-sm">
              <li>
                Use a box height where thigh is parallel to ground when foot is
                on box
              </li>
              <li>Place entire foot on box, drive through heel</li>
              <li>Fully extend hip at top, pause briefly</li>
              <li>Control the descent, don&apos;t drop down</li>
              <li>Keep torso upright throughout movement</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Front Lunges</h3>
            <ol className="list-decimal ml-6 space-y-1 text-sm">
              <li>Step forward with control, landing heel first</li>
              <li>Lower until both knees at 90 degrees</li>
              <li>Front knee tracks over toes, not caving inward</li>
              <li>Drive through front heel to return to start</li>
              <li>Keep core engaged and chest proud</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Split Jump Squats</h3>
            <ol className="list-decimal ml-6 space-y-1 text-sm">
              <li>Start in lunge position</li>
              <li>Jump explosively, switching legs in air</li>
              <li>Land softly in opposite lunge position</li>
              <li>Immediately jump again</li>
              <li>Focus on height and control, not speed</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Progression Guidelines */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Progression Guidelines
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Weight Progression</h3>
            <ul className="space-y-2 text-sm">
              <li>• Week 1-2: Master form with bodyweight</li>
              <li>• Week 3-4: Add 5-10% body weight</li>
              <li>• Week 5-6: Progress to 10-15% body weight</li>
              <li>• Use dumbbells, weighted vest, or barbell</li>
              <li>• Never sacrifice form for weight</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">When to Progress</h3>
            <ul className="space-y-2 text-sm">
              <li>• Can complete all sets with perfect form</li>
              <li>• No excessive soreness lasting more than 48 hours</li>
              <li>• Feel recovered between sessions</li>
              <li>• Movement feels controlled and stable</li>
              <li>• Ready for increased challenge</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Integration with Running */}
      <div className="section-card mt-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Integration with Running Schedule
        </h2>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <h4 className="font-semibold">Weeks 1-6: Building Phase</h4>
            <p className="text-sm">
              2× per week strength training (Tuesday PM, Thursday PM)
            </p>
            <p className="text-sm">
              Allow 4-6 hours between running and strength sessions
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded">
            <h4 className="font-semibold">Weeks 7-10: Maintenance Phase</h4>
            <p className="text-sm">
              1× per week strength training (Wednesday PM)
            </p>
            <p className="text-sm">Reduce volume but maintain intensity</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded">
            <h4 className="font-semibold">Weeks 11-12: Taper</h4>
            <p className="text-sm">Optional light strength work</p>
            <p className="text-sm">Focus on mobility and activation only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
