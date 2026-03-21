import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function StudentParticipationTable({ classId }) {

  const [students, setStudents] = useState([]);

  useEffect(() => {

    if (!classId) return;

    const responsesRef = collection(db, "classes", classId, "responses");

    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {

      const studentMap = {};

      snapshot.docs.forEach(doc => {

        const data = doc.data();
        const student = data.student;

        if (!student) return;

        const existing = studentMap[student];

        if (!existing) {

          studentMap[student] = data;

        } else {

          const newTime = data.timestamp?.seconds || 0;
          const oldTime = existing.timestamp?.seconds || 0;

          if (newTime > oldTime) {
            studentMap[student] = data;
          }

        }

      });

      const list = Object.entries(studentMap).map(([name, data]) => {

        let status = "Not Started";

        if (data.status === "recording") status = "Recording";
        if (data.status === "submitted" || data.status === "graded") status = "Submitted";

        return {
          name,
          status
        };

      });

      setStudents(list);

    });

    return () => unsubscribe();

  }, [classId]);

  return (

    <div style={styles.panel}>

      <h3>Student Participation</h3>

      <table style={styles.table}>

        <thead>

          <tr>
            <th style={styles.header}>Student</th>
            <th style={styles.header}>Status</th>
          </tr>

        </thead>

        <tbody>

          {students.map((s, i) => (

            <tr key={i}>

              <td style={styles.cell}>{s.name}</td>
              <td style={styles.cell}>{s.status}</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}

const styles = {

  panel: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    marginTop: 20
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10
  },

  header: {
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    padding: "6px"
  },

  cell: {
    padding: "6px",
    borderBottom: "1px solid #eee"
  }

};