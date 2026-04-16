import React from "react";

export default function SuggestedResponsesPanel({ responses = [] }) {
  const topResponses = [...responses]
    .filter((response) => response.transcript)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3);

  return (
    <div style={styles.container}>
      <h3>Suggested Responses to Discuss</h3>

      {topResponses.length === 0 && (
        <div style={styles.none}>Waiting for responses...</div>
      )}

      {topResponses.map((response, index) => (
        <div key={response.id} style={styles.card}>
          <div style={styles.student}>
            {index + 1}. {response.studentName || response.studentId} - Score {response.score ?? 0}
          </div>

          <div style={styles.transcript}>
            "{(response.transcript || "").slice(0, 160)}..."
          </div>
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
  card: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    background: "#f8f9fa"
  },
  student: {
    fontWeight: 600,
    marginBottom: 4
  },
  transcript: {
    fontSize: 14,
    color: "#555"
  },
  none: {
    fontSize: 14,
    color: "#777"
  }
};
