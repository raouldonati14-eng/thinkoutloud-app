import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function ReasoningAnalyticsPanel({ classId, sessionId }) {

  const [strong, setStrong] = useState(0);
  const [partial, setPartial] = useState(0);
  const [support, setSupport] = useState(0);

  // ✅ ALWAYS initialized (so UI always shows)
  const [performanceBands, setPerformanceBands] = useState({
    advanced: { count: 0, percent: 0 },
    proficient: { count: 0, percent: 0 },
    emerging: { count: 0, percent: 0 },
    foundational: { count: 0, percent: 0 }
  });

  useEffect(() => {

    if (!classId || !sessionId) return;

    const responsesRef = collection(
      db,
      "classes",
      classId,
      "sessions",
      sessionId,
      "responses"
    );

    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {

      let strongCount = 0;
      let partialCount = 0;
      let supportCount = 0;

      let advanced = 0;
      let proficient = 0;
      let emerging = 0;
      let foundational = 0;

      let total = 0;

      snapshot.docs.forEach(doc => {

        const data = doc.data();

        // ✅ allow ANY response with a score
        const score = data.score;

        if (score === undefined || score === null) return;

        total++;

        if (score >= 3) {
          strongCount++;
          advanced++;
        } else if (score === 2) {
          partialCount++;
          proficient++;
        } else if (score === 1) {
          emerging++;
          supportCount++;
        } else {
          foundational++;
          supportCount++;
        }

      });

      setStrong(strongCount);
      setPartial(partialCount);
      setSupport(supportCount);

      const percent = (count) =>
        total === 0 ? 0 : Math.round((count / total) * 100);

      setPerformanceBands({
        advanced: { count: advanced, percent: percent(advanced) },
        proficient: { count: proficient, percent: percent(proficient) },
        emerging: { count: emerging, percent: percent(emerging) },
        foundational: { count: foundational, percent: percent(foundational) }
      });

    });

    return () => unsubscribe();

  }, [classId, sessionId]);

  return (

    <div style={styles.panel}>

      <h3>Reasoning Analytics</h3>

      {/* -------- COUNTS -------- */}

      <div style={styles.row}>
        <span>🟢 Strong Reasoning</span>
        <strong>{strong}</strong>
      </div>

      <div style={styles.row}>
        <span>🟡 Partial Reasoning</span>
        <strong>{partial}</strong>
      </div>

      <div style={styles.row}>
        <span>🔴 Needs Support</span>
        <strong>{support}</strong>
      </div>

      {/* -------- PERFORMANCE BANDS (ALWAYS VISIBLE) -------- */}

      <div style={{ marginTop: 20 }}>

        <h4>📊 Performance Bands</h4>

        {[
          { label: "Advanced (Level 3)", key: "advanced", color: "#2ecc71" },
          { label: "Proficient (Level 2)", key: "proficient", color: "#3498db" },
          { label: "Emerging (Level 1)", key: "emerging", color: "#f39c12" },
          { label: "Foundational (Level 0)", key: "foundational", color: "#e74c3c" }
        ].map((band, i) => {

          const data = performanceBands[band.key];

          return (
            <div key={i} style={{ marginBottom: 10 }}>

              <div style={{ fontWeight: "600", marginBottom: 4 }}>
                {band.label} — {data.count} students ({data.percent}%)
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