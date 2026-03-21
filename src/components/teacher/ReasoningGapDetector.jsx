import React from "react";

export default function ReasoningGapDetector({ analytics }) {

  if (!analytics) {
    return (
      <div style={styles.card}>
        <h3>Reasoning Gaps</h3>
        <div style={styles.empty}>Waiting for responses…</div>
      </div>
    );
  }

  const gaps = [];

  if ((analytics.counterargument || 0) < 2) {
    gaps.push("Counterarguments are missing");
  }

  if ((analytics.comparison || 0) < 2) {
    gaps.push("Few comparisons used");
  }

  if ((analytics.evidence || 0) < 2) {
    gaps.push("Little evidence cited");
  }

  if ((analytics.causal || 0) < 2) {
    gaps.push("Few cause-effect explanations");
  }

  return (

    <div style={styles.card}>

      <h3 style={styles.title}>Reasoning Gaps</h3>

      {gaps.length === 0 ? (

        <div style={styles.good}>
          ✓ Class is using diverse reasoning patterns
        </div>

      ) : (

        gaps.map((gap, i) => (
          <div key={i} style={styles.warning}>
            ⚠ {gap}
          </div>
        ))

      )}

    </div>

  );

}

const styles = {

  card: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    marginBottom: 20
  },

  title: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: 600
  },

  warning: {
    color: "#e03131",
    marginBottom: 6,
    fontWeight: 500
  },

  good: {
    color: "#2f9e44",
    fontWeight: 500
  },

  empty: {
    color: "#666",
    fontStyle: "italic"
  }

};