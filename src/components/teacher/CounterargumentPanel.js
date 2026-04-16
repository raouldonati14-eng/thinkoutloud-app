import React from "react";

export default function CounterargumentPanel({ responses = [] }) {
  const increaseGroup = [];
  const reduceGroup = [];

  responses.forEach((response) => {
    const text = (response.transcript || "").toLowerCase();
    const studentName = response.studentName || response.studentId;

    if (text.includes("increase") || text.includes("more")) {
      increaseGroup.push(studentName);
    }

    if (text.includes("reduce") || text.includes("less")) {
      reduceGroup.push(studentName);
    }
  });

  const conflicts =
    increaseGroup.length && reduceGroup.length
      ? [{ topic: "Different Claims", groupA: increaseGroup, groupB: reduceGroup }]
      : [];

  return (
    <div style={styles.container}>
      <h3>Counterarguments Detected</h3>

      {conflicts.length === 0 && (
        <div style={styles.none}>No counterarguments detected yet.</div>
      )}

      {conflicts.map((conflict, index) => (
        <div key={index} style={styles.card}>
          <div style={styles.topic}>{conflict.topic}</div>
          <div style={styles.group}>Group A: {conflict.groupA.join(", ")}</div>
          <div style={styles.group}>Group B: {conflict.groupB.join(", ")}</div>
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
    background: "#f8f9fa",
    borderRadius: 6
  },
  topic: {
    fontWeight: 600,
    marginBottom: 6
  },
  group: {
    fontSize: 14,
    color: "#555"
  },
  none: {
    fontSize: 14,
    color: "#777"
  }
};
