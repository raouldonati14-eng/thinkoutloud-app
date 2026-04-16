import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../firebase";
import {
  formatRecordingTime,
  useRecordingState
} from "../utils/useRecordingState";

import ThinkOutLoudRecorder from "../components/ThinkOutLoudRecorder";
import StudentProgressBar from "../components/StudentProgressBar";

export default function RecordingScreen({
  question,
  questionId,
  category,
  currentIndex,
  totalQuestions,
  onComplete,
  student,
  classCode
}) {
  const [classData, setClassData] = useState(null);
  const { recordingState, timeLeft } = useRecordingState(classData || {});

  useEffect(() => {
    if (!classCode) return;

    const classRef = doc(db, "classes", classCode);

    const unsubscribe = onSnapshot(classRef, (snap) => {
      setClassData(snap.exists() ? snap.data() : null);
    });

    return () => unsubscribe();
  }, [classCode]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Think Out Loud</h2>

        <StudentProgressBar
          current={currentIndex + 1}
          total={totalQuestions}
        />

        {recordingState !== "waiting" && (
          <div style={styles.timerBox}>
            <div style={styles.timerLabel}>
              {recordingState === "active"
                ? "Time Remaining"
                : "Timer Status"}
            </div>

            <div style={styles.timer}>
              {recordingState === "active"
                ? `⏱ ${formatRecordingTime(timeLeft)}`
                : "Responses remain open"}
            </div>
          </div>
        )}

        <p style={styles.questionTitle}>
          <strong>{question.title}</strong>
        </p>

        <p style={styles.questionText}>{question.text}</p>

        <p style={styles.instructions}>
          Explain your thinking. Speak freely and as concisely as possible.
          <br />
          Focus on explaining your reasoning clearly.
        </p>

        <ThinkOutLoudRecorder
          classCode={classCode}
          student={student}
          questionId={questionId}
          category={category}
          onFinish={onComplete}
        />

        <p style={styles.progress}>
          Question {currentIndex + 1} of {totalQuestions}
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: "30px"
  },

  card: {
    maxWidth: "800px",
    width: "100%",
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
  },

  title: {
    marginBottom: "15px"
  },

  timerBox: {
    marginTop: 10,
    marginBottom: 20,
    padding: 10,
    background: "#f1f3f5",
    borderRadius: 8,
    textAlign: "center"
  },

  timerLabel: {
    fontSize: 12,
    color: "#555"
  },

  timer: {
    fontSize: 22,
    fontWeight: "bold"
  },

  questionTitle: {
    fontSize: "1.2rem",
    marginBottom: "10px"
  },

  questionText: {
    marginBottom: "20px"
  },

  instructions: {
    fontStyle: "italic",
    color: "#555",
    marginBottom: "20px"
  },

  progress: {
    marginTop: "20px",
    color: "#666"
  }
};
