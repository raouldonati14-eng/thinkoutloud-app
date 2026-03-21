import React, { useEffect, useState, useMemo } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase";
 import { getDocs, where } from "firebase/firestore"; // add at top if missing
/* -------- Panels -------- */

import SubmissionProgressPanel from "../components/teacher/SubmissionProgressPanel";
import RecordingTickerPanel from "../components/teacher/RecordingTickerPanel";
import LiveResponseGrid from "../components/teacher/LiveResponseGrid";
import QuestionStatusPanel from "../components/teacher/QuestionStatusPanel";
import LiveTranscriptFeed from "../components/teacher/LiveTranscriptFeed";
import TeacherSpotlightPanel from "../components/teacher/TeacherSpotlightPanel";
import TeacherTimelinePanel from "../components/teacher/TeacherTimelinePanel";
import ReasoningAnalyticsPanel from "../components/ReasoningAnalyticsPanel";
import ReasoningHighlightsPanel from "../components/ReasoningHighlightsPanel";
import ReasoningHeatmapPanel from "../components/teacher/ReasoningHeatmapPanel";
import ThinkingPatternsPanel from "../components/teacher/ThinkingPatternsPanel";
import CounterargumentPanel from "../components/teacher/CounterargumentPanel";
import AnalyticsSummary from "../components/teacher/AnalyticsSummary";
import SuggestedResponsesPanel from "../components/teacher/SuggestedResponsesPanel";
import DominantReasoningThemes from "../components/teacher/DominantReasoningThemes";
import ReasoningGapDetector from "../components/teacher/ReasoningGapDetector";
import TeacherPromptEngine from "../components/teacher/TeacherPromptEngine";

/* -------- Dashboard -------- */

export default function TeacherDashboard({ classId }) {

  const [classData, setClassData] = useState(null);
  const [responses, setResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [copied, setCopied] = useState(false);

  /* -------- CLASS LISTENER -------- */

  useEffect(() => {
    if (!classId) return;

    const classRef = doc(db, "classes", classId);

    const unsubscribe = onSnapshot(classRef, (snap) => {
      if (snap.exists()) {
        setClassData(snap.data());
      }
    });

    return () => unsubscribe();
  }, [classId]);

  /* -------- SESSION ID -------- */

  const sessionId = useMemo(() => {
    return classData?.activeSessionId || null;
  }, [classData]);

  /* -------- RESPONSES -------- */

  useEffect(() => {
    if (!classId || !sessionId) return;

    const responsesRef = query(
      collection(db, "classes", classId, "sessions", sessionId, "responses"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResponses(list);
    });

    return () => unsubscribe();
  }, [classId, sessionId]);

  /* -------- ANALYTICS -------- */

  const generateLiveAnalytics = (responses) => {
    let strong = 0;
    let partial = 0;
    let support = 0;

    responses.forEach(r => {
      const score = r.score || 0;
      if (score >= 3) strong++;
      else if (score === 2) partial++;
      else support++;
    });

    return {
      totalResponses: responses.length,
      strongReasoning: strong,
      partialReasoning: partial,
      needsSupport: support
    };
  };

  useEffect(() => {
    if (!classId || !sessionId) return;

    const analyticsRef = doc(
      db,
      "classes",
      classId,
      "sessions",
      sessionId,
      "analytics",
      "liveStats"
    );

    const analyticsData = generateLiveAnalytics(responses);

    setDoc(analyticsRef, analyticsData, { merge: true });

  }, [responses, classId, sessionId]);

  useEffect(() => {
    if (!classId || !sessionId) return;

    const analyticsRef = doc(
      db,
      "classes",
      classId,
      "sessions",
      sessionId,
      "analytics",
      "liveStats"
    );

    const unsubscribe = onSnapshot(analyticsRef, (snap) => {
      if (snap.exists()) {
        setAnalytics(snap.data());
      }
    });

    return () => unsubscribe();
  }, [classId, sessionId]);

  /* -------- PROMPTS -------- */

  useEffect(() => {
    if (!classId || !sessionId) return;

    const ref = doc(
      db,
      "classes",
      classId,
      "sessions",
      sessionId,
      "intelligence",
      "prompts"
    );

    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setPrompts(snap.data()?.prompts || []);
      } else {
        setPrompts([]);
      }
    });

    return () => unsubscribe();
  }, [classId, sessionId]);

  /* -------- CONTROLS -------- */

  const classRef = doc(db, "classes", classId);

 const setPhase = async (phase) => {
  let updateData = {
    classPhase: phase,
    lessonLocked: phase === "instruction"
  };

  if (phase === "recording") {
    updateData.recordingEndsAt = Date.now() + 60000;
  }

  await updateDoc(classRef, updateData);
};

  const openQuestion = async () => {
    await updateDoc(classRef, { questionOpen: true });
  };

  const closeQuestion = async () => {
    await updateDoc(classRef, { questionOpen: false });
  };


