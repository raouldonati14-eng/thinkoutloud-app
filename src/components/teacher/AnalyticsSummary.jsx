import React from "react";

function AnalyticsSummary({ analytics }) {

  if (!analytics) {
    return (
      <div style={{ marginBottom: 20 }}>
        No analytics yet.
      </div>
    );
  }

  const total = analytics.totalResponses || 0;

  const avgScore = analytics.avgScore || 0;

  const reasoningPercent = total
    ? Math.round((analytics.reasoningDetected / total) * 100)
    : 0;

  return (

    <div style={styles.card}>

      <strong>Class Analytics</strong>

      <div>Total Responses: {total}</div>

      <div>
        Average Score: {avgScore.toFixed(2)} / 3
      </div>

      <div>
        Reasoning Detected: {reasoningPercent}%
      </div>

    </div>

  );

}

export default React.memo(AnalyticsSummary);

const styles = {
  card: {
    background: "#f1f3f5",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
  }
};