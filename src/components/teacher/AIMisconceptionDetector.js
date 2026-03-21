import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import { db } from "../../firebase";

export default function AIMisconceptionDetector({ classId }) {

  const [alerts, setAlerts] = useState([]);

  /* ================= LOAD RESPONSES ================= */

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId)
    );

    const unsubscribe = onSnapshot(q, snap => {

      const responses = snap.docs.map(d => d.data());

      detectMisconceptions(responses);

    });

    return () => unsubscribe();

  }, [classId]);

  /* ================= DETECTION LOGIC ================= */

  const detectMisconceptions = (responses) => {

    const transcripts = responses
      .filter(r => r.transcript)
      .map(r => r.transcript.toLowerCase());

    const patterns = [
      {
        label: "Addiction only caused by peer pressure",
        keywords: ["peer pressure", "friends made them"]
      },
      {
        label: "Drugs permanently increase dopamine",
        keywords: ["permanent dopamine", "dopamine always increases"]
      },
      {
        label: "Addiction is purely a choice",
        keywords: ["just a choice", "people choose addiction"]
      }
    ];

    const foundAlerts = [];

    patterns.forEach(pattern => {

      const matches = transcripts.filter(t =>
        pattern.keywords.some(k => t.includes(k))
      );

      if (matches.length >= 2) {

        foundAlerts.push({
          label: pattern.label,
          count: matches.length
        });

      }

    });

    setAlerts(foundAlerts);

  };

  /* ================= UI ================= */

  return (
    <div style={styles.container}>

      <h3>AI Misconception Alerts</h3>

      {!alerts.length && (
        <p style={styles.empty}>
          No misconceptions detected yet.
        </p>
      )}

      {alerts.map((a,i) => (

        <div key={i} style={styles.alert}>

          ⚠ <strong>{a.label}</strong>

          <div style={styles.count}>
            Detected in {a.count} responses
          </div>

        </div>

      ))}

    </div>
  );
}

/* ================= STYLES ================= */

const styles = {

  container:{
    marginTop:30,
    padding:20,
    background:"#fff",
    borderRadius:10,
    boxShadow:"0 6px 18px rgba(0,0,0,0.08)"
  },

  alert:{
    marginTop:10,
    padding:12,
    background:"#fff3cd",
    borderRadius:8
  },

  count:{
    fontSize:12,
    marginTop:4,
    color:"#555"
  },

  empty:{
    fontStyle:"italic",
    color:"#777"
  }

};