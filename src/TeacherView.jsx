import React, { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import TeacherDashboard from "./screens/TeacherDashboard";
import TeacherProgressView from "./TeacherProgressView";
export default function TeacherView() {
  const [locked, setLocked] = useState(null);

  const lessonRef = doc(db, "lessonState", "current");

  /* 🔴 LIVE LISTENER */
  useEffect(() => {
    const unsubscribe = onSnapshot(lessonRef, (snap) => {
      if (snap.exists()) {
        setLocked(snap.data().locked);
      } else {
        setLocked(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleLesson = async () => {
    if (locked === null) return;

    await updateDoc(lessonRef, {
      locked: !locked
    });
  };

  if (locked === null) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div>
      {/* 🔓 LOCK / RELEASE CONTROL */}
      <div
        style={{
          background: "#f8f9fa",
          padding: "15px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <strong>Lesson Status:</strong>{" "}
          {locked ? "🔒 Locked" : "🟢 Released"}
        </div>

        <button
          onClick={toggleLesson}
          style={{
            padding: "8px 14px",
            background: locked ? "#2ecc71" : "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          {locked ? "Release Lesson" : "Lock Lesson"}
        </button>
      </div>

      <>
  <TeacherDashboard />

</>
    </div>
  );
}
