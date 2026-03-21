import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function SubmissionProgressPanel({ classId, sessionId }) {

  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {

    if (!classId || !sessionId) {
      setSubmittedCount(0);
      setTotalStudents(0);
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

      const studentSet = new Set();
      let submitted = 0;

      snapshot.docs.forEach(doc => {

        const data = doc.data();

        if (!data.student) return;

        studentSet.add(data.student);

        if (data.status === "graded" || data.status === "submitted") {
          submitted += 1;
        }

      });

      setTotalStudents(studentSet.size);
      setSubmittedCount(submitted);

    });

    return () => unsubscribe();

  }, [classId, sessionId]);

  const percent = totalStudents > 0
    ? submittedCount / totalStudents
    : 0;

  let bg = "#f1f3f5";
  let message = "Waiting for responses";

  if (percent >= 0.8) {
    bg = "#d3f9d8";
    message = "Ready to move on";
  } else if (percent >= 0.5) {
    bg = "#fff3bf";
    message = "Most students responding";
  }

  return (

    <div style={{ ...styles.card, background: bg }}>

      <div style={styles.title}>
        Student Responses
      </div>

      <div style={styles.counter}>
        {submittedCount} / {totalStudents}
      </div>

      <div style={styles.label}>
        {message}
      </div>

    </div>

  );

}

const styles = {

  card: {
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    textAlign: "center",
    marginBottom: 20
  },

  title: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
    letterSpacing: 1
  },

  counter: {
    fontSize: 42,
    fontWeight: "bold"
  },

  label: {
    fontSize: 14,
    marginTop: 6
  }

};