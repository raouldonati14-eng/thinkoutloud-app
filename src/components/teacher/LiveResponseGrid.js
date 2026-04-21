import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function LiveResponseGrid({ classId, responses = [] }) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!classId) return;

    const studentsRef = collection(db, "classes", classId, "roster");

    const unsub = onSnapshot(studentsRef, (snapshot) => {
      const list = snapshot.docs.map((studentDoc) => ({
        id: studentDoc.id,
        ...studentDoc.data()
      }));

      setStudents(list);
    });

    return () => unsub();
  }, [classId]);

  const responseMap = useMemo(() => {
    return responses.reduce((map, response) => {
      const key = response.studentName || response.studentId;
      if (key) {
        map[key] = response.status || "submitted";
      }
      return map;
    }, {});
  }, [responses]);

  const getColor = (studentName) => {
    const status = responseMap[studentName];

    if (!status) return "#f1f3f5";
    if (status === "recording" || status === "processing") return "#fff3bf";
    if (status === "complete" || status === "submitted") return "#d3f9d8";
    return "#f1f3f5";
  };

  return (
    <div style={styles.container}>
      <h3>Live Student Status</h3>
      <div style={styles.grid}>
        {students.map((student) => (
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
