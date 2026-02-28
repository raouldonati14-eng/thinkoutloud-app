import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, onSnapshot as docSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export default function TeacherProgressView() {
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState("All");
  const [currentQuestion, setCurrentQuestion] = useState(1);

  /* ---------------- LISTEN FOR STUDENT PROGRESS ---------------- */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "studentProgress"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          name: doc.id,
          ...doc.data()
        }));
        setStudents(data);
      }
    );

    return () => unsubscribe();
  }, []);

  /* ---------------- LISTEN FOR CURRENT RELEASED QUESTION ---------------- */
  useEffect(() => {
    const lessonRef = doc(db, "lessonState", "current");

    const unsubscribe = docSnapshot(lessonRef, (snap) => {
      if (snap.exists()) {
        setCurrentQuestion(snap.data().activeQuestionId || 1);
      }
    });

    return () => unsubscribe();
  }, []);

  /* ---------------- FILTER ---------------- */
  const filteredStudents =
    selectedClass === "All"
      ? students
      : students.filter((s) => s.className === selectedClass);

  /* ---------------- COLOR LOGIC ---------------- */
  const getStatusColor = (student) => {
    if (!student.lastCompleted || student.lastCompleted === 0) {
      return "#e03131"; // 🔴 Not started
    }

    if (student.lastCompleted < currentQuestion) {
      return "#f08c00"; // 🟡 Behind
    }

    if (student.lastCompleted >= currentQuestion) {
      return "#2f9e44"; // 🟢 On track
    }

    return "#ccc";
  };

  return (
    <div style={styles.container}>
      <h2>📊 Student Progress</h2>

      {/* 🔽 CLASS FILTER */}
      <select
        value={selectedClass}
        onChange={(e) => setSelectedClass(e.target.value)}
        style={styles.dropdown}
      >
        <option value="All">All Classes</option>

        <option value="Gold 1">Gold 1</option>
        <option value="Gold 2">Gold 2</option>
        <option value="Gold 3">Gold 3</option>
        <option value="Gold 4">Gold 4</option>

        <option value="Black 1">Black 1</option>
        <option value="Black 2">Black 2</option>
        <option value="Black 3">Black 3</option>
        <option value="Black 4">Black 4</option>
      </select>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Student</th>
            <th style={styles.th}>Class</th>
            <th style={styles.th}>Progress</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((s, index) => (
            <tr key={index}>
              <td style={styles.td}>{s.name}</td>
              <td style={styles.td}>{s.className}</td>
              <td
                style={{
                  ...styles.td,
                  color: getStatusColor(s),
                  fontWeight: "bold"
                }}
              >
                {s.lastCompleted || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px"
  },
  dropdown: {
    padding: "8px",
    marginBottom: "20px",
    borderRadius: "6px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    borderBottom: "2px solid #ccc",
    textAlign: "left",
    padding: "10px"
  },
  td: {
    borderBottom: "1px solid #eee",
    padding: "10px"
  }
};