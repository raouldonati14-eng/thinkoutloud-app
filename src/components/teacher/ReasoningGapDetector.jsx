import React from "react";

export default function ReasoningGapDetector({ responses = [] }) {

  if (responses.length === 0) {
    return (
      <div style={styles.card}>
        <h3>Reasoning Gaps</h3>
        <div style={styles.empty}>Waiting for responses…</div>
      </div>
    );
  }

  // ✅ Scan transcripts directly — same patterns as DominantReasoningThemes
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
    /however/i, /although/i, /on the other hand/i,
    /even though/i, /despite/i, /while some/i, /others might/i,
    /some people think/i, /counterargument/i
  ];

  const comparisonPatterns = [
    /compared to/i, /similar to/i, /unlike/i, /in contrast/i,
    /whereas/i, /more than/i, /less than/i,
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

  // Gap threshold: less than 20% of students used this reasoning type
  const threshold = Math.max(2, Math.ceil(responses.length * 0.2));

  const gaps = [];
  if (counterargument < threshold) gaps.push("Counterarguments are missing");
  if (comparison < threshold) gaps.push("Few comparisons used");
  if (evidence < threshold) gaps.push("Little evidence cited");
  if (causal < threshold) gaps.push("Few cause-effect explanations");

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Reasoning Gaps</h3>
      {gaps.length === 0 ? (
        <div style={styles.good}>
          ✔ Class is using diverse reasoning patterns
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
