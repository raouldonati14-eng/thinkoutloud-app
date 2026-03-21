// ✅ StudentView.jsx (FINAL FIXED)

import React, { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import EssentialQuestionScreen from "./screens/EssentialQuestionScreen";

export default function StudentView() {

  const [locked, setLocked] = useState(false);
  const [classLoaded, setClassLoaded] = useState(false);

  const [classData, setClassData] = useState(null);

  const [classPhase, setClassPhase] = useState("instruction");
  const [questionOpen, setQuestionOpen] = useState(false);

  const [recordingEndsAt, setRecordingEndsAt] = useState(null);

  const [joinCode, setJoinCode] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");

  const [student, setStudent] = useState(null);

  /* ---------------- LISTEN FOR CLASS ---------------- */

  useEffect(() => {
    if (!selectedClassId) return;

    const classRef = doc(db, "classes", selectedClassId);

    const unsubscribe = onSnapshot(classRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        console.log("CLASS DATA:", data);

        setClassData(data);

        setLocked(data.lessonLocked ?? false);
        setClassPhase(data.classPhase ?? "instruction");
        setQuestionOpen(data.questionOpen ?? false);

        // ✅ FIX: handle Firestore timestamp
        setRecordingEndsAt(
          data.recordingEndsAt?.toMillis?.() ?? null
        );

        setClassLoaded(true);
      }
    });

    return () => unsubscribe();
  }, [selectedClassId]);

  /* ---------------- TIMER ---------------- */

  useEffect(() => {
    if (!recordingEndsAt || classPhase !== "recording") {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(
        0,
        Math.ceil((recordingEndsAt - Date.now()) / 1000)
      );
      setTimeLeft(diff);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);

  }, [recordingEndsAt, classPhase]);

  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  /* ---------------- START SESSION ---------------- */

  const startSession = async () => {
    const code = joinCode.trim().toUpperCase();

    if (!code || !lastName || !firstName) {
      alert("Please enter all fields.");
      return;
    }

    try {
      const joinRef = doc(db, "joinCodes", code);
      const joinSnap = await getDoc(joinRef);

      console.log("JOIN SNAP:", joinSnap.exists(), joinSnap.data());

      if (!joinSnap.exists()) {
        alert("Invalid join code");
        return;
      }

      const data = joinSnap.data();

      console.log("JOIN DATA:", data);

      const classId = data.classId;

      if (!classId) {
        console.error("Missing classId in joinCodes");
        alert("Invalid class mapping");
        return;
      }

      console.log("CLASS ID FOUND:", classId);

      const formattedName =
        `${capitalize(lastName.trim())}, ${capitalize(firstName.trim())}`;

      setSelectedClassId(classId);
      setStudent(formattedName);

    } catch (err) {
      console.error("Join FULL ERROR:", err);
      alert("Unable to join class");
    }
  };

  /* ---------------- ENTRY SCREEN ---------------- */

  if (!student) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>
          <h2>Think Out Loud</h2>

          <input
            placeholder="Join Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            style={styles.input}
          />

          <input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={styles.input}
          />

          <input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={styles.input}
          />

          <button onClick={startSession} style={styles.primaryButton}>
            Start
          </button>
        </div>
      </div>
    );
  }

  if (!classLoaded) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>Loading lesson...</div>
      </div>
    );
  }

  if (locked) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>
          <h2>🔒 Lesson Locked</h2>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN VIEW ---------------- */

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <strong>{student}</strong>
      </div>

      {classPhase === "instruction" && (
        <div style={styles.card}>
          <h2>📘 Instruction</h2>
        </div>
      )}

      {classPhase === "recording" && questionOpen && (
        <EssentialQuestionScreen
          student={student}
          classCode={selectedClassId}
          classData={classData}
        />
      )}

      {classPhase === "recording" && !questionOpen && (
        <div style={styles.card}>
          <h2>⏸ Waiting</h2>
        </div>
      )}

      {classPhase === "discussion" && (
        <div style={styles.card}>
          <h2>💬 Discussion</h2>
        </div>
      )}

      {classPhase === "reflection" && (
        <div style={styles.card}>
          <h2>🧠 Reflection</h2>
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  centerScreen: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f8f9fa"
  },
  card: {
    background: "white",
    padding: 30,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    textAlign: "center",
    width: 300
  },
  input: {
    width: "100%",
    padding: 10,
    margin: "10px 0",
    borderRadius: 6,
    border: "1px solid #ccc"
  },
  primaryButton: {
    width: "100%",
    padding: 10,
    background: "#4dabf7",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    marginTop: 10
  },
  page: {
    padding: 20
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20
  }
};