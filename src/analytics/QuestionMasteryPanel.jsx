import React, { useMemo } from "react";

export default function HeatmapPanel({ responses }) {
  /* ------------------ BUILD STUDENT MAP ------------------ */
  const heatmapData = useMemo(() => {
    const map = {};

    responses.forEach((r) => {
      if (!map[r.student]) {
        map[r.student] = {};
      }

      map[r.student][r.questionId] = r.score;
    });

    return map;
  }, [responses]);

  const students = Object.keys(heatmapData).sort();

  const getColor = (score) => {
    if (score === 3) return "#2ecc71";   // green
    if (score === 2) return "#f1c40f";   // yellow
    if (score === 1) return "#e67e22";   // orange
    if (score === 0) return "#e74c3c";   // red
    return "#ecf0f1";                    // empty
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h3>🔥 Student × Question Heatmap</h3>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: 5 }}>Student</th>
              {[...Array(27)].map((_, i) => (
                <th key={i} style={{ padding: 5 }}>
                  Q{i + 1}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student}>
                <td style={{ padding: 5, fontWeight: "bold" }}>
                  {student}
                </td>

                {[...Array(27)].map((_, i) => {
                  const score = heatmapData[student][i + 1];

                  return (
                    <td
                      key={i}
                      style={{
                        width: 30,
                        height: 30,
                        backgroundColor: getColor(score),
                        textAlign: "center",
                        fontSize: 12,
                        border: "1px solid #ddd"
                      }}
                    >
                      {score !== undefined ? score : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 10 }}>
        <strong>Legend:</strong>{" "}
        <span style={{ color: "#2ecc71" }}>■ 3</span>{" "}
        <span style={{ color: "#f1c40f" }}>■ 2</span>{" "}
        <span style={{ color: "#e67e22" }}>■ 1</span>{" "}
        <span style={{ color: "#e74c3c" }}>■ 0</span>
      </div>
    </div>
  );
}
