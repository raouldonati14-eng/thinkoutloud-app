import React from "react";

export default function DominantReasoningThemes({ analytics }) {

  if (!analytics) {
    return (
      <div style={styles.card}>
        <h3>Dominant Reasoning Themes</h3>
        <div style={styles.empty}>Waiting for responses…</div>
      </div>
    );
  }

  const themes = [
    { label: "Evidence-based reasoning", value: analytics.evidence || 0 },
    { label: "Cause-effect reasoning", value: analytics.causal || 0 },
    { label: "Counterarguments", value: analytics.counterargument || 0 },
    { label: "Comparisons", value: analytics.comparison || 0 }
  ];

  const maxValue = Math.max(...themes.map(t => t.value), 1);

  return (

    <div style={styles.card}>

      <h3 style={styles.title}>Dominant Reasoning Themes</h3>

      {themes.map((t) => (

        <div key={t.label} style={styles.row}>

          <div style={styles.label}>{t.label}</div>

          <div style={styles.barContainer}>

            <div
              style={{
                ...styles.bar,
                width: `${(t.value / maxValue) * 100}%`
              }}
            />

          </div>

          <div style={styles.value}>{t.value}</div>

        </div>

      ))}

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
    marginBottom: 15,
    fontSize: 18,
    fontWeight: 600
  },

  row: {
    display: "flex",
    alignItems: "center",
    marginBottom: 10,
    gap: 10
  },

  label: {
    width: 180,
    fontSize: 14
  },

  barContainer: {
    flex: 1,
    background: "#f1f3f5",
    borderRadius: 4,
    height: 10
  },

  bar: {
    background: "#4dabf7",
    height: 10,
    borderRadius: 4
  },

  value: {
    width: 30,
    textAlign: "right",
    fontWeight: "bold"
  },

  empty: {
    color: "#666",
    fontStyle: "italic"
  }

};