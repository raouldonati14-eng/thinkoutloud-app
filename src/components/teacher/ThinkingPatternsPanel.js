import React from "react";

export default function ThinkingPatternsPanel({ responses = [] }) {
  const clusters = {};

  responses.forEach((response) => {
    if (!response.transcript) return;

    const text = response.transcript.toLowerCase();
    const studentName = response.studentName || response.studentId;
    let theme = "Other";

    if (text.includes("peer")) theme = "Peer Pressure";
    else if (text.includes("mental")) theme = "Mental Health";
    else if (text.includes("legal")) theme = "Rules or Laws";
    else if (text.includes("brain") || text.includes("dopamine")) theme = "Brain Science";

    if (!clusters[theme]) clusters[theme] = [];
    clusters[theme].push(studentName);
  });

  return (
    <div style={styles.container}>
      <h3>Class Thinking Patterns</h3>

      {Object.keys(clusters).length === 0 && (
        <div style={styles.none}>Waiting for responses...</div>
      )}

      {Object.entries(clusters).map(([theme, students]) => (
        <div key={theme} style={styles.cluster}>
          <div style={styles.theme}>
            {theme} ({students.length})
          </div>
          <div style={styles.students}>{students.join(", ")}</div>
        </div>
      ))}
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
  cluster: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    background: "#f8f9fa"
  },
  theme: {
    fontWeight: 600
  },
  students: {
    fontSize: 14,
    color: "#555"
  },
  none: {
    fontSize: 14,
    color: "#777"
  }
};