const nextQuestion = async () => {
  try {

    const q = query(
      collection(db, "questions"),
      where("category", "==", classData.category),
      where("lesson", "==", classData.currentLesson)
    );

    const snap = await getDocs(q);
    const totalQuestions = snap.size;

    const next = (classData?.currentQuestion || 1) + 1;

    if (next > totalQuestions) {
      alert("No more questions in this lesson");
      return;
    }

    await updateDoc(classRef, {
      currentQuestion: next,
      questionOpen: false,
      classPhase: "instruction"
    });

  } catch (err) {
    console.error("Next question error:", err);
  }
};

  const getButtonStyle = (isActive, isDisabled) => ({
    padding: "10px 14px",
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: "none",
    fontWeight: "600",
    cursor: isDisabled ? "not-allowed" : "pointer",
    backgroundColor: isActive ? "#228be6" : isDisabled ? "#dee2e6" : "#f1f3f5",
    color: isActive ? "white" : "#333",
    opacity: isDisabled ? 0.6 : 1
  });

  /* -------- GUARDS -------- */

  if (!classId) return <div>No class selected.</div>;
  if (!classData) return <div>Loading class...</div>;

  /* -------- UI -------- */

  return (
    <div style={{ padding: 30, maxWidth: 1400, margin: "0 auto" }}>

      <h1>{classData.className}</h1>

      {/* -------- JOIN CODE -------- */}
      <div style={{
        marginBottom: 25,
        padding: 15,
        background: "#e7f5ff",
        borderRadius: 10,
        display: "flex",
        justifyContent: "space-between"
      }}>
        <div>
          <div>Join Code</div>
          <div style={{ fontSize: 28, fontWeight: "bold" }}>
            {classData.joinCode || "—"}
          </div>
        </div>

        <button onClick={() => {
          navigator.clipboard.writeText(classData.joinCode || "");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}>
          {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>
        
      {/* -------- LESSON PHASE -------- */}

      <div style={{ marginBottom: 25 }}>
        <h3>Lesson Phase</h3>

        <button onClick={() => setPhase("instruction")} style={getButtonStyle(classData.classPhase === "instruction")}>Instruction</button>
        <button onClick={() => setPhase("recording")} style={getButtonStyle(classData.classPhase === "recording")}>Recording</button>
        <button onClick={() => setPhase("discussion")} style={getButtonStyle(classData.classPhase === "discussion")}>Discussion</button>
        <button onClick={() => setPhase("reflection")} style={getButtonStyle(classData.classPhase === "reflection")}>Reflection</button>
      </div>

{/* -------- QUESTION CONTROLS -------- */}

<div style={{ marginBottom: 25 }}>
  <h3>Question Controls</h3>

  <button
    onClick={openQuestion}
    disabled={classData?.questionOpen}
    style={getButtonStyle(
      classData?.questionOpen,
      classData?.questionOpen
    )}
  >
    Open Question
  </button>

  <button
    onClick={closeQuestion}
    disabled={!classData?.questionOpen}
    style={getButtonStyle(
      false,
      !classData?.questionOpen
    )}
  >
    Close Question
  </button>

  <button
    onClick={nextQuestion}
    disabled={classData?.questionOpen}
    style={getButtonStyle(
      false,
      classData?.questionOpen
    )}
  >
    Next Question
  </button>
</div>
        
      {/* -------- PANELS -------- */}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        <div>
          <SubmissionProgressPanel responses={responses} />
          <RecordingTickerPanel responses={responses} />
          <LiveResponseGrid responses={responses} />
          <QuestionStatusPanel responses={responses} />
        </div>

        <div>
          <SuggestedResponsesPanel responses={responses} />
          <TeacherSpotlightPanel responses={responses} />
          <LiveTranscriptFeed responses={responses} />
          <ReasoningHighlightsPanel responses={responses} />
          <ThinkingPatternsPanel responses={responses} />
          <CounterargumentPanel responses={responses} />
          <DominantReasoningThemes analytics={analytics} />
          <ReasoningGapDetector analytics={analytics} />
          <TeacherPromptEngine prompts={prompts} />
          <ReasoningHeatmapPanel responses={responses} />
          <ReasoningAnalyticsPanel classId={classId} sessionId={sessionId} />
          <TeacherTimelinePanel responses={responses} />
          <AnalyticsSummary analytics={analytics} />
        </div>

      </div>

    </div>
  );
}