import React from "react";

export default function DominantReasoningThemes({ responses = [] }) {
  // ✅ Scan transcripts directly for reasoning patterns
  let evidence = 0;
  let causal = 0;
  let counterargument = 0;
  let comparison = 0;

  const evidencePatterns = [
    /for example/i, /for instance/i, /such as/i, /according to/i,
    /research shows/i, /studies show/i, /this shows/i, /evidence/i,
    /proven/i, /data shows/i
  ];

  const causalPatterns = [
    /because/i, /therefore/i, /as a result/i, /this leads to/i,
    /which causes/i, /due to/i, /since/i, /this means/i,
    /which means/i, /results in/i, /leads to/i, /causes/i
  ];

  const counterargumentPatterns = [
    /however/i, /although/i, /on the other hand/i, /but/i,
    /even though/i, /despite/i, /while some/i, /others might/i,
    /some people think/i, /counterargument/i
  ];

  const comparisonPatterns = [
    /compared to/i, /similar to/i, /unlike/i, /in contrast/i,
    /whereas/i, /both/i, /more than/i, /less than/i,
    /difference between/i, /just like/i
  ];

  responses.forEach((response) => {
    const text = response.transcript || response.writtenResponse || "";
    if (!text) return;

    if (evidencePatterns.some(p => p.test(text))) evidence++;
    if (causalPatterns.some(p => p.test(text))) causal++;
    if (counterargumentPatterns.some(p => p.test(text))) counterargument++;
    if (comparisonPatterns.some(p => p.test(text))) comparison++;
  });

  const themes = [
    { label: "Evidence-based reasoning", value: evidence },
    { label: "Cause-effect reasoning", value: causal },
    { label: "Counterarguments", value: counterargument },
    { label: "Comparisons", value: comparison }
  ];

  const maxValue = Math.max(...themes.map(t => t.value), 1);

  if (responses.length === 0) {
    return (
      <div style={styles.card}>
        <h3>Dominant Reasoning Themes</h3>
        <div style={styles.empty}>Waiting for responses…</div>
      </div>
    );
  }

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
