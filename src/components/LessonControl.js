import React, { useEffect, useState } from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function LessonControls({ classId }) {

  const [currentLesson, setCurrentLesson] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionOpen, setQuestionOpen] = useState(false);

  /* ================= LISTEN TO CLASS ================= */

  useEffect(() => {

    if (!classId) return;

    const classRef = doc(db, "classes", classId);

    const unsubscribe = onSnapshot(classRef, snap => {

      if (snap.exists()) {

        const data = snap.data();

        setCurrentLesson(data.currentLesson || 1);
        setCurrentQuestion(data.currentQuestion || 0);
        setQuestionOpen(data.questionOpen || false);

      }

    });

    return () => unsubscribe();

  }, [classId]);

  /* ================= LESSON CONTROL ================= */

  const setLesson = async (lessonNumber) => {

    const classRef = doc(db, "classes", classId);

    await updateDoc(classRef, {
      currentLesson: lessonNumber,
      currentQuestion: 0,
      questionOpen: false
    });

  };

  const nextLesson = () => setLesson(currentLesson + 1);

  const previousLesson = () => {
    if (currentLesson <= 1) return;
    setLesson(currentLesson - 1);
  };

  /* ================= QUESTION CONTROL ================= */

  const nextQuestion = async () => {

    const classRef = doc(db, "classes", classId);

    await updateDoc(classRef, {
      currentQuestion: currentQuestion + 1,
      questionOpen: false
    });

  };

  const previousQuestion = async () => {

    if (currentQuestion <= 0) return;

    const classRef = doc(db, "classes", classId);

    await updateDoc(classRef, {
      currentQuestion: currentQuestion - 1,
      questionOpen: false
    });

  };

  /* ================= OPEN / LOCK QUESTION ================= */

  const openQuestion = async () => {

    const classRef = doc(db, "classes", classId);

    await updateDoc(classRef, {
      questionOpen: true
    });

  };

  const lockQuestion = async () => {

    const classRef = doc(db, "classes", classId);

    await updateDoc(classRef, {
      questionOpen: false
    });

  };

  /* ================= UI ================= */

  return (
    <div style={{ marginBottom: 30 }}>

      <h3>Lesson Controls</h3>

      <p>
        Lesson: <strong>{currentLesson}</strong>
      </p>

      <p>
        Question: <strong>{currentQuestion + 1}</strong>
      </p>

      <p>
        Status: <strong>{questionOpen ? "Open" : "Locked"}</strong>
      </p>

      <div style={{ marginBottom: 10 }}>
        <button onClick={previousLesson}>Previous Lesson</button>
        <button onClick={nextLesson} style={{ marginLeft: 10 }}>
          Next Lesson
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <button onClick={previousQuestion}>Previous Question</button>
        <button onClick={nextQuestion} style={{ marginLeft: 10 }}>
          Next Question
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <button onClick={openQuestion}>Open Question</button>
        <button onClick={lockQuestion} style={{ marginLeft: 10 }}>
          Lock Question
        </button>
      </div>

      <div>
        <button onClick={() => setLesson(1)}>Start Lesson 1</button>
        <button onClick={() => setLesson(2)} style={{ marginLeft: 10 }}>
          Start Lesson 2
        </button>
        <button onClick={() => setLesson(3)} style={{ marginLeft: 10 }}>
          Start Lesson 3
        </button>
      </div>

    </div>
  );
}