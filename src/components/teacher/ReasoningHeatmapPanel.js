import React from "react";

export default function ReasoningHeatmapPanel({ responses = [] }) {
  const getColor = (score) => {
    if (score >= 3) return "#51cf66";
    if (score >= 2) return "#ffd43b";
    return "#ff6b6b";
  };

  return (
    <div style={styles.container}>
      <h3>Reasoning Heatmap</h3>

      <div style={styles.grid}>
        {responses.map((response) => (
          <div
            key={response.id}
            style={{
              ...styles.tile,
              background: getColor(response.score || 0)
            }}
          >
            {response.studentName || response.studentId}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: 20
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))",
    gap: 10
  },
  tile: {
    padding: 10,
    borderRadius: 6,
    textAlign: "center",
    fontWeight: 500,
    color: "#222"
  }
};
