import React from "react";
import { doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function LessonLauncher({ classId, classData, onStartLesson }) {

  // ✅ GUARD (prevents crash)
  if (!classData) {
    return <div style={{ padding: 40 }}>Loading class...</div>;
  }

  const startLesson = async () => {

    const sessionId = "lesson_" + Date.now();

    try {

      const classRef = doc(db, "classes", classId);

      await updateDoc(classRef, {
        activeSessionId: sessionId,
        questionOpen: false,
        spotlightResponseId: null
      });

      const analyticsRef = doc(
        db,
        "classes",
        classId,
        "sessions",
        sessionId,
        "analytics",
        "liveStats"
      );

      await setDoc(analyticsRef, {
        totalResponses: 0,
        reasoningDetected: 0,
        counterarguments: 0,
        avgScore: 0,
        lastUpdated: serverTimestamp()
      });

      if (onStartLesson) onStartLesson();

    } catch (err) {
      console.error("Start lesson error:", err);
    }

  };

  return (

    <div style={styles.page}>

      <div style={styles.card}>

        <h1 style={styles.title}>{classData?.className || "Class"}</h1>

        <div style={styles.joinBlock}>
          <div style={styles.joinLabel}>Join Code</div>
          <div style={styles.joinCode}>
            {classData.joinCode || "---"}
          </div>
        </div>

        <button onClick={startLesson} style={styles.primary}>
          Start Lesson
        </button>

      </div>

    </div>

  );

}

const styles = {

  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f6f9"
  },

  card: {
    background: "white",
    padding: 40,
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    textAlign: "center",
    width: 420
  },

  title: {
    marginBottom: 30
  },

  joinBlock: {
    marginBottom: 30
  },

  joinLabel: {
    fontSize: 14,
    color: "#666"
  },

  joinCode: {
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 4
  },

  primary: {
    padding: "12px 20px",
    backgroundColor: "#4dabf7",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 16
  }

};