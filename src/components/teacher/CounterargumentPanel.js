import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function CounterargumentPanel({ classId, sessionId }) {

  const [conflicts, setConflicts] = useState([]);

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

      const increaseGroup = [];
      const reduceGroup = [];

      snapshot.docs.forEach(doc => {

        const data = doc.data();
        const text = (data.transcript || "").toLowerCase();

        if (text.includes("increase") || text.includes("more")) {
          increaseGroup.push(data.student);
        }

        if (text.includes("reduce") || text.includes("less")) {
          reduceGroup.push(data.student);
        }

      });

      const detected = [];

      if (increaseGroup.length && reduceGroup.length) {

        detected.push({
          topic: "Policy Impact",
          groupA: increaseGroup,
          groupB: reduceGroup
        });

      }

      setConflicts(detected);

    });

    return () => unsubscribe();

  }, [classId, sessionId]);

  return (

    <div style={styles.container}>

      <h3>Counterarguments Detected</h3>

      {conflicts.length === 0 && (
        <div style={styles.none}>
          No counterarguments detected yet.
        </div>
      )}

      {conflicts.map((c, i) => (

        <div key={i} style={styles.card}>

          <div style={styles.topic}>
            {c.topic}
          </div>

          <div style={styles.group}>
            Group A: {c.groupA.join(", ")}
          </div>

          <div style={styles.group}>
            Group B: {c.groupB.join(", ")}
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
    background: "#f8f9fa",
    borderRadius: 6
  },

  topic: {
    fontWeight: 600,
    marginBottom: 6
  },

  group: {
    fontSize: 14,
    color: "#555"
  },

  none: {
    fontSize: 14,
    color: "#777"
  }

};