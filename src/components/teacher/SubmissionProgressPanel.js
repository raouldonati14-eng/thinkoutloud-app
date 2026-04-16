import React from "react";

export default function SubmissionProgressPanel({ responses = [] }) {
  const studentSet = new Set();
  let submittedCount = 0;

  responses.forEach((response) => {
    const studentName = response.studentName || response.studentId;

    if (!studentName) return;

    studentSet.add(studentName);

    if (
      response.status === "complete" ||
      response.status === "processing" ||
      response.audioUrl ||
      response.transcript
    ) {
      submittedCount += 1;
    }
  });

  const totalStudents = studentSet.size;
  const percent = totalStudents > 0 ? submittedCount / totalStudents : 0;

  let bg = "#f1f3f5";
  let message = "Waiting for responses";

  if (percent >= 0.8) {
    bg = "#d3f9d8";
    message = "Ready to move on";
  } else if (percent >= 0.5) {
    bg = "#fff3bf";
    message = "Most students responded";
  }

  return (
    <div style={{ ...styles.card, background: bg }}>
      <div style={styles.title}>Student Responses</div>
      <div style={styles.counter}>
        {submittedCount} / {totalStudents}
      </div>
      <div style={styles.label}>{message}</div>
    </div>
  );
}

const styles = {
  card: {
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    textAlign: "center",
    marginBottom: 20
  },
  title: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
    letterSpacing: 1
  },
  counter: {
    fontSize: 42,
    fontWeight: "bold"
  },
  label: {
    fontSize: 14,
    marginTop: 6
  }
};
