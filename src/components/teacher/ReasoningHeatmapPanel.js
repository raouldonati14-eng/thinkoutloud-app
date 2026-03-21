import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function ReasoningHeatmapPanel({ classId, sessionId }) {

  const [responses, setResponses] = useState([]);

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

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setResponses(list);

    });

    return () => unsubscribe();

  }, [classId, sessionId]);

  const getColor = (score) => {

    if (score >= 0.75) return "#51cf66"; // strong
    if (score >= 0.4) return "#ffd43b";  // developing
    return "#ff6b6b";                    // weak

  };

  return (

    <div style={styles.container}>

      <h3>Reasoning Heatmap</h3>

      <div style={styles.grid}>

        {responses.map(r => (

          <div
            key={r.id}
            style={{
              ...styles.tile,
              background: getColor(r.score || 0)
            }}
          >

            {r.student}

          </div>

        ))}

      </div>

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

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))",
    gap: 10
  },

  tile: {
    padding: 10,
    borderRadius: 6,
    textAlign: "center",
    fontWeight: 500,
    color: "#222"
  }

};