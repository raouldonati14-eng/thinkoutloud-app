// ✅ EssentialQuestionScreen.jsx (FIXED + SAFE)

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

export default function EssentialQuestionScreen({ classCode, student, classData }) {

  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const [spotlight, setSpotlight] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {

    if (!classCode || !classData) return;

    const loadData = async () => {

      console.log("Class updated:", classData);

      const activeSessionId = classData.activeSessionId;
      setSessionId(activeSessionId);

      /* ---------- SPOTLIGHT ---------- */

      if (classData.spotlightResponseId && activeSessionId) {

        try {
          const responseRef = doc(
            db,
            "classes",
            classCode,
            "sessions",
            activeSessionId,
            "responses",
            classData.spotlightResponseId
          );

          const responseSnap = await getDoc(responseRef);

          if (responseSnap.exists()) {
            setSpotlight(responseSnap.data());
          }

        } catch (err) {
          console.error("Spotlight load error:", err);
        }

      } else {
        setSpotlight(null);
      }

      /* ---------- QUESTION ---------- */

      if (!classData.questionOpen) {
        console.log("Question not open yet");
        setQuestion(null);
        setLoading(false);
        return;
      }

      // 🔥 CRITICAL FIX: Prevent undefined query values
      if (
        !classData.category ||
        classData.currentLesson === undefined
      ) {
        console.log("Waiting for valid class data...");
        console.log("CATEGORY:", classData.category);
        console.log("LESSON:", classData.currentLesson);

        setLoading(false);
        return;
      }

      try {

        const q = query(
          collection(db, "questions"),
          where("category", "==", classData.category),
          where("lesson", "==", classData.currentLesson)
        );

        const snap = await getDocs(q);

        const allQuestions = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("ALL QUESTIONS:", allQuestions);
        console.log("CURRENT QUESTION:", classData.currentQuestion);

        // ✅ TYPE SAFE MATCH
        const match = allQuestions.find(
          q => Number(q.order) === Number(classData.currentQuestion)
        );

        console.log("Matched question:", match);

        setQuestion(match || null);

      } catch (err) {
        console.error("Question query error:", err);
      }

      setLoading(false);
    };

    loadData();

  }, [classCode, classData]);

  /* ---------- UI ---------- */

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;

  if (!question) {
    return <div style={{ padding: 40 }}>Waiting for your teacher...</div>;
  }

  return (
    <div style={{ padding: 40 }}>

      {/* ---------- SPOTLIGHT ---------- */}
      {spotlight && (
        <div style={{
          background: "#fff9db",
          padding: 20,
          marginBottom: 20,
          borderRadius: 10
        }}>
          <h2>💡 {spotlight.student}</h2>
          <p>"{spotlight.transcript}"</p>
        </div>
      )}

      {/* ---------- QUESTION ---------- */}
      <h1>{question.title}</h1>
      <p style={{ fontSize: 18 }}>{question.text}</p>

      {/* ---------- RECORDER ---------- */}
      <ThinkOutLoudRecorder
        student={student}
        classCode={classCode}
        questionId={question.id}
        category={question.category}
        sessionId={sessionId}
      />

    </div>
  );
}