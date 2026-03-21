import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import { db } from "../../firebase";

export default function AITeacherHelper({ classId }) {

  const [responses, setResponses] = useState([]);

  /* ================= LOAD RESPONSES ================= */

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId)
    );

    const unsubscribe = onSnapshot(q, snap => {

      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setResponses(data);

    });

    return () => unsubscribe();

  }, [classId]);

  /* ================= ANALYSIS ================= */

  const submitted = responses.filter(r => r.status === "submitted");

  const bestResponse = submitted
    .sort((a,b) => (b.score || 0) - (a.score || 0))[0];

  const lowReasoning = submitted.filter(r => (r.score || 0) < 0.4);

  const studentsResponded = submitted.map(r => r.student);

  /* ================= UI ================= */

  return (
    <div style={styles.container}>

      <h3>AI Teaching Insights</h3>

      {/* BEST RESPONSE */}

      <div style={styles.section}>

        <strong>Suggested Response to Spotlight</strong>

        {bestResponse ? (
          <div style={styles.card}>
            <strong>{bestResponse.student}</strong>

            <p style={styles.transcript}>
              {bestResponse.transcript?.slice(0,120)}...
            </p>

            <span style={styles.score}>
              Score: {(bestResponse.score || 0).toFixed(2)}
            </span>
          </div>
        ) : (
          <p style={styles.empty}>No responses yet</p>
        )}

      </div>

      {/* LOW REASONING */}

      <div style={styles.section}>

        <strong>Students Who May Need Support</strong>

        {lowReasoning.length ? (

          lowReasoning.map(r => (
            <div key={r.id} style={styles.row}>
              🔴 {r.student}
            </div>
          ))

        ) : (
          <p style={styles.empty}>No struggling students detected</p>
        )}

      </div>

      {/* PARTICIPATION */}

      <div style={styles.section}>

        <strong>Students Participating</strong>

        {studentsResponded.length ? (
          studentsResponded.map((s,i) => (
            <div key={i} style={styles.row}>
              🟢 {s}
            </div>
          ))
        ) : (
          <p style={styles.empty}>No participation yet</p>
        )}

      </div>

    </div>
  );
}

const styles = {

  container:{
    marginTop:30,
    padding:20,
    background:"#fff",
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  },

  section:{
    marginTop:15
  },

  card:{
    marginTop:10,
    padding:12,
    background:"#f8f9fb",
    borderRadius:8
  },

  transcript:{
    fontSize:13,
    marginTop:5
  },

  score:{
    fontSize:12,
    color:"#666"
  },

  row:{
    marginTop:5
  },

  empty:{
    fontStyle:"italic",
    color:"#777"
  }

};