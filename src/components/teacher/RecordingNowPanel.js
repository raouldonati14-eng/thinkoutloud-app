import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function RecordingNowPanel({ classId }) {

  const [recordingStudents, setRecordingStudents] = useState([]);

  const sessionId = "lesson_1"; // temporary session until dynamic sessions added

  useEffect(() => {

    if (!classId) return;

    const responsesRef = collection(
      db,
      "classes",
      classId,
      "sessions",
      sessionId,
      "responses"
    );

    const q = query(
      responsesRef,
      where("status", "==", "recording")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const students = snapshot.docs.map(doc => doc.data().student);

      setRecordingStudents(students);

    });

    return () => unsubscribe();

  }, [classId]);

  return (

    <div style={styles.card}>

      <h3 style={styles.title}>🎤 Students Recording</h3>

      {recordingStudents.length === 0 && (
        <div style={styles.empty}>
          No students currently recording
        </div>
      )}

      {recordingStudents.map((student, index) => (
        <div key={index} style={styles.student}>
          {student}
        </div>
      ))}

    </div>

  );

}

const styles = {

  card: {
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    marginBottom: "20px"
  },

  title: {
    marginBottom: "10px"
  },

  student: {
    padding: "6px 0",
    fontWeight: "bold"
  },

  empty: {
    color: "#888",
    fontStyle: "italic"
  }

};