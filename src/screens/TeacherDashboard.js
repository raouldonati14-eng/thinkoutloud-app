import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  getDocs,
  where,
  serverTimestamp
} from "firebase/firestore";

import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import questionsData from "../data/questions.json";

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
import GradebookPanel from "../components/teacher/GradebookPanel";

import { useRecordingState } from "../utils/useRecordingState";
import { buildQuestionPrompts } from "../utils/questionPrompts";

/* -------- CONSTANTS -------- */
const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  zh: "中文",
  ar: "العربية",
  vi: "Tiếng Việt",
  tl: "Tagalog",
  ko: "한국어",
  ru: "Русский",
  it: "Italiano"
};
export default function TeacherDashboard({ classId }) {
  const navigate = useNavigate();

  // 🔹 STATE
  const [classData, setClassData] = useState(null);
  const { recordingState } = useRecordingState(classData || {});
  const [responses, setResponses] = useState([]);
  const [allResponses, setAllResponses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("live");

  // 🔹 LANGUAGE STATE
  const [teacherLanguage, setTeacherLanguage] = useState("en");
  const [langSaved, setLangSaved] = useState(false);

  // 🔹 MAKE-UP STATE
  const [roster, setRoster] = useState([]);
  const [makeupStudents, setMakeupStudents] = useState([]);
  const [makeupAssigned, setMakeupAssigned] = useState(false);
  const [showMakeupPanel, setShowMakeupPanel] = useState(false);

  // 🔹 QUESTION LIBRARY STATE
  const [libraryQuestions, setLibraryQuestions] = useState([]);
  const [selectedMakeupQuestion, setSelectedMakeupQuestion] = useState(null);
  const [makeupCategoryFilter, setMakeupCategoryFilter] = useState("All");
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  // 🔹 CLASS LISTENER
  useEffect(() => {
    if (!classId) return;
    const classRef = doc(db, "classes", classId);
    const unsubscribe = onSnapshot(classRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setClassData({ ...data });
      if (data.teacherLanguage) setTeacherLanguage(data.teacherLanguage);
    });
    return () => unsubscribe();
  }, [classId]);

  // 🔹 SESSIONS
  useEffect(() => {
    if (!classId) return;
    const sessionsRef = collection(db, "classes", classId, "sessions");
    const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setSessions(list);
      if (!selectedSession && list.length > 0) {
        setSelectedSession(list[0].id);
      }
    });
    return () => unsubscribe();
  }, [classId]);

  // 🔹 SESSION ID — use selected session or active session
  const sessionId = classData?.activeSessionId || selectedSession;

  // 🔹 RESPONSES (current session)
  useEffect(() => {
    if (!classId || !sessionId) return;
    const responsesRef = query(
      collection(db, "classes", classId, "sessions", sessionId, "responses"),
      orderBy("updatedAt", "desc"),
      limit(50)
    );
    const unsubscribe = onSnapshot(responsesRef, (snapshot) => {
      if (!snapshot) return;
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt || 0;
        const bTime = b.updatedAt || b.createdAt || 0;
        return bTime - aTime;
      });
      setResponses(list);
    });
    return () => unsubscribe();
  }, [classId, sessionId]);

  // 🔹 ALL RESPONSES (for gradebook — across all sessions)
  useEffect(() => {
    if (!classId || sessions.length === 0) return;

    const unsubscribers = [];
    const responsesBySession = {};

    sessions.forEach(session => {
      const ref = collection(
        db, "classes", classId, "sessions", session.id, "responses"
      );
      const unsub = onSnapshot(ref, (snapshot) => {
        responsesBySession[session.id] = snapshot.docs.map(doc => ({
          id: doc.id,
          sessionId: session.id,
          questionText: session.questionText,
          category: session.category,
          ...doc.data()
        }));
        // flatten all sessions into one array
        setAllResponses(Object.values(responsesBySession).flat());
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [classId, sessions]);

  // 🔹 ROSTER
  useEffect(() => {
    if (!classId) return;
    const rosterRef = collection(db, "classes", classId, "roster");
    const unsubscribe = onSnapshot(rosterRef, (snapshot) => {
      setRoster(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [classId]);

  // 🔹 QUESTION LIBRARY
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const unsubscribeSnapshot = onSnapshot(
        collection(db, "questions"),
        (snapshot) => {
          const firestoreQuestions = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data()
          }));
          const merged = [
            ...firestoreQuestions,
            ...questionsData.filter(q =>
              !firestoreQuestions.some(fq => fq.text === q.text)
            )
          ];
          setLibraryQuestions(merged);
        }
      );
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, []);

  // 🔹 ANALYTICS
  const generateLiveAnalytics = (responses) => {
    let strong = 0, partial = 0, support = 0;
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
      db, "classes", classId, "sessions", sessionId, "analytics", "liveStats"
    );
    setDoc(analyticsRef, generateLiveAnalytics(responses), { merge: true });
  }, [responses, classId, sessionId]);

  useEffect(() => {
    if (!classId || !sessionId) return;
    const analyticsRef = doc(
      db, "classes", classId, "sessions", sessionId, "analytics", "liveStats"
    );
    const unsubscribe = onSnapshot(analyticsRef, (snap) => {
      if (snap.exists()) setAnalytics(snap.data());
    });
    return () => unsubscribe();
  }, [classId, sessionId]);

  // 🔹 PROMPTS
  useEffect(() => {
    if (!classId || !sessionId) return;
    const ref = doc(
      db, "classes", classId, "sessions", sessionId, "intelligence", "prompts"
    );
    const unsubscribe = onSnapshot(ref, (snap) => {
      setPrompts(snap.exists() ? snap.data()?.prompts || [] : []);
    });
    return () => unsubscribe();
  }, [classId, sessionId]);

  // 🌐 SAVE TEACHER LANGUAGE
  const saveTeacherLanguage = async (lang) => {
    setTeacherLanguage(lang);
    try {
      await updateDoc(doc(db, "classes", classId), { teacherLanguage: lang });
      setLangSaved(true);
      setTimeout(() => setLangSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save language:", err);
    }
  };

  // 🔹 PHASE CONTROL
  const setPhase = async (phase) => {
    if (!classId) return;
    try {
      const classRef = doc(db, "classes", classId);
      let updateData = {
        classPhase: phase,
        updatedAt: Date.now(),
        lessonLocked: phase === "instruction"
      };

      if (phase === "instruction") {
        updateData.instructionText =
          "Explain your reasoning clearly. Use evidence and complete sentences.";
        updateData.instructionVisible = true;
        updateData.questionOpen = false;
        updateData.activeSessionId = null;
      }

      if (phase === "recording") {
        let sid = classData?.activeSessionId;
        if (!sid) {
          const sessionRef = doc(collection(db, "classes", classId, "sessions"));
          await setDoc(sessionRef, { createdAt: Date.now(), startedAt: Date.now() });
          sid = sessionRef.id;
        }
        updateData.activeSessionId = sid;
        updateData.recording = { startTime: serverTimestamp(), durationMs: 60000 };
        updateData.questionOpen = true;
        updateData.slideIndex = 0;
      }

      const eq = classData?.essentialQuestion || "this question";
      if (phase === "discussion") {
        updateData.discussionPrompts = [
          `How did you approach "${eq}"?`,
          `What evidence supports your answer to "${eq}"?`,
          `Did anyone think about "${eq}" differently?`
        ];
      }
      if (phase === "reflection") {
        updateData.reflectionPrompts = [
          `Has your thinking about "${eq}" changed? Why?`,
          `What was most challenging about "${eq}"?`,
          `What helped you better understand "${eq}"?`
        ];
      }
      if (phase !== "recording") {
        updateData.questionOpen = false;
        updateData.recordingEndsAt = null;
      }

      await setDoc(classRef, updateData, { merge: true });

      // switch tab to match phase
      const phaseToTab = {
        instruction: "tools",
        recording: "live",
        discussion: "thinking",
        reflection: "analytics"
      };
      if (phaseToTab[phase]) setActiveTab(phaseToTab[phase]);

    } catch (err) {
      console.error("❌ SET PHASE ERROR:", err);
    }
  };

  const startPresentation = async () => {
    try {
      await setDoc(doc(db, "classes", classId), {
        presentationMode: true, classPhase: "discussion", slideIndex: 0
      }, { merge: true });
    } catch (err) { console.error(err); }
  };

  const stopPresentation = async () => {
    try {
      await setDoc(doc(db, "classes", classId), {
        presentationMode: false
      }, { merge: true });
    } catch (err) { console.error(err); }
  };

  const nextSlide = async () => {
    try {
      const current = classData?.slideIndex || 0;
      const maxSlides = classData?.classPhase === "discussion"
        ? classData?.discussionPrompts?.length || 0
        : classData?.reflectionPrompts?.length || 0;
      const next = maxSlides > 0 ? Math.min(current + 1, maxSlides - 1) : current + 1;
      await setDoc(doc(db, "classes", classId), { slideIndex: next }, { merge: true });
    } catch (err) { console.error(err); }
  };

  const prevSlide = async () => {
    try {
      const current = classData?.slideIndex || 0;
      await setDoc(doc(db, "classes", classId),
        { slideIndex: Math.max(current - 1, 0) }, { merge: true });
    } catch (err) { console.error(err); }
  };

  const openQuestion = async () => {
    try {
      await updateDoc(doc(db, "classes", classId), { questionOpen: true });
    } catch (err) { console.error(err); }
  };

  const closeQuestion = async () => {
    try {
      await updateDoc(doc(db, "classes", classId), {
        questionOpen: false, slideIndex: 0
      });
    } catch (err) { console.error(err); }
  };

  const reopenSession = async (sessionIdToReopen) => {
    try {
      await updateDoc(doc(db, "classes", classId), {
        activeSessionId: sessionIdToReopen,
        questionOpen: true,
        classPhase: "instruction"
      });
      setSelectedSession(sessionIdToReopen);
    } catch (err) { console.error(err); }
  };

  // 🔹 ASSIGN MAKE-UP
  const assignMakeup = async () => {
    if (!selectedMakeupQuestion) {
      alert("Please select a question from the library first.");
      return;
    }
    if (makeupStudents.length === 0) {
      alert("Please select at least one student.");
      return;
    }
    try {
      const prompts = buildQuestionPrompts(
        selectedMakeupQuestion.text,
        selectedMakeupQuestion.category
      );
      await setDoc(doc(db, "classes", classId, "makeup", "assignment"), {
        questionText: selectedMakeupQuestion.text,
        category: selectedMakeupQuestion.category,
        discussionPrompts: prompts.discussionPrompts,
        reflectionPrompts: prompts.reflectionPrompts,
        assignedTo: makeupStudents,
        assignedAt: Date.now(),
        open: true
      });
      setMakeupAssigned(true);
      setMakeupStudents([]);
      setSelectedMakeupQuestion(null);
      setShowLibraryPicker(false);
      setTimeout(() => setMakeupAssigned(false), 3000);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to assign make-up");
    }
  };

  // 🔹 STYLE HELPERS
  const controlBtn = (color, disabled = false) => ({
    padding: "10px 14px", borderRadius: 6, border: "none",
    background: disabled ? "#dee2e6" : color,
    color: "white", fontWeight: "600",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1
  });

  const tabBtn = (tab) => ({
    padding: "9px 16px", borderRadius: 6, border: "none",
    cursor: "pointer", fontWeight: "600", fontSize: 14,
    background: activeTab === tab ? "#228be6" : "#f1f3f5",
    color: activeTab === tab ? "white" : "#333"
  });

  const makeupCategories = [
    "All",
    ...Array.from(new Set(libraryQuestions.map(q => q.category).filter(Boolean)))
  ];

  const filteredMakeupQuestions = makeupCategoryFilter === "All"
    ? libraryQuestions
    : libraryQuestions.filter(q => q.category === makeupCategoryFilter);

  if (!classData) {
    return <div style={{ padding: 30 }}>Loading...</div>;
  }

  return (
    <>
      <div style={{ padding: 30, maxWidth: 1400, margin: "0 auto" }}>
        <style>{`
          @keyframes fadeSlide {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <h1>{classData?.className || classData?.name || ""}</h1>

        {/* JOIN CODE */}
        <div style={{
          marginBottom: 25, padding: 15, background: "#e7f5ff",
          borderRadius: 10, display: "flex", justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: 13, color: "#555" }}>Join Code</div>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>
              {classData?.joinCode || "—"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
              {classData?.category &&
                `${classData.category} · Lesson ${classData.currentLesson || 1}`}
            </div>
            <button onClick={() => {
              navigator.clipboard.writeText(classData?.joinCode || "");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}>
              {copied ? "✅ Copied!" : "Copy Code"}
            </button>
          </div>
        </div>

        {/* 🌐 ASSESSMENT LANGUAGE */}
        <div style={{
          marginBottom: 25, padding: 16, background: "#f8f9fa",
          borderRadius: 10, display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 12
        }}>
          <div>
            <div style={{ fontWeight: "bold", marginBottom: 2 }}>
              🌐 Assessment Language
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>
              AI feedback will be written in this language for all students
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              value={teacherLanguage}
              onChange={(e) => saveTeacherLanguage(e.target.value)}
              style={{
                padding: "8px 12px", borderRadius: 6,
                border: "1px solid #ddd", fontSize: 14,
                background: "white", cursor: "pointer"
              }}
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            {langSaved && (
              <span style={{ color: "#2f9e44", fontWeight: "600", fontSize: 13 }}>
                ✅ Saved
              </span>
            )}
          </div>
        </div>

        {/* 🎬 PRESENTATION */}
        <div style={{ marginBottom: 25 }}>
          <h3>🎬 Presentation</h3>
          <button onClick={startPresentation} style={{
            padding: "12px 16px", borderRadius: 8, border: "none",
            background: "#2f9e44", color: "white", fontWeight: "bold",
            cursor: "pointer", marginRight: 10
          }}>
            ▶️ Start Presentation
          </button>
          <button onClick={stopPresentation} style={{
            padding: "12px 16px", borderRadius: 8, border: "none",
            background: "#c92a2a", color: "white", cursor: "pointer"
          }}>
            ⏹ Stop
          </button>
          <div style={{
            marginTop: 10, fontWeight: "bold",
            color: classData?.presentationMode ? "#2f9e44" : "#666"
          }}>
            Mode: {classData?.presentationMode ? "🎬 Presentation" : "🧑‍🏫 Normal"}
          </div>
        </div>

        {/* LESSON PHASE */}
        <div style={{ marginBottom: 25 }}>
          <h3>Lesson Phase</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "📘 Instruction", phase: "instruction" },
              { label: "🎤 Recording", phase: "recording" },
              { label: "💬 Discussion", phase: "discussion" },
              { label: "🪞 Reflection", phase: "reflection" }
            ].map(({ label, phase }) => (
              <button
                key={phase}
                onClick={() => setPhase(phase)}
                style={{
                  padding: "10px 14px", borderRadius: 6, border: "none",
                  cursor: "pointer", fontWeight: "600",
                  background: classData?.classPhase === phase ? "#228be6" : "#f1f3f5",
                  color: classData?.classPhase === phase ? "white" : "#333"
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* SLIDE CONTROLS */}
        <div style={{ marginBottom: 25 }}>
          <h3>🖥 Slide Controls</h3>
          <button onClick={prevSlide} style={{ marginRight: 8 }}>⬅️ Prev</button>
          <button onClick={nextSlide}>➡️ Next</button>
          <span style={{ marginLeft: 12, fontSize: 13, color: "#888" }}>
            Slide {(classData?.slideIndex || 0) + 1}
          </span>
        </div>

        {/* LESSON CONTROLS */}
        <div style={{ marginBottom: 25 }}>
          <h3>🎯 Lesson Controls</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/question-library", { state: { classId } })}
              style={controlBtn("#228be6")}
            >
              📚 Library
            </button>
            <button
              onClick={openQuestion}
              disabled={classData?.questionOpen}
              style={controlBtn("#40c057", classData?.questionOpen)}
            >
              🔓 Open
            </button>
            <button
              onClick={closeQuestion}
              disabled={!classData?.questionOpen}
              style={controlBtn("#fa5252", !classData?.questionOpen)}
            >
              🔒 Close
            </button>
            <button
              onClick={() => {
                if (!sessionId) return alert("No session selected");
                reopenSession(sessionId);
              }}
              style={controlBtn("#fab005")}
            >
              🔁 Reopen
            </button>
          </div>

          {classData?.essentialQuestion && (
            <div style={{
              marginTop: 12, padding: 12,
              background: "#f1f3f5", borderRadius: 8,
              fontSize: 13, color: "#555"
            }}>
              <strong>Current question:</strong> {classData.essentialQuestion}
            </div>
          )}
        </div>

        {/* 📝 MAKE-UP PANEL */}
        <div style={{
          marginBottom: 25, padding: 20,
          border: "1px solid #ddd", borderRadius: 10
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>📝 Make-Up Assignment</h3>
            <button
              onClick={() => setShowMakeupPanel(prev => !prev)}
              style={{
                padding: "6px 12px", borderRadius: 6, border: "none",
                background: showMakeupPanel ? "#e9ecef" : "#228be6",
                color: showMakeupPanel ? "#333" : "white",
                cursor: "pointer", fontWeight: "600"
              }}
            >
              {showMakeupPanel ? "Hide" : "Set Up"}
            </button>
          </div>

          {showMakeupPanel && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: "600", marginBottom: 8 }}>
                  Step 1: Choose a question
                </div>

                {selectedMakeupQuestion ? (
                  <div style={{
                    padding: 12, background: "#e7f5ff",
                    borderRadius: 8, marginBottom: 8
                  }}>
                    <div style={{ fontWeight: "bold", fontSize: 13, color: "#1864ab" }}>
                      {selectedMakeupQuestion.category}
                      {selectedMakeupQuestion.lesson &&
                        ` · Lesson ${selectedMakeupQuestion.lesson}`}
                    </div>
                    <div style={{ marginTop: 4 }}>{selectedMakeupQuestion.text}</div>
                    <button
                      onClick={() => {
                        setSelectedMakeupQuestion(null);
                        setShowLibraryPicker(true);
                      }}
                      style={{
                        marginTop: 8, padding: "4px 10px", borderRadius: 6,
                        border: "none", background: "#228be6", color: "white",
                        fontSize: 12, cursor: "pointer"
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLibraryPicker(prev => !prev)}
                    style={{
                      padding: "8px 14px", borderRadius: 6,
                      border: "1px solid #228be6", background: "white",
                      color: "#228be6", fontWeight: "600", cursor: "pointer"
                    }}
                  >
                    📚 {showLibraryPicker ? "Hide Library" : "Browse Question Library"}
                  </button>
                )}

                {showLibraryPicker && !selectedMakeupQuestion && (
                  <div style={{
                    marginTop: 12, border: "1px solid #ddd",
                    borderRadius: 8, padding: 12,
                    maxHeight: 320, overflowY: "auto"
                  }}>
                    <div style={{ marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {makeupCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setMakeupCategoryFilter(cat)}
                          style={{
                            padding: "4px 10px", borderRadius: 20,
                            border: "none", cursor: "pointer", fontSize: 12,
                            background: makeupCategoryFilter === cat ? "#228be6" : "#e9ecef",
                            color: makeupCategoryFilter === cat ? "white" : "#333"
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {filteredMakeupQuestions.map((q, i) => (
                      <div
                        key={q.id || `${q.text}-${i}`}
                        onClick={() => {
                          setSelectedMakeupQuestion(q);
                          setShowLibraryPicker(false);
                        }}
                        style={{
                          padding: "10px 12px", borderRadius: 8,
                          marginBottom: 8, cursor: "pointer",
                          border: "1px solid #e9ecef", background: "white"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f1f3f5"}
                        onMouseLeave={e => e.currentTarget.style.background = "white"}
                      >
                        <div style={{ fontWeight: "600", fontSize: 12, color: "#1864ab" }}>
                          {q.category}
                          {q.lesson && ` · Lesson ${q.lesson}`}
                          {q.createdBy && " 🧑‍🏫"}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 14 }}>{q.text}</div>
                      </div>
                    ))}

                    {filteredMakeupQuestions.length === 0 && (
                      <div style={{ color: "#999", fontSize: 13 }}>
                        No questions in this category.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: "600", marginBottom: 8 }}>
                  Step 2: Select absent students
                </div>
                {roster.length === 0 ? (
                  <div style={{ color: "#999", fontSize: 13 }}>
                    No students on roster yet.
                  </div>
                ) : (
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    maxHeight: 200, overflowY: "auto"
                  }}>
                    {roster.map(s => (
                      <label key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 8
                      }}>
                        <input
                          type="checkbox"
                          checked={makeupStudents.includes(s.name)}
                          onChange={() => {
                            setMakeupStudents(prev =>
                              prev.includes(s.name)
                                ? prev.filter(n => n !== s.name)
                                : [...prev, s.name]
                            );
                          }}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={assignMakeup}
                disabled={!selectedMakeupQuestion || makeupStudents.length === 0}
                style={{
                  padding: "10px 18px", borderRadius: 6, border: "none",
                  background: (!selectedMakeupQuestion || makeupStudents.length === 0)
                    ? "#dee2e6" : "#2f9e44",
                  color: "white", fontWeight: "600", cursor: "pointer"
                }}
              >
                ✅ Assign Make-Up
              </button>

              {makeupAssigned && (
                <div style={{ marginTop: 10, color: "#2f9e44", fontWeight: "600" }}>
                  ✅ Make-up assigned successfully!
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🔥 VIEW TABS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => setActiveTab("live")} style={tabBtn("live")}>
            📡 Live
          </button>
          <button onClick={() => setActiveTab("thinking")} style={tabBtn("thinking")}>
            🧠 Thinking
          </button>
          <button onClick={() => setActiveTab("analytics")} style={tabBtn("analytics")}>
            📊 Analytics
          </button>
          <button onClick={() => setActiveTab("tools")} style={tabBtn("tools")}>
            🎯 Tools
          </button>
          <button onClick={() => setActiveTab("gradebook")} style={tabBtn("gradebook")}>
            📋 Gradebook
          </button>
        </div>

        {/* CONTENT */}
        <div key={activeTab} style={{ animation: "fadeSlide 0.3s ease" }}>

          {activeTab === "live" && (
            <div>
              <h3>📡 Live Classroom</h3>
              <div style={{ marginBottom: 10, fontWeight: "bold" }}>
                {recordingState === "active" && "🎤 Recording in progress"}
                {recordingState === "extended" &&
                  "⏱ Recording ended — students can still respond"}
                {recordingState === "waiting" && "⏸ Recording not active"}
              </div>
              <SubmissionProgressPanel responses={responses} />
              <RecordingTickerPanel responses={responses} />
              <LiveResponseGrid responses={responses} />
              <QuestionStatusPanel responses={responses} />
            </div>
          )}

          {activeTab === "thinking" && (
            <div>
              <h3>🧠 Student Thinking</h3>
              <LiveTranscriptFeed responses={responses} />
              <ReasoningHighlightsPanel responses={responses} />
              <ThinkingPatternsPanel responses={responses} />
              <CounterargumentPanel responses={responses} />
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <h3>📊 Analytics & Insights</h3>
              <AnalyticsSummary analytics={analytics} />
              <ReasoningAnalyticsPanel classId={classId} sessionId={sessionId} />
              <ReasoningHeatmapPanel responses={responses} />
              <DominantReasoningThemes analytics={analytics} />
              <ReasoningGapDetector analytics={analytics} />
            </div>
          )}

          {activeTab === "tools" && (
            <div>
              <h3>🎯 Teacher Tools</h3>
              <TeacherPromptEngine prompts={prompts} />
              <SuggestedResponsesPanel responses={responses} />
              <TeacherSpotlightPanel responses={responses} />
              <TeacherTimelinePanel responses={responses} />
            </div>
          )}

          {activeTab === "gradebook" && (
            <div>
              <h3>📋 Gradebook</h3>
              <GradebookPanel
                responses={allResponses}
                sessions={sessions}
              />
            </div>
          )}

        </div>
      </div>
    </>
  );
}