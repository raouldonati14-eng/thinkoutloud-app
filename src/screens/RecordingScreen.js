import React, { useEffect } from "react";
import ThinkOutLoudRecorder from "../components/ThinkOutLoudRecorder";


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

  // 🔐 Anonymous sign-in for students
  

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Think Out Loud</h2>

        <p style={styles.questionTitle}>
          <strong>{question.title}</strong>
        </p>

        <p style={styles.questionText}>
          {question.text}
        </p>

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
