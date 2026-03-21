import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function RecordingTickerPanel({ classId, sessionId }) {

  const [recordingStudents, setRecordingStudents] = useState([]);

  useEffect(() => {

    if (!classId || !sessionId) {
      setRecordingStudents([]);
      return;
    }

    const responsesRef = collection(
      db,
      "classes",
      classId,
      "sessions",
      sessionId,
      "responses"
    );

    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {

      const recording = [];

      snapshot.docs.forEach(doc => {

        const data = doc.data();

        if (data.status === "recording" && data.student) {
          recording.push(data.student);
        }

      });

      setRecordingStudents(recording);

    });

    return () => unsubscribe();

  }, [classId, sessionId]);

  return (

    <div style={styles.container}>

      <div style={styles.title}>
        Students Recording Now
      </div>

      {recordingStudents.length === 0 ? (

        <div style={styles.none}>
          No students recording yet
        </div>

      ) : (

        <div style={styles.ticker}>
          {recordingStudents.join(" • ")}
        </div>

      )}

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

  title: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    letterSpacing: 1
  },

  ticker: {
    fontSize: 18,
    fontWeight: 500,
    color: "#333"
  },

  none: {
    fontSize: 14,
    color: "#888"
  }

};