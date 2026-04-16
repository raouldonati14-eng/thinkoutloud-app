import React from "react";

export default function RecordingTickerPanel({ responses = [] }) {
  const recordingStudents = responses
    .filter((response) => response.status === "recording")
    .map((response) => response.studentName || response.studentId)
    .filter(Boolean);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Students Recording Now</div>

      {recordingStudents.length === 0 ? (
        <div style={styles.none}>No students recording yet</div>
      ) : (
        <div style={styles.ticker}>{recordingStudents.join(" • ")}</div>
      )}
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
  title: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    letterSpacing: 1
  },
  ticker: {
    fontSize: 18,
    fontWeight: 500,
    color: "#333"
  },
  none: {
    fontSize: 14,
    color: "#888"
  }
};
