import React, { useMemo } from "react";

export default function ClassComparisonPanel({ responses }) {
  const classStats = useMemo(() => {
    const map = {};

    responses.forEach((r) => {
      if (!map[r.className]) {
        map[r.className] = { total: 0, mastered: 0 };
      }

      map[r.className].total++;
      if (r.score >= 2) map[r.className].mastered++;
    });

    return Object.entries(map).map(([className, data]) => ({
      className,
      mastery:
        data.total > 0
          ? ((data.mastered / data.total) * 100).toFixed(1)
          : 0,
      total: data.total
    }));
  }, [responses]);

  return (
    <div style={{ marginTop: 40 }}>
      <h3>🏫 Class Mastery Comparison</h3>

      {classStats.map((c) => (
        <div key={c.className} style={{ marginBottom: 8 }}>
          <strong>{c.className}</strong>
          <div
            style={{
              height: 20,
              width: `${c.mastery * 2}px`,
              background: "#4dabf7",
              display: "inline-block",
              marginLeft: 10
            }}
          />
          <span style={{ marginLeft: 10 }}>
            {c.mastery}% ({c.total} responses)
          </span>
        </div>
      ))}
    </div>
  );
}
