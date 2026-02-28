import React from "react";

export default function FeedbackScreen({ question, feedback }) {

  const getScoreColor = (score) => {
    if (score === 3) return "#2f9e44";
    if (score === 2) return "#f08c00";
    if (score === 1) return "#d9480f";
    return "#e03131";
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={{ marginBottom: "10px" }}>
          🧠 Reflection Submitted
        </h3>

        <p>
          <strong>Question:</strong>{" "}
          {question?.prompt || question?.text}
        </p>

        {/* ---------------- SCORE ---------------- */}
        {typeof feedback?.score === "number" && (
          <div style={styles.scoreBox}>
            <strong>Score:</strong>{" "}
            <span
              style={{
                color: getScoreColor(feedback.score),
                fontSize: "20px",
                fontWeight: "bold"
              }}
            >
              {feedback.score} / 3
            </span>
          </div>
        )}

        {/* ---------------- REASONING ---------------- */}
        {typeof feedback?.reasoningDetected === "boolean" && (
          <div style={styles.reasoningBox}>
            <strong>Reasoning Detected:</strong>{" "}
            {feedback.reasoningDetected
              ? "✅ Strong reasoning language detected"
              : "⚠ Try using clearer reasoning words like 'because' or 'therefore'"}
          </div>
        )}

        {/* ---------------- TRANSCRIPT ---------------- */}
        {feedback?.transcript && (
          <div style={styles.transcriptBox}>
            <strong>Your Transcript:</strong>
            <p style={{ marginTop: "8px" }}>
              {feedback.transcript}
            </p>
          </div>
        )}

        {/* ---------------- NEXT STEPS ---------------- */}
        <div style={styles.nextSteps}>
          <strong>Next Steps</strong>
          <p>
            Reflect on your explanation.
            <br />
            Strengthen clarity and reasoning if needed.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "30px"
  },
  card: {
    maxWidth: "800px",
    width: "100%",
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
  },
  scoreBox: {
    marginTop: "15px",
    padding: "12px",
    background: "#edf2ff",
    borderRadius: "6px"
  },
  reasoningBox: {
    marginTop: "10px",
    padding: "10px",
    background: "#f1f3f5",
    borderRadius: "6px"
  },
  transcriptBox: {
    marginTop: "15px",
    padding: "12px",
    background: "#f8f9fa",
    borderRadius: "6px",
    maxHeight: "200px",
    overflowY: "auto"
  },
  nextSteps: {
    marginTop: "20px",
    padding: "15px",
    background: "#fff3cd",
    borderRadius: "6px"
  }
};