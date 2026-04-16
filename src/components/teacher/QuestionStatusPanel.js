import React from "react";

export default function QuestionStatusPanel({ classData, questionText, responses = [] }) {
  const responseCount = responses.length;

  return (
    <div style={styles.panel}>
      <h3>Current Essential Question</h3>

      <div style={styles.question}>
        {questionText || classData?.essentialQuestion || "No question selected yet. Open the library to choose one."}
      </div>

      <div style={styles.metaRow}>
        <span>Phase: {classData?.classPhase || "Not started"}</span>
        <span>Responses: {responseCount}</span>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: 20
  },
  question: {
    fontSize: 18,
    lineHeight: 1.5,
    color: "#222",
    marginBottom: 12
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    color: "#666",
    fontSize: 14
  }
};
