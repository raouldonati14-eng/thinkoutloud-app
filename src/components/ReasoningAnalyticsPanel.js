import React from "react";

export default function ReasoningAnalyticsPanel({ responses = [] }) {
  let strong = 0;
  let partial = 0;
  let support = 0;
  let advanced = 0;
  let proficient = 0;
  let emerging = 0;
  let foundational = 0;
  let total = 0;

  responses.forEach((response) => {
    const score = response.score;
    if (score === undefined || score === null) return;

    total += 1;

    if (score >= 3) {
      strong += 1;
      advanced += 1;
    } else if (score === 2) {
      partial += 1;
      proficient += 1;
    } else if (score === 1) {
      support += 1;
      emerging += 1;
    } else {
      support += 1;
      foundational += 1;
    }
  });

  const performanceBands = {
    advanced: { count: advanced, percent: total === 0 ? 0 : Math.round((advanced / total) * 100) },
    proficient: { count: proficient, percent: total === 0 ? 0 : Math.round((proficient / total) * 100) },
    emerging: { count: emerging, percent: total === 0 ? 0 : Math.round((emerging / total) * 100) },
    foundational: { count: foundational, percent: total === 0 ? 0 : Math.round((foundational / total) * 100) }
  };

  return (
    <div style={styles.panel}>
      <h3>Reasoning Analytics</h3>

      <div style={styles.row}>
        <span>Strong Reasoning</span>
        <strong>{strong}</strong>
      </div>

      <div style={styles.row}>
        <span>Partial Reasoning</span>
        <strong>{partial}</strong>
      </div>

      <div style={styles.row}>
        <span>Needs Support</span>
        <strong>{support}</strong>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4>Performance Bands</h4>

        {[
          { label: "Advanced (Level 3)", key: "advanced", color: "#2ecc71" },
          { label: "Proficient (Level 2)", key: "proficient", color: "#3498db" },
          { label: "Emerging (Level 1)", key: "emerging", color: "#f39c12" },
          { label: "Foundational (Level 0)", key: "foundational", color: "#e74c3c" }
        ].map((band) => {
          const data = performanceBands[band.key];

          return (
            <div key={band.key} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: "600", marginBottom: 4 }}>
                {band.label} - {data.count} students ({data.percent}%)
              </div>

              <div style={styles.barBackground}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${data.percent}%`,
                    backgroundColor: band.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    marginTop: 20
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0"
  },
  barBackground: {
    height: 10,
    background: "#eee",
    borderRadius: 5,
    overflow: "hidden"
  },
  barFill: {
    height: "100%"
  }
};
