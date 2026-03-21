import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function LiveResponseMap({ classId }) {

  const [responses, setResponses] = useState([]);

  /* ================= LOAD RESPONSES ================= */

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId)
    );

    const unsubscribe = onSnapshot(q, snapshot => {

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setResponses(data);

    });

    return () => unsubscribe();

  }, [classId]);

  /* ================= GROUP RESPONSES ================= */

  const recording = responses.filter(r => r.status === "recording");
  const submitted = responses.filter(r => r.status === "submitted");

  /* ================= REASONING COLOR ================= */

  const getReasoningIcon = (score) => {

    if (score === undefined || score === null) return "⚪";

    if (score >= 0.75) return "🟢";   // high reasoning
    if (score >= 0.4) return "🟡";    // medium reasoning

    return "🔴";                      // low reasoning
  };

  const getReasoningLabel = (score) => {

    if (score === undefined || score === null) return "";

    if (score >= 0.75) return "High reasoning";
    if (score >= 0.4) return "Medium reasoning";

    return "Low reasoning";
  };

  /* ================= UI ================= */

  return (
    <div style={styles.container}>

      <h3>Live Student Responses</h3>

      {/* RECORDING */}

      <div style={styles.section}>
        <strong>Recording ({recording.length})</strong>

        {recording.map((r) => (
          <div key={r.id} style={styles.row}>
            🟡 {r.student} — recording...
          </div>
        ))}

        {!recording.length && (
          <div style={styles.empty}>No students recording</div>
        )}
      </div>

      {/* SUBMITTED */}

      <div style={styles.section}>
        <strong>Submitted ({submitted.length})</strong>

        {submitted.map((r) => {

          const icon = getReasoningIcon(r.score);
          const label = getReasoningLabel(r.score);

          return (
            <div key={r.id} style={styles.row}>
              {icon} {r.student} — {r.durationSeconds || 0} sec
              {label && (
                <span style={styles.reasoning}>
                  {" "}({label})
                </span>
              )}
            </div>
          );

        })}

        {!submitted.length && (
          <div style={styles.empty}>No submissions yet</div>
        )}
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {

  container: {
    marginTop: 30,
    padding: 20,
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
  },

  section: {
    marginTop: 15
  },

  row: {
    padding: "6px 0",
    fontSize: 14
  },

  reasoning: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6
  },

  empty: {
    fontStyle: "italic",
    color: "#777"
  }

};