import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../../firebase";
import {
  formatRecordingTime,
  useRecordingState
} from "../../utils/useRecordingState";

export default function LiveQuestionTimer({ classId }) {
  const [classData, setClassData] = useState(null);
  const { recordingState, timeLeft } = useRecordingState(classData || {});

  useEffect(() => {
    if (!classId) return;

    const classRef = doc(db, "classes", classId);

    const unsubscribe = onSnapshot(classRef, (snap) => {
      setClassData(snap.exists() ? snap.data() : null);
    });

    return () => unsubscribe();
  }, [classId]);

  if (recordingState === "waiting") return null;

  return (
    <div style={styles.container}>
      <h3>Question Timer</h3>

      <div style={styles.timer}>
        {recordingState === "active"
          ? `Time left: ${formatRecordingTime(timeLeft)}`
          : "Timer ended: responses still open"}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: 20,
    padding: 20,
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
  },

  timer: {
    fontSize: 28,
    fontWeight: "bold"
  }
};
