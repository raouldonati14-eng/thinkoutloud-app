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

  /* ================= LOAD TRANSCRIPTS ================= */

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId),
      orderBy("timestamp", "desc")
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

  /* ================= UI ================= */

  return (
    <div style={styles.container}>

      <h3>Live Transcript Feed</h3>

      {!responses.length && (
        <p style={styles.empty}>No responses yet.</p>
      )}

      {responses.map((r) => {

        if (!r.transcript) return null;

        return (
          <div key={r.id} style={styles.card}>

            <div style={styles.header}>
              <strong>{r.student}</strong>

              <span style={styles.meta}>
                {r.durationSeconds || 0} sec
              </span>
            </div>

            <div style={styles.transcript}>
              {r.transcript}
            </div>

          </div>
        );

      })}

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

  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    background: "#f8f9fb"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6
  },

  meta: {
    fontSize: 12,
    color: "#777"
  },

  transcript: {
    fontSize: 14,
    lineHeight: 1.5
  },

  empty: {
    fontStyle: "italic",
    color: "#777"
  }

};