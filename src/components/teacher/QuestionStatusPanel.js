import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function QuestionStatusPanel({ classId }) {

  const [recordingCount, setRecordingCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [notStartedCount, setNotStartedCount] = useState(0);

  const sessionId = "lesson_1"; // temporary session id

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

    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {

      const responses = snapshot.docs.map(doc => doc.data());

      const recording = responses.filter(r => r.status === "recording").length;

      const submitted = responses.filter(
        r => r.status === "graded" || r.status === "submitted"
      ).length;

      const startedStudents = new Set(
        responses.map(r => r.student)
      );

      const totalStudentsEstimate = 30; // placeholder until roster integration

      const notStarted = Math.max(
        totalStudentsEstimate - startedStudents.size,
        0
      );

      setRecordingCount(recording);
      setSubmittedCount(submitted);
      setNotStartedCount(notStarted);

    });

    return () => unsubscribe();

  }, [classId]);

  return (

    <div style={styles.card}>

      <h3 style={styles.title}>Question Status</h3>

      <div style={styles.row}>
        <span>🟡 Recording</span>
        <strong>{recordingCount}</strong>
      </div>

      <div style={styles.row}>
        <span>🟢 Submitted</span>
        <strong>{submittedCount}</strong>
      </div>

      <div style={styles.row}>
        <span>⚪ Not Started</span>
        <strong>{notStartedCount}</strong>
      </div>

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
    marginBottom: "15px"
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: "16px"
  }

};