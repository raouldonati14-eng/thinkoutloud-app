import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import ThinkOutLoudRecorder from "../components/ThinkOutLoudRecorder";

export default function EssentialQuestionScreen({
  classCode,
  classId,
  student,
  classData
}) {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const [spotlight, setSpotlight] = useState(null);

  useEffect(() => {
    if (!classData) return;

    const loadSpotlight = async () => {
      if (!classData.spotlightResponseId || !classData.activeSessionId) {
        setSpotlight(null);
        return;
      }

      try {
        const ref = doc(
          db,
          "classes",
          classId,
          "sessions",
          classData.activeSessionId,
          "responses",
          classData.spotlightResponseId
        );

        const snap = await getDoc(ref);

        if (snap.exists()) {
          setSpotlight(snap.data());
        }
      } catch (err) {
        console.error("Spotlight error:", err);
      }
    };

    loadSpotlight();
  }, [classData, classId]);

  useEffect(() => {
    if (!classData?.questionOpen) return;

    if (
      !classData.category ||
      classData.currentLesson === null ||
      classData.currentQuestion === null
    ) {
      console.log("Waiting for full class data...");
      return;
    }

    const loadQuestion = async () => {
      setLoading(true);

      try {
        const q = query(
          collection(db, "questions"),
          where("category", "==", classData.category),
          where("lesson", "==", classData.currentLesson)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          console.error("NO QUESTIONS FOUND:", classData);
          setQuestion(null);
          setLoading(false);
          return;
        }

        const allQuestions = snap.docs.map((questionDoc) => ({
          id: questionDoc.id,
          ...questionDoc.data()
        }));

        if (process.env.NODE_ENV === "development") {
          console.log("QUERY VALUES:", {
            category: classData.category,
            lesson: classData.currentLesson
          });
          console.log("ALL QUESTIONS:", allQuestions);
        }

        const match = allQuestions.find(
          (candidate) =>
            Number(candidate.order) === Number(classData.currentQuestion)
        );

        if (process.env.NODE_ENV === "development") {
          console.log("MATCHED:", match);
        }

        setQuestion(match || null);
      } catch (err) {
        console.error("Question error:", err);
      }

      setLoading(false);
    };

    loadQuestion();
  }, [classData]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  if (!question) {
    return <div style={{ padding: 40 }}>Waiting for your teacher...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      {spotlight && (
        <div
          style={{
            background: "#fff9db",
            padding: 20,
            marginBottom: 20,
            borderRadius: 10
          }}
        >
          <h2>{spotlight.student}</h2>
          <p>"{spotlight.transcript}"</p>
        </div>
      )}

      <h1>{question.title}</h1>
      <p style={{ fontSize: 18 }}>{question.text}</p>

      <ThinkOutLoudRecorder
        student={student?.name || student}
        questionId={question?.id}
        questionText={question?.text}
        category={classData?.category}
        classCode={classCode}
        classId={classId}
        sessionId={classData?.activeSessionId}
      />
    </div>
  );
}
