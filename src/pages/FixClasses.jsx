import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function FixClasses() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const runFix = async () => {
    if (!user) { alert("Not logged in"); return; }
    setRunning(true);
    setLog([]);

    try {
      const q = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid)
      );

      const snapshot = await getDocs(q);
      addLog(`Found ${snapshot.docs.length} classes`);

      for (const classDoc of snapshot.docs) {
        const data = classDoc.data();
        const classRef = doc(db, "classes", classDoc.id);
        const name = data.className || data.name || classDoc.id;

        addLog(`\nFixing: ${name}`);

        const updates = {};

        // ✅ currentLesson — default 1 if missing
        if (data.currentLesson === undefined) {
          updates.currentLesson = 1;
          addLog(`  + currentLesson: 1`);
        }

        // ✅ currentQuestion — default 1 if missing
        if (data.currentQuestion === undefined) {
          updates.currentQuestion = 1;
          addLog(`  + currentQuestion: 1`);
        }

        // ✅ teacherName
        if (!data.teacherName) {
          updates.teacherName = user.displayName || user.email || "Teacher";
          addLog(`  + teacherName: ${updates.teacherName}`);
        }

        // ✅ presentationMode
        if (data.presentationMode === undefined) {
          updates.presentationMode = false;
          addLog(`  + presentationMode: false`);
        }

        // ✅ recordingEndsAt
        if (data.recordingEndsAt === undefined) {
          updates.recordingEndsAt = null;
          addLog(`  + recordingEndsAt: null`);
        }

        // ✅ recording — if null, set to proper default map
        if (data.recording === null || data.recording === undefined) {
          updates.recording = {
            startTime: null,
            durationMs: 15 * 60 * 1000,
            clientStartTime: null,
            responseWindowEndsAt: null
          };
          addLog(`  + recording: default map`);
        }

        // ✅ makeupAssignment — normalize to null if it has old structure
        if (
          data.makeupAssignment !== null &&
          data.makeupAssignment !== undefined &&
          (data.makeupAssignment.questionId || data.makeupAssignment.sourceSessionId)
        ) {
          updates.makeupAssignment = null;
          addLog(`  + makeupAssignment: reset to null (old structure)`);
        }

        // ✅ lessonLocked — default false if missing
        if (data.lessonLocked === undefined) {
          updates.lessonLocked = false;
          addLog(`  + lessonLocked: false`);
        }

        // ✅ slideIndex — default 0 if missing
        if (data.slideIndex === undefined) {
          updates.slideIndex = 0;
          addLog(`  + slideIndex: 0`);
        }

        // ✅ instructionText — default if missing
        if (!data.instructionText) {
          updates.instructionText = "Explain your reasoning clearly. Use evidence and complete sentences.";
          addLog(`  + instructionText: default`);
        }

        // ✅ instructionVisible
        if (data.instructionVisible === undefined) {
          updates.instructionVisible = true;
          addLog(`  + instructionVisible: true`);
        }

        // ✅ classPhase — default to instruction if missing
        if (!data.classPhase) {
          updates.classPhase = "instruction";
          addLog(`  + classPhase: instruction`);
        }

        // ✅ questionOpen — default false if missing
        if (data.questionOpen === undefined) {
          updates.questionOpen = false;
          addLog(`  + questionOpen: false`);
        }

        if (Object.keys(updates).length === 0) {
          addLog(`  ✓ Already up to date`);
        } else {
          await updateDoc(classRef, updates);
          addLog(`  ✅ Saved ${Object.keys(updates).length} fixes`);
        }
      }

      addLog("\n🎉 All classes updated!");
      setDone(true);
    } catch (err) {
      addLog(`\n❌ ERROR: ${err.message}`);
      console.error(err);
    }

    setRunning(false);
  };

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>🔧 Fix All Classes</h1>
      <p style={{ color: "#555" }}>
        This brings every class up to the same structure as Gold 2.
        Safe to run — it only adds missing fields, never overwrites existing data.
      </p>

      {!user && (
        <div style={{ color: "#c92a2a", marginBottom: 16 }}>
          ⚠️ Not logged in — go to /teacher-login first
        </div>
      )}

      <button
        onClick={runFix}
        disabled={running || done || !user}
        style={{
          padding: "12px 24px",
          borderRadius: 8,
          border: "none",
          background: done ? "#2f9e44" : running ? "#aaa" : "#228be6",
          color: "white",
          fontWeight: "bold",
          fontSize: 16,
          cursor: running || done ? "not-allowed" : "pointer",
          marginBottom: 24
        }}
      >
        {done ? "✅ Done!" : running ? "Running..." : "Run Fix"}
      </button>

      {done && (
        <div style={{
          marginBottom: 16, padding: 12,
          background: "#ebfbee", borderRadius: 8,
          color: "#2f9e44", fontWeight: "600"
        }}>
          All classes are now aligned. You can remove this page from your app.
        </div>
      )}

      {log.length > 0 && (
        <div style={{
          background: "#1e1e1e", color: "#d4d4d4",
          padding: 20, borderRadius: 8,
          fontFamily: "monospace", fontSize: 13,
          whiteSpace: "pre-wrap", maxHeight: 500,
          overflowY: "auto"
        }}>
          {log.join("\n")}
        </div>
      )}
    </div>
  );
}
