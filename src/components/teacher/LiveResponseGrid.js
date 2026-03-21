import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function LiveResponseGrid({ classId, sessionId }) {

  const [students, setStudents] = useState([]);
  const [responses, setResponses] = useState({});

  /* -------- Load Students -------- */

  useEffect(() => {

    if (!classId) return;

    const studentsRef = collection(db, "classes", classId, "students");

    const unsub = onSnapshot(studentsRef, (snapshot) => {

      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setStudents(list);

    });

    return () => unsub();

  }, [classId]);

  /* -------- Load Responses -------- */

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

    const unsub = onSnapshot(responsesRef, (snapshot) => {

      const map = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[data.student] = data.status;
      });

      setResponses(map);

    });

    return () => unsub();

  }, [classId, sessionId]);

  /* -------- Determine Tile Color -------- */

  const getColor = (studentName) => {

    const status = responses[studentName];

    if (!status) return "#f1f3f5";      // not started
    if (status === "recording") return "#fff3bf"; // recording
    if (status === "graded" || status === "submitted") return "#d3f9d8"; // finished

    return "#f1f3f5";

  };

  return (

    <div style={styles.container}>

      <h3>Live Student Status</h3>

      <div style={styles.grid}>

        {students.map(student => (

          <div
            key={student.id}
            style={{
              ...styles.tile,
              background: getColor(student.name)
            }}
          >

            {student.name}

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
    padding: 12,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
    fontWeight: 500
  }

};