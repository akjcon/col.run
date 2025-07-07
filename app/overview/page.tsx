export default function Overview() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Training Overview</h1>

      {/* Athlete Profile */}
      <div className="section-card mb-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Athlete Profile
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="mb-2">
              <span className="font-semibold">Background:</span> Former D1
              Nordic skier (excellent aerobic base)
            </p>
            <p className="mb-2">
              <span className="font-semibold">Current Volume:</span> 30-50
              miles/week
            </p>
            <p className="mb-2">
              <span className="font-semibold">Longest Run:</span> 50 miles
            </p>
          </div>
          <div>
            <p className="mb-2">
              <span className="font-semibold">Marathon PR:</span> 2:57 (current
              fitness ~3:20)
            </p>
            <p className="mb-2">
              <span className="font-semibold">Easy Z1 Pace:</span> ~9:00/mi at
              137 HR
            </p>
            <p className="mb-2">
              <span className="font-semibold">Category:</span> Strong Category 2
              athlete
            </p>
          </div>
        </div>
      </div>

      {/* Training Zones */}
      <div className="section-card mb-6">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Training Zones
        </h2>
        <div className="overflow-x-auto">
          <table className="training-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Heart Rate</th>
                <th>Pace</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="zone-badge bg-blue-100 text-blue-800">
                    Zone 1
                  </span>
                </td>
                <td>0-138 HR</td>
                <td>~9:00/mi</td>
                <td>Conversational pace</td>
              </tr>
              <tr>
                <td>
                  <span className="zone-badge bg-green-100 text-green-800">
                    Zone 2
                  </span>
                </td>
                <td>138-160 HR</td>
                <td>~8:00-8:30/mi</td>
                <td>Moderate effort</td>
              </tr>
              <tr>
                <td>
                  <span className="zone-badge bg-yellow-100 text-yellow-800">
                    Zone 3
                  </span>
                </td>
                <td>161-180 HR</td>
                <td>~7:00-7:30/mi</td>
                <td>Comfortably hard</td>
              </tr>
              <tr>
                <td>
                  <span className="zone-badge bg-orange-100 text-orange-800">
                    Zone 4
                  </span>
                </td>
                <td>181-190 HR</td>
                <td>~6:30-7:00/mi</td>
                <td>Hard effort</td>
              </tr>
              <tr>
                <td>
                  <span className="zone-badge bg-red-100 text-red-800">
                    Zone 5
                  </span>
                </td>
                <td>&gt;190 HR</td>
                <td>Sprint</td>
                <td>Very hard/sprint</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Training Phase Overview */}
      <div className="section-card">
        <h2 className="text-2xl font-bold mb-4 text-green-700">
          Training Phase Overview
        </h2>
        <div className="overflow-x-auto">
          <table className="training-table">
            <thead>
              <tr>
                <th>Weeks</th>
                <th>Phase</th>
                <th>Weekly Miles</th>
                <th>Vertical</th>
                <th>Focus</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1-4</td>
                <td className="font-semibold">Base + Strength</td>
                <td>45-50</td>
                <td>8,000-10,000 ft</td>
                <td>Aerobic base, strength foundation</td>
              </tr>
              <tr>
                <td>5-8</td>
                <td className="font-semibold">Intensity Introduction</td>
                <td>50-55</td>
                <td>10,000-12,000 ft</td>
                <td>Add Zone 3, muscular endurance</td>
              </tr>
              <tr>
                <td>9-10</td>
                <td className="font-semibold">Race Specificity</td>
                <td>50-55</td>
                <td>12,000+ ft</td>
                <td>Zone 4 intervals, race simulation</td>
              </tr>
              <tr>
                <td>11</td>
                <td className="font-semibold">Taper</td>
                <td>30-35</td>
                <td>7,000 ft</td>
                <td>Reduce volume, maintain sharpness</td>
              </tr>
              <tr>
                <td>12</td>
                <td className="font-semibold">Race Week</td>
                <td>15-20</td>
                <td>2,000-3,000 ft</td>
                <td>Final prep and race</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Back-to-Back Long Runs Explanation */}
      <div className="section-card mt-6">
        <h3 className="text-xl font-bold mb-3 text-green-700">
          Why Back-to-Back Long Runs?
        </h3>
        <blockquote className="border-l-4 border-green-600 pl-4 italic text-gray-700 mb-4">
          &ldquo;This gives you a similar training effect as doing one very long
          day by mimicking some of the demands of your event, but it reduces the
          stress and shortens the recovery time significantly.&rdquo;
          <cite className="block text-sm mt-2 not-italic">
            - Training for the Uphill Athlete
          </cite>
        </blockquote>
        <div className="space-y-2">
          <p>
            • <strong>Reduced injury risk</strong> vs single 20+ mile runs
          </p>
          <p>
            • <strong>Faster recovery</strong> (1-2 days vs 3-4 days)
          </p>
          <p>
            • <strong>Glycogen depletion training</strong> for fat adaptation
          </p>
          <p>
            • <strong>Simulates cumulative fatigue</strong> of ultra racing
          </p>
          <p>
            • <strong>Better time management</strong> vs 4+ hour single runs
          </p>
        </div>
      </div>
    </div>
  );
}
