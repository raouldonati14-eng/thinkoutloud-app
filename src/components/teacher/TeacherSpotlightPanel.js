import React from "react";

export default function TeacherSpotlightPanel({ responses = [] }) {
  const response =
    [...responses]
      .filter((item) => item.transcript)
      .sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;

  if (!response) {
    return (
      <div style={styles.panel}>
        <h3>Student Spotlight</h3>
        <div style={styles.empty}>Top student thinking will appear here after responses come in.</div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <h3>Student Spotlight</h3>
      <div style={styles.student}>{response.studentName || response.studentId}</div>
      <div style={styles.transcript}>"{response.transcript}"</div>
    </div>
  );
}

const styles = {
  panel: {
    background: "white",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginTop: "20px"
  },
  student: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "10px"
  },
  transcript: {
    fontSize: "20px",
    lineHeight: "1.6",
    fontStyle: "italic",
    color: "#333"
  },
  empty: {
    color: "#777"
  }
};
