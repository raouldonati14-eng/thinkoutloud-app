import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function SuggestedResponsesPanel({ classId, sessionId }) {

  const [topResponses, setTopResponses] = useState([]);

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

      const responses = [];

      snapshot.docs.forEach(doc => {

        const data = doc.data();

        if (!data.transcript) return;

        responses.push({
          id: doc.id,
          ...data
        });

      });

      responses.sort((a, b) => (b.score || 0) - (a.score || 0));

      setTopResponses(responses.slice(0, 3));

    });

    return () => unsubscribe();

  }, [classId, sessionId]);

  return (

    <div style={styles.container}>

      <h3>Suggested Responses to Discuss</h3>

      {topResponses.length === 0 && (
        <div style={styles.none}>
          Waiting for responses...
        </div>
      )}

      {topResponses.map((r, i) => (

        <div key={r.id} style={styles.card}>

          <div style={styles.student}>
            {i + 1}. {r.student} — Score {(r.score || 0).toFixed(2)}
          </div>

          <div style={styles.transcript}>
            "{r.transcript.slice(0, 160)}..."
          </div>

        </div>

      ))}

    </div>

  );

}

const styles = {

  container: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: 20
  },

  card: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    background: "#f8f9fa"
  },

  student: {
    fontWeight: 600,
    marginBottom: 4
  },

  transcript: {
    fontSize: 14,
    color: "#555"
  },

  none: {
    fontSize: 14,
    color: "#777"
  }

};