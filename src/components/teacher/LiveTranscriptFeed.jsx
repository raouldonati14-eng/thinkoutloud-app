import React, { useEffect, useState } from "react";

export default function LiveTranscriptFeed({ responses = [] }) {
  const [recordingCount, setRecordingCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);

  useEffect(() => {
    setRecordingCount(
      responses.filter((response) => response.status === "recording").length
    );
    setSubmittedCount(
      responses.filter((response) => response.status === "complete").length
    );
  }, [responses]);

  const scoreColor = (score) => {
    if (score === 3) return "#2ecc71";
    if (score === 2) return "#f1c40f";
    if (score === 1) return "#e67e22";
    if (score === 0) return "#e74c3c";
    return "#999";
  };

  return (
    <div style={styles.container}>
      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <strong>Recording</strong>
          <span>{recordingCount}</span>
        </div>

        <div style={styles.summaryItem}>
          <strong>Submitted</strong>
          <span>{submittedCount}</span>
        </div>
      </div>

      {responses.length === 0 && <p style={styles.empty}>No responses yet.</p>}

      {responses.map((response) => (
        <div key={response.id} style={styles.card}>
          <div style={styles.header}>
            <div>
              <strong>{response.studentName || response.studentId}</strong>
            </div>

            {response.score !== undefined && (
              <div
                style={{
                  ...styles.scoreBadge,
                  background: scoreColor(response.score)
                }}
              >
                Score {response.score}
              </div>
            )}
          </div>

          {response.vocabularyUsed?.length > 0 && (
            <div style={styles.reasoning}>
              Vocabulary: {response.vocabularyUsed.join(", ")}
            </div>
          )}

          {response.transcript && (
            <div style={styles.transcript}>{response.transcript}</div>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  summaryBar: {
    display: "flex",
    justifyContent: "space-between",
    background: "#f4f6f9",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 10
  },
  summaryItem: {
    display: "flex",
    gap: 8,
    alignItems: "center"
  },
  empty: {
    color: "#999",
    fontStyle: "italic"
  },
  card: {
    background: "#ffffff",
    padding: 14,
    borderRadius: 8,
    boxShadow: "0 4px 10px rgba(0,0,0,0.06)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  scoreBadge: {
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600
  },
  reasoning: {
    fontSize: 12,
    color: "#1864ab",
    marginBottom: 6
  },
  transcript: {
    fontSize: 14,
    lineHeight: 1.4,
    color: "#333"
  }
};
