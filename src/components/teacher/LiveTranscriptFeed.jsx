
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";

import { db } from "../../firebase";

export default function LiveTranscriptFeed({ classId }) {

  const [responses, setResponses] = useState([]);
  const [recordingCount, setRecordingCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classId", "==", classId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setResponses(list);

      const recording = list.filter(r => r.status === "recording").length;
      const submitted = list.filter(r => r.status === "graded").length;

      setRecordingCount(recording);
      setSubmittedCount(submitted);

    });

    return () => unsubscribe();

  }, [classId]);


  const scoreColor = (score) => {

    if (score === 3) return "#2ecc71";
    if (score === 2) return "#f1c40f";
    if (score === 1) return "#e67e22";
    if (score === 0) return "#e74c3c";

    return "#999";

  };


  return (

    <div style={styles.container}>

      {/* PARTICIPATION SUMMARY */}

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


      {/* RESPONSE FEED */}

      {responses.length === 0 && (
        <p style={styles.empty}>No responses yet.</p>
      )}

      {responses.map(r => (

        <div key={r.id} style={styles.card}>

          <div style={styles.header}>

            <div>
              <strong>{r.student}</strong>
            </div>

            {r.score !== undefined && (

              <div
                style={{
                  ...styles.scoreBadge,
                  background: scoreColor(r.score)
                }}
              >
                Score {r.score}
              </div>

            )}

          </div>


          {r.reasoningDetected && (
            <div style={styles.reasoning}>
              Reasoning Detected ✓
            </div>
          )}


          {r.transcript && (
            <div style={styles.transcript}>
              {r.transcript}
            </div>
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
    color: "#2ecc71",
    marginBottom: 6
  },

  transcript: {
    fontSize: 14,
    lineHeight: 1.4,
    color: "#333"
  }

};
