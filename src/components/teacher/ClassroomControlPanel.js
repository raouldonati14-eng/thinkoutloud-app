import React from "react";
import {
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebase";

export default function ClassroomControlPanel({ classId, classData, setPhase }) {

  const MAX_LESSON = 3;

  const updateClass = async (data) => {

    try {

      const classRef = doc(db, "classes", classId);

      await updateDoc(classRef, data);

    } catch (err) {

      console.error("Update failed:", err);

    }

  };

  /* ---------- OPEN QUESTION WITH SESSION ---------- */

  const openQuestion = async () => {

    try {

      const classRef = doc(db, "classes", classId);

      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) return;

      const classData = classSnap.data();

      /* Prevent duplicate sessions */

      if (classData.activeSessionId && classData.questionOpen) {

        console.log("Session already active:", classData.activeSessionId);
        return;

      }

      const sessionId = "lesson_" + Date.now();

      console.log("Creating session:", sessionId);

      /* Update class */

      await updateDoc(classRef, {
        questionOpen: true,
        activeSessionId: sessionId
      });

      /* Create stats document */

      await setDoc(
        doc(
          db,
          "classes",
          classId,
          "sessions",
          sessionId,
          "stats",
          "summary"
        ),
        {
          recordingCount: 0,
          submittedCount: 0,
          avgReasoningScore: 0,
          createdAt: Date.now()
        }
      );

      console.log("Session created successfully");

    } catch (err) {

      console.error("Failed to open question:", err);

    }

  };

  /* ---------- NEXT QUESTION ---------- */

  const nextQuestion = async () => {

    try {

      const currentLesson = Number(classData?.currentLesson || 1);

      if (currentLesson >= MAX_LESSON) {

        alert("You have reached the final question.");

        return;

      }

      await updateClass({
        currentLesson: currentLesson + 1,
        questionOpen: false,
        activeSessionId: null
      });

    } catch (err) {

      console.error("Next question failed:", err);

    }

  };

  return (

    <div style={styles.container}>

      {/* LESSON PHASE */}

      <div style={styles.group}>

        <h3>Lesson Phase</h3>

        <div style={styles.row}>

          <button
            style={styles.button}
            onClick={() => setPhase("instruction")}
          >
            Instruction
          </button>

          <button
            style={styles.button}
            onClick={() => {
              if (typeof setPhase === "function") {
                setPhase("recording");
                return;
              }

              updateClass({
                classPhase: "recording",
                recording: {
                  startTime: serverTimestamp(),
                  clientStartTime: Date.now(),
                  durationMs: 60000
                }
              });
            }}
          >
            Recording
          </button>

          <button
            style={styles.button}
            onClick={() => updateClass({ classPhase: "discussion" })}
          >
            Discussion
          </button>

          <button
            style={styles.button}
            onClick={() => updateClass({ classPhase: "reflection" })}
          >
            Reflection
          </button>

        </div>

      </div>

      {/* QUESTION CONTROLS */}

      <div style={styles.group}>

        <h3>Question Controls</h3>

        <div style={styles.row}>

          <button
            style={styles.button}
            onClick={openQuestion}
          >
            Open Question
          </button>

          <button
            style={styles.button}
            onClick={() => updateClass({ questionOpen: false })}
          >
            Close Question
          </button>

          <button
            style={styles.button}
            onClick={nextQuestion}
          >
            Next Question
          </button>

        </div>

      </div>

      {/* CLASSROOM TOOLS */}

      <div style={styles.group}>

        <h3>Classroom Tools</h3>

        <div style={styles.row}>

          <button
            style={styles.button}
            onClick={() => updateClass({ lessonLocked: true })}
          >
            Lock Lesson
          </button>

          <button
            style={styles.button}
            onClick={() => updateClass({ lessonLocked: false })}
          >
            Unlock Lesson
          </button>

          <button
            style={styles.button}
            onClick={() => updateClass({ spotlightResponseId: null })}
          >
            Clear Spotlight
          </button>

        </div>

      </div>

    </div>

  );

}

const styles = {

  container: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
  },

  group: {
    marginBottom: 20
  },

  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10
  },

  button: {
    width: 140,
    height: 42,
    borderRadius: 6,
    border: "1px solid #dcdcdc",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.2s ease"
  }

};
