import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function GrowthChartPanel({ responses }) {
  const growthData = useMemo(() => {
    if (!responses || responses.length === 0) return [];

    // Sort by timestamp ascending
    const sorted = [...responses].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    let cumulativeScore = 0;

    return sorted.map((r, index) => {
      cumulativeScore += r.score;

      return {
        attempt: index + 1,
        average: Number((cumulativeScore / (index + 1)).toFixed(2))
      };
    });
  }, [responses]);

  if (growthData.length === 0) {
    return (
      <div style={{ marginTop: 40 }}>
        <h3>📈 Class Growth Trend</h3>
        <p>No data available.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h3>📈 Class Growth Trend</h3>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="attempt" />
            <YAxis domain={[0, 3]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#4dabf7"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
