import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";
import questionsData from "../data/questions.json";
import { useRecordingState } from "../utils/useRecordingState";
import { buildQuestionPrompts } from "../utils/questionPrompts";
import { translateText } from "../utils/translate";
import { resolveQuestionIdentity } from "../utils/questionIdentity";
import {
  buildCloseQuestionUpdate,
  buildPhaseUpdate,
  buildReopenSessionUpdate,
  getSessionStatusSummary
} from "../utils/sessionState";
import { logClientEvent } from "../utils/logEvent";

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
import GradebookPanel from "../components/teacher/GradebookPanel";

const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Espanol",
  pt: "Portugues",
  fr: "Francais",
  zh: "Chinese",
  ar: "Arabic",
  vi: "Vietnamese",
  tl: "Tagalog",
  ko: "Korean",
  ru: "Russian",
  it: "Italian"
};

export default function TeacherDashboard({ classId }) {
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [responses, setResponses] = useState([]);// responses = current session
  const [allResponses, setAllResponses] = useState([]);// allResponses = historical across sessions (used for gradebook/mastery)
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [teacherLanguage, setTeacherLanguage] = useState("en");
  const [langSaved, setLangSaved] = useState(false);
  const [roster, setRoster] = useState([]);
  const [makeupStudents, setMakeupStudents] = useState([]);
  const [makeupAssigned, setMakeupAssigned] = useState(false);
  const [showMakeupPanel, setShowMakeupPanel] = useState(false);
  const [libraryQuestions, setLibraryQuestions] = useState([]);
  const [selectedMakeupQuestion, setSelectedMakeupQuestion] = useState(null);
  const [makeupCategoryFilter, setMakeupCategoryFilter] = useState("All");
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [prompts, setPrompts] = useState([]);

  const { recordingState } = useRecordingState(classData || {});
  const sessionId = classData?.activeSessionId || selectedSession || null;
  const questionIdentity = resolveQuestionIdentity(classData || {});
  const sessionStatus = getSessionStatusSummary(classData || {});

  useEffect(() => {
    if (!classId) return;

    const classRef = doc(db, "classes", classId);
    const unsubscribe = onSnapshot(classRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const nextData = snapshot.data();
      setClassData(nextData);
      setTeacherLanguage(nextData?.teacherLanguage || "en");
    });

    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    const sessionsRef = collection(db, "classes", classId, "sessions");

    const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
      const list = snapshot.docs
        .map((sessionDoc) => ({ id: sessionDoc.id, ...sessionDoc.data() }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSessions(list);

      if (!selectedSession && list.length > 0) {
        setSelectedSession(list[0].id);
      }
    });

    return () => unsubscribe();
  }, [classId, selectedSession]);

  useEffect(() => {
    if (!classId || !sessionId) {
      setResponses([]);
      return;
    }

    const responsesRef = query(
      collection(db, "responses"),
      where("classId", "==", classId),
      where("sessionId", "==", sessionId)
    );

    const unsubscribe = onSnapshot(
  responsesRef,
  (snapshot) => {
    const list = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));

    setResponses(list);
  },
  (error) => {
    console.error("Error fetching responses:", error);
  }
);
    return () => unsubscribe();
  }, [classId, sessionId]);

  useEffect(() => {
    if (!classId) {
      setAllResponses([]);
      return;
    }

    const allResponsesRef = query(
      collection(db, "responses"),
      where("classId", "==", classId)
    );

    const unsubscribe = onSnapshot(
  allResponsesRef,
  (snapshot) => {
    const list = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => getTimestamp(b) - getTimestamp(a)); // optional but recommended

    setAllResponses(list);
  },
  (error) => {
    console.error("Error fetching all responses:", error);
  }
);
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!classId || !sessionId) {
      setPrompts([]);
      return;
    }

    const promptsRef = doc(
      db,
      "classes",
      classId,
      "sessions",
      sessionId,
      "intelligence",
      "prompts"
    );
    const unsubscribe = onSnapshot(promptsRef, (snapshot) => {
      setPrompts(snapshot.exists() ? snapshot.data()?.prompts || [] : []);
    });

    return () => unsubscribe();
  }, [classId, sessionId]);

  useEffect(() => {
    if (!classId) return;
    const rosterRef = collection(db, "classes", classId, "roster");
    const unsubscribe = onSnapshot(rosterRef, (snapshot) => {
      setRoster(snapshot.docs.map((rosterDoc) => ({ id: rosterDoc.id, ...rosterDoc.data() })));
    });
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "questions"), (snapshot) => {
      const firestoreQuestions = snapshot.docs.map((questionDoc) => ({
        id: questionDoc.id,
        ...questionDoc.data()
      }));
      const merged = [
        ...firestoreQuestions,
        ...questionsData.filter(
          (question) => !firestoreQuestions.some((saved) => saved.text === question.text)
        )
      ];
      setLibraryQuestions(merged);
    });

    return () => unsubscribe();
  }, []);

  const analytics = useMemo(() => {
    let strongReasoning = 0;
    let partialReasoning = 0;
    let needsSupport = 0;

    responses.forEach((response) => {
      const score = Number(response.score || 0);
      if (score >= 3) {
        strongReasoning += 1;
      } else if (score === 2) {
        partialReasoning += 1;
      } else {
        needsSupport += 1;
      }
    });

    return {
      totalResponses: responses.length,
      strongReasoning,
      partialReasoning,
      needsSupport
    };
  }, [responses]);

  const saveTeacherLanguage = async (language) => {
    if (!classId) return;
    setTeacherLanguage(language);
    await setDoc(
      doc(db, "classes", classId),
      {
        teacherLanguage: language
      },
      { merge: true }
    );
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 1800);
  };

  const writeTranslatedPrompts = async (questionText, category, language) => {
    const sourcePrompts = buildQuestionPrompts(questionText, category);
    const discussionPrompts = await Promise.all(
      sourcePrompts.discussionPrompts.map((prompt) =>
        translateText(prompt, language, "teacher")
      )
    );
    const reflectionPrompts = await Promise.all(
      sourcePrompts.reflectionPrompts.map((prompt) =>
        translateText(prompt, language, "teacher")
      )
    );
    return { discussionPrompts, reflectionPrompts };
  };

  const setPhase = async (phase) => {
    if (!classId) return;
    const classRef = doc(db, "classes", classId);
    const now = Date.now();
    const nextUpdate = buildPhaseUpdate(phase, {}, now);

    if (phase === "instruction") {
      await logClientEvent("teacher_phase_change", {
        classId,
        phase,
        activeSessionId: classData?.activeSessionId || null
      });
    }

    if (phase === "recording") {
      let nextSessionId = classData?.activeSessionId;
      if (!nextSessionId) {
        const newSessionRef = doc(collection(db, "classes", classId, "sessions"));
        await setDoc(newSessionRef, {
  createdAt: serverTimestamp(),
  startedAt: serverTimestamp(),
  questionText: classData?.essentialQuestion || "",
  category: classData?.category || "General"
});
        nextSessionId = newSessionRef.id;
      }

      nextUpdate.activeSessionId = nextSessionId;
      nextUpdate.slideIndex = 0;
      nextUpdate.recording = {
        ...nextUpdate.recording,
        startTime: serverTimestamp()
      };
    }

    if (phase === "discussion" || phase === "reflection") {
      const questionText = classData?.essentialQuestion || "";
      const category = classData?.category || "General";
      const { discussionPrompts, reflectionPrompts } = await writeTranslatedPrompts(
        questionText,
        category,
        teacherLanguage || "en"
      );
      nextUpdate.discussionPrompts = discussionPrompts;
      nextUpdate.reflectionPrompts = reflectionPrompts;
    }

    await setDoc(classRef, nextUpdate, { merge: true });
    await logClientEvent("teacher_phase_change", {
      classId,
      phase,
      activeSessionId: nextUpdate.activeSessionId || classData?.activeSessionId || null
    });

    const tabByPhase = {
      instruction: "tools",
      recording: "live",
      discussion: "thinking",
      reflection: "analytics"
    };
    setActiveTab(tabByPhase[phase] || "live");
  };

  const startPresentation = async () => {
    if (!classId) return;
    await setDoc(
      doc(db, "classes", classId),
      { presentationMode: true, classPhase: "discussion", slideIndex: 0 },
      { merge: true }
    );
  };

  const stopPresentation = async () => {
    if (!classId) return;
    await setDoc(doc(db, "classes", classId), { presentationMode: false }, { merge: true });
  };

  const nextSlide = async () => {
    if (!classId) return;
    const current = classData?.slideIndex || 0;
    const promptCount =
      classData?.classPhase === "discussion"
        ? classData?.discussionPrompts?.length || 0
        : classData?.reflectionPrompts?.length || 0;
    const next = promptCount > 0 ? Math.min(current + 1, promptCount - 1) : current + 1;
    await setDoc(doc(db, "classes", classId), { slideIndex: next }, { merge: true });
  };

  const prevSlide = async () => {
    if (!classId) return;
    const current = classData?.slideIndex || 0;
    await setDoc(
      doc(db, "classes", classId),
      { slideIndex: Math.max(0, current - 1) },
      { merge: true }
    );
  };

  const openQuestion = async () => {
    if (!classId) return;
    await setPhase("recording");
  };

  const closeQuestion = async () => {
    if (!classId) return;
    await setDoc(
      doc(db, "classes", classId),
      buildCloseQuestionUpdate(),
      { merge: true }
    );
    await logClientEvent("teacher_question_closed", {
      classId,
      activeSessionId: classData?.activeSessionId || null
    });
  };

  const reopenSession = async (sessionIdToReopen) => {
    if (!classId || !sessionIdToReopen) return;
    const existingSession = sessions.find((session) => session.id === sessionIdToReopen) || {};
    const reopenUpdate = buildReopenSessionUpdate(sessionIdToReopen, existingSession);
    reopenUpdate.recording = {
      ...reopenUpdate.recording,
      startTime: serverTimestamp()
    };
    await setDoc(doc(db, "classes", classId), reopenUpdate, { merge: true });
    await logClientEvent("teacher_session_reopened", {
      classId,
      sessionId: sessionIdToReopen
    });
    setSelectedSession(sessionIdToReopen);
    setActiveTab("live");
  };

  const restartQuestionForStudents = async () => {
    if (!classId || !questionIdentity.text) return;

    const newSessionRef = doc(collection(db, "classes", classId, "sessions"));
    await setDoc(newSessionRef, {
      createdAt: Date.now(),
      startedAt: Date.now(),
      restartedAt: Date.now(),
      questionText: questionIdentity.text,
      category: classData?.category || "General"
    });

    const translatedPrompts = await writeTranslatedPrompts(
      questionIdentity.text,
      classData?.category || "General",
      teacherLanguage || "en"
    );

    await setDoc(
      doc(db, "classes", classId),
      {
        activeSessionId: newSessionRef.id,
        questionOpen: true,
        classPhase: "recording",
        slideIndex: 0,
        currentQuestion: questionIdentity.title,
        essentialQuestion: questionIdentity.text,
        discussionPrompts: translatedPrompts.discussionPrompts,
        reflectionPrompts: translatedPrompts.reflectionPrompts,
        recording: {
          ...buildPhaseUpdate("recording").recording,
          startTime: serverTimestamp()
        }
      },
      { merge: true }
    );

    await logClientEvent("teacher_question_restarted", {
      classId,
      sessionId: newSessionRef.id
    });
    setSelectedSession(newSessionRef.id);
    setActiveTab("live");
  };

  const assignMakeup = async () => {
    if (!classId || !selectedMakeupQuestion || makeupStudents.length === 0) return;

    const translatedQuestion = await translateText(
      selectedMakeupQuestion.text,
      teacherLanguage || "en",
      "teacher"
    );
    const promptsForMakeup = await writeTranslatedPrompts(
      selectedMakeupQuestion.text,
      selectedMakeupQuestion.category,
      teacherLanguage || "en"
    );

    await setDoc(doc(db, "classes", classId, "makeup", "assignment"), {
      questionText: translatedQuestion,
      category: selectedMakeupQuestion.category,
      discussionPrompts: promptsForMakeup.discussionPrompts,
      reflectionPrompts: promptsForMakeup.reflectionPrompts,
      assignedTo: makeupStudents,
      assignedAt: Date.now(),
      open: true
    });

    setMakeupAssigned(true);
    setMakeupStudents([]);
    setSelectedMakeupQuestion(null);
    setShowLibraryPicker(false);
    setTimeout(() => setMakeupAssigned(false), 2600);
  };

  const handleDeleteResponse = async (attempt) => {
    if (!attempt?.id) return;
    const confirmed = window.confirm(
      `Delete attempt ${attempt.attemptNumber || ""} for ${attempt.studentName || attempt.studentId || "student"}?`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "responses", attempt.id));
    } catch (error) {
      console.error("Delete response failed:", error);
      alert("Could not delete this response.");
    }
  };

  const controlBtn = (color, disabled = false) => ({
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    background: disabled ? "#dee2e6" : color,
    color: "white",
    fontWeight: "600",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1
  });

  const tabBtn = (tab) => ({
    padding: "9px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: 14,
    background: activeTab === tab ? "#228be6" : "#f1f3f5",
    color: activeTab === tab ? "white" : "#333"
  });

  const makeupCategories = [
    "All",
    ...Array.from(new Set(libraryQuestions.map((question) => question.category).filter(Boolean)))
  ];

  const filteredMakeupQuestions =
    makeupCategoryFilter === "All"
      ? libraryQuestions
      : libraryQuestions.filter((question) => question.category === makeupCategoryFilter);

  if (!classData) {
    return <div style={{ padding: 30 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 30, maxWidth: 1400, margin: "0 auto" }}>
      <h1>{classData?.className || classData?.name || "Class Dashboard"}</h1>

      <div
        style={{
          marginBottom: 25,
          padding: 15,
          background: "#e7f5ff",
          borderRadius: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "#555" }}>Join Code</div>
          <div style={{ fontSize: 28, fontWeight: "bold" }}>{classData?.joinCode || "-"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
            {questionIdentity.title || "No active question"}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(classData?.joinCode || "");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copied" : "Copy Code"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginBottom: 25,
          padding: 16,
          background: "#f8f9fa",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", marginBottom: 2 }}>Assessment Language</div>
          <div style={{ fontSize: 13, color: "#666" }}>
            Feedback, question text, and prompts follow this setting.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={teacherLanguage}
            onChange={(event) => saveTeacherLanguage(event.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              fontSize: 14,
              background: "white",
              cursor: "pointer"
            }}
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          {langSaved && (
            <span style={{ color: "#2f9e44", fontWeight: "600", fontSize: 13 }}>Saved</span>
          )}
        </div>
      </div>

      <div
        style={{
          marginBottom: 25,
          padding: 14,
          background: "#fff4e6",
          border: "1px solid #ffd8a8",
          borderRadius: 10,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          fontSize: 14
        }}
      >
        <div><strong>Phase:</strong> {sessionStatus.phase}</div>
        <div><strong>Question:</strong> {sessionStatus.questionOpen ? "Open" : "Closed"}</div>
        <div><strong>Session:</strong> {sessionStatus.hasActiveSession ? "Active" : "None"}</div>
        <div>
          <strong>Response Window:</strong>{" "}
          {sessionStatus.windowEnd
            ? `${Math.ceil(sessionStatus.remainingMs / 60000)} min remaining`
            : "Not running"}
        </div>
      </div>

      <div style={{ marginBottom: 25 }}>
        <h3>Presentation</h3>
        <button
          onClick={startPresentation}
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "none",
            background: "#2f9e44",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            marginRight: 10
          }}
        >
          Start Presentation
        </button>
        <button
          onClick={stopPresentation}
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "none",
            background: "#c92a2a",
            color: "white",
            cursor: "pointer"
          }}
        >
          Stop
        </button>
      </div>

      <div style={{ marginBottom: 25 }}>
        <h3>Lesson Phase</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Instruction", phase: "instruction" },
            { label: "Recording", phase: "recording" },
            { label: "Discussion", phase: "discussion" },
            { label: "Reflection", phase: "reflection" }
          ].map(({ label, phase }) => (
            <button
              key={phase}
              onClick={() => setPhase(phase)}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                background: classData?.classPhase === phase ? "#228be6" : "#f1f3f5",
                color: classData?.classPhase === phase ? "white" : "#333"
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 25 }}>
        <h3>Slide Controls</h3>
        <button onClick={prevSlide} style={{ marginRight: 8 }}>
          Prev Slide
        </button>
        <button onClick={nextSlide}>Next Slide</button>
      </div>

      <div style={{ marginBottom: 25 }}>
        <h3>Lesson Controls</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate(`/question-library?classId=${classId}`)}
            style={controlBtn("#228be6")}
          >
            Library
          </button>
          <button
            onClick={restartQuestionForStudents}
            disabled={!questionIdentity.text}
            style={controlBtn("#0ca678", !questionIdentity.text)}
          >
            Restart Question
          </button>
          <button
            onClick={openQuestion}
            disabled={classData?.questionOpen}
            style={controlBtn("#40c057", classData?.questionOpen)}
          >
            Open
          </button>
          <button
            onClick={closeQuestion}
            disabled={!classData?.questionOpen}
            style={controlBtn("#fa5252", !classData?.questionOpen)}
          >
            Close
          </button>
          <button
            onClick={() => reopenSession(sessionId)}
            disabled={!sessionId}
            style={controlBtn("#fab005", !sessionId)}
          >
            Reopen
          </button>
        </div>
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f1f3f5",
            borderRadius: 8,
            fontSize: 20,
            lineHeight: 1.5,
            color: "#555"
          }}
        >
          <strong>Current question:</strong>
          <div style={{ marginTop: 8, fontWeight: 700, color: "#111" }}>
            {questionIdentity.title || "No active question title"}
          </div>
          <div style={{ marginTop: 6 }}>
            {questionIdentity.text || "Open the library to assign a question."}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 25, padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Missed Question Assignment</h3>
          <button
            onClick={() => setShowMakeupPanel((prev) => !prev)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: showMakeupPanel ? "#e9ecef" : "#228be6",
              color: showMakeupPanel ? "#333" : "white",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            {showMakeupPanel ? "Hide" : "Set Up"}
          </button>
        </div>

        {showMakeupPanel && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "600", marginBottom: 8 }}>Step 1: Choose question</div>
              {selectedMakeupQuestion ? (
                <div style={{ padding: 12, background: "#e7f5ff", borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: "bold", fontSize: 13, color: "#1864ab" }}>
                    {selectedMakeupQuestion.category}
                  </div>
                  <div style={{ marginTop: 4 }}>{selectedMakeupQuestion.text}</div>
                </div>
              ) : null}

              <button
                onClick={() => setShowLibraryPicker((prev) => !prev)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid #228be6",
                  background: "white",
                  color: "#228be6",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                {showLibraryPicker ? "Hide Library" : "Browse Question Library"}
              </button>

              {showLibraryPicker && (
                <div
                  style={{
                    marginTop: 12,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 12,
                    maxHeight: 320,
                    overflowY: "auto"
                  }}
                >
                  <div style={{ marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {makeupCategories.map((categoryName) => (
                      <button
                        key={categoryName}
                        onClick={() => setMakeupCategoryFilter(categoryName)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 20,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          background:
                            makeupCategoryFilter === categoryName ? "#228be6" : "#e9ecef",
                          color: makeupCategoryFilter === categoryName ? "white" : "#333"
                        }}
                      >
                        {categoryName}
                      </button>
                    ))}
                  </div>
                  {filteredMakeupQuestions.map((question, index) => (
                    <div
                      key={question.id || `${question.text}-${index}`}
                      onClick={() => {
                        setSelectedMakeupQuestion(question);
                        setShowLibraryPicker(false);
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        marginBottom: 8,
                        cursor: "pointer",
                        border: "1px solid #e9ecef",
                        background: "white"
                      }}
                    >
                      <div style={{ fontWeight: "600", fontSize: 12, color: "#1864ab" }}>
                        {question.category}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 14 }}>{question.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "600", marginBottom: 8 }}>Step 2: Select students</div>
              {roster.length === 0 ? (
                <div style={{ color: "#999", fontSize: 13 }}>No students on roster yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {roster.map((studentRow) => (
                    <label key={studentRow.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={makeupStudents.includes(studentRow.name)}
                        onChange={() =>
                          setMakeupStudents((prev) =>
                            prev.includes(studentRow.name)
                              ? prev.filter((name) => name !== studentRow.name)
                              : [...prev, studentRow.name]
                          )
                        }
                      />
                      {studentRow.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={assignMakeup}
              disabled={!selectedMakeupQuestion || makeupStudents.length === 0}
              style={{
                padding: "10px 18px",
                borderRadius: 6,
                border: "none",
                background:
                  !selectedMakeupQuestion || makeupStudents.length === 0 ? "#dee2e6" : "#2f9e44",
                color: "white",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Assign Missed Question
            </button>

            {makeupAssigned && (
              <div style={{ marginTop: 10, color: "#2f9e44", fontWeight: "600" }}>
                Assignment sent.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("live")} style={tabBtn("live")}>
          Live
        </button>
        <button onClick={() => setActiveTab("thinking")} style={tabBtn("thinking")}>
          Thinking
        </button>
        <button onClick={() => setActiveTab("analytics")} style={tabBtn("analytics")}>
          Analytics
        </button>
        <button onClick={() => setActiveTab("tools")} style={tabBtn("tools")}>
          Tools
        </button>
        <button onClick={() => setActiveTab("gradebook")} style={tabBtn("gradebook")}>
          Gradebook
        </button>
      </div>

      {activeTab === "live" && (
        <div>
          <h3>Live Classroom</h3>
          <div style={{ marginBottom: 10, fontWeight: "bold" }}>
            {recordingState === "active" && "Recording in progress"}
            {recordingState === "extended" && "Shared timer ended - students can still respond"}
            {recordingState === "waiting" && "Recording not active"}
          </div>
          <SubmissionProgressPanel responses={responses} />
          <RecordingTickerPanel responses={responses} />
          <LiveResponseGrid classId={classId} responses={responses} />
          <QuestionStatusPanel classData={classData} responses={responses} />
        </div>
      )}

      {activeTab === "thinking" && (
        <div>
          <h3>Student Thinking</h3>
          <LiveTranscriptFeed responses={responses} />
          <ReasoningHighlightsPanel responses={responses} />
          <ThinkingPatternsPanel responses={responses} />
          <CounterargumentPanel responses={responses} />
        </div>
      )}

     {activeTab === "analytics" && (
  <div>
    <h3>Analytics and Insights</h3>
    <AnalyticsSummary analytics={analytics} responses={responses} />
    <ReasoningAnalyticsPanel responses={responses} />
    <ReasoningHeatmapPanel responses={responses} />
    <DominantReasoningThemes analytics={analytics} responses={responses} />
    <ReasoningGapDetector analytics={analytics} responses={responses} />
  </div>
)}

      {activeTab === "tools" && (
        <div>
          <h3>Teacher Tools</h3>
          <TeacherPromptEngine prompts={prompts} />
          <SuggestedResponsesPanel responses={responses} />
          <TeacherSpotlightPanel responses={responses} />
          <TeacherTimelinePanel responses={responses} />
        </div>
      )}

      {activeTab === "gradebook" && (
        <div>
          <h3>Gradebook</h3>
          <GradebookPanel
            responses={allResponses}
            sessions={sessions}
            onDeleteResponse={handleDeleteResponse}
          />
        </div>
      )}
    </div>
  );
}
