import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function ClassProgressPanel({ classId }) {

  const [recording, setRecording] = useState(0);
  const [submitted, setSubmitted] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {

    if (!classId) return;

    const responsesRef = collection(db, "classes", classId, "responses");

    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {

      const studentSet = new Set();
      let rec = 0;
      let sub = 0;

      snapshot.docs.forEach(doc => {

        const data = doc.data();
        const student = data.student;

        if (!student) return;

        studentSet.add(student);

        if (data.status === "recording") rec++;
        if (data.status === "submitted" || data.status === "graded") sub++;

      });

      setRecording(rec);
      setSubmitted(sub);
      setTotalStudents(studentSet.size);

    });

    return () => unsubscribe();

  }, [classId]);

  const notStarted = totalStudents - recording - submitted;

  return (

    <div style={styles.panel}>

      <h3>Class Progress</h3>

      <div>Students Joined: {totalStudents}</div>
      <div>Recording: {recording}</div>
      <div>Submitted: {submitted}</div>
      <div>Not Started: {notStarted > 0 ? notStarted : 0}</div>

    </div>

  );

}

const styles = {

  panel: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    marginTop: 20
  }

};