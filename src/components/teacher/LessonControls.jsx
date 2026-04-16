import React from "react";
import {
  doc,
  updateDoc,
  collection,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../../firebase";

export default function LessonControl({ classId }) {

  const setPhase = async (phase) => {

    console.log("🔥 BUTTON CLICKED:", phase);
    console.log("🧠 TEACHER classId:", classId);

    try {

      const classRef = doc(db, "classes", classId);

      let updateData = {
        classPhase: phase
      };

      // 🔴 RECORDING
      if (phase === "recording") {

        const sessionRef = doc(
          collection(db, "classes", classId, "sessions")
        );

        await setDoc(sessionRef, {
          startedAt: serverTimestamp()
        });

        updateData.activeSessionId = sessionRef.id;

        updateData.recording = {
  startTime: serverTimestamp(),
  clientStartTime: Date.now(),
  durationMs: 60000
};

        updateData.questionOpen = true;
        updateData.category = "math";
        updateData.currentLesson = 1;
        updateData.currentQuestion = 1;
      }

      // ✅ CLEAR RECORDING
      if (phase !== "recording") {
        updateData.recording = null;
      }

      await updateDoc(classRef, {
  ...updateData,
  testUpdate: Date.now()
});

      console.log("✅ Phase updated:", updateData);

    } catch (err) {
      console.error("❌ Error updating phase:", err);
    }
  };

  return (
    <div style={styles.container}>
      <h3>Classroom Controls</h3>

      <div style={styles.buttons}>

        <button style={styles.button} onClick={() => setPhase("instruction")}>
          Instruction
        </button>

        <button style={styles.button} onClick={() => setPhase("recording")}>
          Start Recording
        </button>

        <button style={styles.button} onClick={() => setPhase("discussion")}>
          Discussion
        </button>

        <button style={styles.button} onClick={() => setPhase("reflection")}>
          Reflection
        </button>

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
  buttons: {
    display: "flex",
    gap: 10
  },
  button: {
    padding: "10px 16px",
    borderRadius: 6,
    border: "none",
    background: "#4dabf7",
    color: "white",
    cursor: "pointer"
  }
};
