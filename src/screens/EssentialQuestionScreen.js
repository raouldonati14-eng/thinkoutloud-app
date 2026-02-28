import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";
import RecordingScreen from "./RecordingScreen";
import FeedbackScreen from "./FeedbackScreen";

export default function EssentialQuestionScreen({ student, classCode }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classCategory, setClassCategory] = useState(null);

  /* ================= LOAD CLASS CATEGORY ================= */

  useEffect(() => {
    const loadClass = async () => {
      if (!classCode) return;

      const classRef = doc(db, "classes", classCode);
      const snap = await getDoc(classRef);

      if (snap.exists()) {
        setClassCategory(snap.data().category);
      }
    };

    loadClass();
  }, [classCode]);

  /* ================= LOAD QUESTIONS ================= */

  useEffect(() => {
    if (!classCategory) return;

    const q = query(
      collection(db, "questions"),
      where("category", "==", classCategory),
      where("released", "==", true),
      where("active", "==", true),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const loaded = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setQuestions(loaded);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classCategory]);

  /* ================= LOAD STUDENT PROGRESS ================= */

  useEffect(() => {
    const loadProgress = async () => {
      const progressRef = doc(db, "studentProgress", student);
      const snap = await getDoc(progressRef);

      if (snap.exists()) {
        setCurrentIndex(snap.data().lastCompleted || 0);
      } else {
        await setDoc(progressRef, { lastCompleted: 0 });
        setCurrentIndex(0);
      }
    };

    if (student) loadProgress();
  }, [student]);

  if (loading) return <div>Loading questions…</div>;

  if (!questions.length) {
    return <div>No active questions available.</div>;
  }

  const currentQuestion = questions[currentIndex];

  const handleRecordingComplete = (responseData) => {
    setFeedback({
      ...responseData,
      student,
      classCode,
      questionId: currentQuestion.order,
      category: currentQuestion.category
    });
  };

  const handleNext = async () => {
    const nextIndex = currentIndex + 1;

    await setDoc(doc(db, "studentProgress", student), {
      lastCompleted: nextIndex,
      classCode
    });

    setFeedback(null);
    setCurrentIndex(nextIndex);
  };

  return (
    <>
      {!feedback ? (
        <RecordingScreen
          question={currentQuestion}
          questionId={currentQuestion.order}
          category={currentQuestion.category}
          student={student}
          classCode={classCode}
          onComplete={handleRecordingComplete}
        />
      ) : (
        <FeedbackScreen
          question={currentQuestion}
          feedback={feedback}
          onNext={handleNext}
        />
      )}
    </>
  );
}