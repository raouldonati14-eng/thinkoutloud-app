import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function LiveClassroomGrid({ classId }) {

  const [responses, setResponses] = useState([]);

  useEffect(() => {

    if (!classId) return;

    const q = query(
      collection(db, "responses"),
      where("classCode", "==", classId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setResponses(list);

    });

    return () => unsubscribe();

  }, [classId]);

  const submitted = responses.filter(r => r.status === "submitted");
  const recording = responses.filter(r => r.status === "recording");
  const notStarted = responses.filter(r => r.status === "not_started");

  return (

    <div style={styles.container}>

      <h2>Live Classroom Status</h2>

      <div style={styles.grid}>

        <div style={styles.column}>
          <h3>🟢 Submitted ({submitted.length})</h3>

          {submitted.map(r => (
            <div key={r.id} style={styles.student}>
              {r.studentName}
            </div>
          ))}

        </div>

        <div style={styles.column}>
          <h3>🟡 Recording ({recording.length})</h3>

          {recording.map(r => (
            <div key={r.id} style={styles.student}>
              {r.studentName}
            </div>
          ))}

        </div>

        <div style={styles.column}>
          <h3>⚪ Not Started ({notStarted.length})</h3>

          {notStarted.map(r => (
            <div key={r.id} style={styles.student}>
              {r.studentName}
            </div>
          ))}

        </div>

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
    marginTop: 20
  },

  grid: {
    display: "flex",
    gap: 20
  },

  column: {
    flex: 1
  },

  student: {
    padding: "6px 8px",
    borderBottom: "1px solid #eee",
    fontSize: 14
  }

};