import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  writeBatch,
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

const getTimestamp = (item) => {
  const ts = item?.updatedAt || item?.completedAt || item?.createdAt;

  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts === "number") return ts;

  return 0;
};

const normalizeStudentName = (name = "") =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

const buildRosterDocId = (name = "") => name.replace(/\s+/g, "_");

const getSessionLabel = (session) => {
  const questionText = session?.questionText || "Untitled session";
  const createdAt = getTimestamp(session);
  const dateLabel = createdAt ? new Date(createdAt).toLocaleString() : "No date";
  const shortQuestion =
    questionText.length > 72 ? `${questionText.slice(0, 69).trim()}...` : questionText;

  return `${dateLabel} — ${shortQuestion}`;
};

const getRosterStudentKey = (studentRow = {}) =>
  studentRow.studentKey || studentRow.id || studentRow.name;

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
  const [isArchivingPractice, setIsArchivingPractice] = useState(false);
  const [isClearingRoster, setIsClearingRoster] = useState(false);
  const [showArchivedData, setShowArchivedData] = useState(false);
  const [resetClassStateOnReset, setResetClassStateOnReset] = useState(true);
  const [rosterDrafts, setRosterDrafts] = useState({});
  const [mergeSourceName, setMergeSourceName] = useState("");
  const [mergeTargetName, setMergeTargetName] = useState("");
  const [isUpdatingRoster, setIsUpdatingRoster] = useState(false);
  const [isUpdatingSessionArchive, setIsUpdatingSessionArchive] = useState(false);
  const [isRestoringPractice, setIsRestoringPractice] = useState(false);
  const [recordingEntries, setRecordingEntries] = useState([]);
  const [moderationEvents, setModerationEvents] = useState([]);
  const [studentNotes, setStudentNotes] = useState([]);
  const [studentNoteDrafts, setStudentNoteDrafts] = useState({});
  const [isSavingStudentNote, setIsSavingStudentNote] = useState(false);

  const { recordingState } = useRecordingState(classData || {});
  const sessionId = classData?.activeSessionId || selectedSession || null;
  const questionIdentity = resolveQuestionIdentity(classData || {});
  const sessionStatus = getSessionStatusSummary(classData || {});

  useEffect(() => {
    if (!classId) return;

    const classRef = doc(db, "classes", classId);
    const unsubscribe = onSnapshot(
      classRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const nextData = snapshot.data();
        setClassData(nextData);
        setTeacherLanguage(nextData?.teacherLanguage || "en");
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    const sessionsRef = collection(db, "classes", classId, "sessions");

    const unsubscribe = onSnapshot(
      sessionsRef,
      (snapshot) => {
        const list = snapshot.docs
          .map((sessionDoc) => ({ id: sessionDoc.id, ...sessionDoc.data() }))
          .sort((a, b) => getTimestamp(b) - getTimestamp(a));
        setSessions(list);

        if (!selectedSession && list.length > 0) {
          setSelectedSession(list[0].id);
        }
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

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
      .filter((response) => showArchivedData || (!response.archived && !response.archivedAt))
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));

    setResponses(list);
  },
  (error) => {
    console.error("Error fetching responses:", error);
  }
);
    return () => unsubscribe();
  }, [classId, sessionId, showArchivedData]);

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
      .filter((response) => showArchivedData || (!response.archived && !response.archivedAt))
      .sort((a, b) => getTimestamp(b) - getTimestamp(a)); // optional but recommended

    setAllResponses(list);
  },
  (error) => {
    console.error("Error fetching all responses:", error);
  }
);
    return () => unsubscribe();
  }, [classId, showArchivedData]);

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
    const unsubscribe = onSnapshot(
      promptsRef,
      (snapshot) => {
        setPrompts(snapshot.exists() ? snapshot.data()?.prompts || [] : []);
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [classId, sessionId]);

  useEffect(() => {
    if (!classId || !sessionId) {
      setRecordingEntries([]);
      return;
    }

    const recordingRef = collection(db, "classes", classId, "sessions", sessionId, "recording");
    const unsubscribe = onSnapshot(
      recordingRef,
      (snapshot) => {
        setRecordingEntries(
          snapshot.docs.map((recordingDoc) => ({ id: recordingDoc.id, ...recordingDoc.data() }))
        );
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [classId, sessionId]);

  useEffect(() => {
    if (!classId) return;
    const rosterRef = collection(db, "classes", classId, "roster");
    const unsubscribe = onSnapshot(
      rosterRef,
      (snapshot) => {
        setRoster(snapshot.docs.map((rosterDoc) => ({ id: rosterDoc.id, ...rosterDoc.data() })));
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );
    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!classId) return;

    const moderationRef = collection(db, "classes", classId, "moderationEvents");
    const unsubscribe = onSnapshot(
      moderationRef,
      (snapshot) => {
        const list = snapshot.docs
          .map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data() }))
          .sort((a, b) => getTimestamp(b) - getTimestamp(a));
        setModerationEvents(list);
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    if (!classId) return;

    const notesRef = collection(db, "classes", classId, "studentNotes");
    const unsubscribe = onSnapshot(
      notesRef,
      (snapshot) => {
        const list = snapshot.docs.map((noteDoc) => ({ id: noteDoc.id, ...noteDoc.data() }));
        setStudentNotes(list);
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [classId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "questions"),
      (snapshot) => {
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
      },
      (error) => {
        console.error("Firestore listener error:", error);
      }
    );

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

  const rosterWithDrafts = useMemo(
    () =>
      roster.map((studentRow) => ({
        ...studentRow,
        draftName: rosterDrafts[studentRow.id] ?? studentRow.name ?? ""
      })),
    [roster, rosterDrafts]
  );

  const duplicateRosterGroups = useMemo(() => {
    const grouped = roster.reduce((map, studentRow) => {
      const normalized = normalizeStudentName(studentRow.name || "");
      if (!normalized) return map;
      if (!map[normalized]) {
        map[normalized] = [];
      }
      map[normalized].push(studentRow);
      return map;
    }, {});

    return Object.values(grouped).filter((group) => group.length > 1);
  }, [roster]);

  const liveSubmissionSummary = useMemo(() => {
    const latestResponseByStudent = {};

    responses.forEach((response) => {
      const keys = [
        response.studentKey,
        response.studentId,
        response.studentName
      ].filter(Boolean);

      keys.forEach((key) => {
        if (!latestResponseByStudent[key]) {
          latestResponseByStudent[key] = response;
        }
      });
    });

    const activelyRecordingKeys = new Set(
      recordingEntries.flatMap((entry) => [entry.studentKey, entry.student]).filter(Boolean)
    );

    const rows = roster.map((studentRow) => {
      const lookupKeys = [studentRow.studentKey, studentRow.id, studentRow.name].filter(Boolean);
      const matchedResponse = lookupKeys
        .map((key) => latestResponseByStudent[key])
        .find(Boolean);

      let status = "missing";
      if (lookupKeys.some((key) => activelyRecordingKeys.has(key))) {
        status = "recording";
      } else if (matchedResponse?.status === "processing") {
        status = "processing";
      } else if (matchedResponse?.status === "recorded") {
        status = "recorded";
      } else if (matchedResponse?.status === "complete") {
        status = "submitted";
      }

      return {
        id: studentRow.id,
        name: studentRow.name,
        status
      };
    });

    const counts = rows.reduce(
      (summary, row) => {
        summary[row.status] += 1;
        return summary;
      },
      {
        missing: 0,
        recording: 0,
        recorded: 0,
        processing: 0,
        submitted: 0
      }
    );

    return { rows, counts };
  }, [recordingEntries, responses, roster]);

  const studentNotesLookup = useMemo(
    () =>
      studentNotes.reduce((map, noteRow) => {
        map[noteRow.studentKey || noteRow.id] = noteRow;
        return map;
      }, {}),
    [studentNotes]
  );

  const rosterWithNotes = useMemo(
    () =>
      roster.map((studentRow) => {
        const studentKey = getRosterStudentKey(studentRow);
        const savedNote = studentNotesLookup[studentKey] || {};
        const draft = studentNoteDrafts[studentKey] || {};

        return {
          ...studentRow,
          studentKey,
          note: draft.note ?? savedNote.note ?? "",
          followUp: draft.followUp ?? Boolean(savedNote.followUp)
        };
      }),
    [roster, studentNoteDrafts, studentNotesLookup]
  );

  const flaggedStudents = useMemo(
    () => rosterWithNotes.filter((studentRow) => studentRow.followUp),
    [rosterWithNotes]
  );

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
      createdAt: serverTimestamp(),
      startedAt: serverTimestamp(),
      restartedAt: serverTimestamp(),
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
      assignedAt: serverTimestamp(),
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

  const syncAssignedStudents = async (updater) => {
    if (!classId) return;

    const makeupRef = doc(db, "classes", classId, "makeup", "assignment");
    const makeupSnap = await getDoc(makeupRef);
    if (!makeupSnap.exists()) return;

    const makeupData = makeupSnap.data();
    const assignedTo = Array.isArray(makeupData?.assignedTo) ? makeupData.assignedTo : [];
    const nextAssignedTo = updater(assignedTo);

    await setDoc(
      makeupRef,
      {
        assignedTo: nextAssignedTo,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  };

  const rewriteStudentNameAcrossResponses = async (fromName, toName) => {
    if (!classId || !fromName || !toName) return 0;

    const classResponsesRef = query(
      collection(db, "responses"),
      where("classId", "==", classId)
    );
    const snapshot = await getDocs(classResponsesRef);

    let batch = writeBatch(db);
    let ops = 0;
    let updatedCount = 0;

    for (const responseDoc of snapshot.docs) {
      const data = responseDoc.data();
      const currentStudentId = data.studentId || "";
      const currentStudentName = data.studentName || "";

      if (currentStudentId !== fromName && currentStudentName !== fromName) {
        continue;
      }

      batch.update(responseDoc.ref, {
        studentId: toName,
        studentName: toName,
        updatedAt: serverTimestamp()
      });
      ops += 1;
      updatedCount += 1;

      if (ops === 400) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    return updatedCount;
  };

  const updateArchiveStateForResponses = async ({
    sessionId: archiveSessionId = null,
    archived,
    archivedReason
  }) => {
    if (!classId) return 0;

    const constraints = [where("classId", "==", classId)];
    if (archiveSessionId) {
      constraints.push(where("sessionId", "==", archiveSessionId));
    }

    const archiveQuery = query(collection(db, "responses"), ...constraints);
    const snapshot = await getDocs(archiveQuery);

    let batch = writeBatch(db);
    let ops = 0;
    let updatedCount = 0;

    for (const responseDoc of snapshot.docs) {
      const data = responseDoc.data();
      const alreadyArchived = Boolean(data.archived || data.archivedAt);

      if (archived && alreadyArchived) {
        continue;
      }

      if (!archived && !alreadyArchived) {
        continue;
      }

      batch.update(responseDoc.ref, {
        archived,
        archivedReason: archived ? archivedReason : null,
        archivedAt: archived ? serverTimestamp() : null,
        restoredAt: archived ? null : serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      ops += 1;
      updatedCount += 1;

      if (ops === 400) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    return updatedCount;
  };

  const resetClassState = async () => {
    if (!classId) return;

    await setDoc(
      doc(db, "classes", classId),
      {
        ...buildCloseQuestionUpdate(),
        activeSessionId: null,
        questionOpen: false,
        classPhase: "instruction",
        spotlightResponseId: null,
        presentationMode: false,
        slideIndex: 0,
        recording: null,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    setSelectedSession(null);
    setActiveTab("tools");
  };

  const renameRosterStudent = async (studentRow) => {
    if (!classId || !studentRow?.name || isUpdatingRoster) return;

    const nextName = (rosterDrafts[studentRow.id] ?? studentRow.name ?? "").trim();
    if (!nextName || nextName === studentRow.name) return;

    const nameTaken = roster.some(
      (row) =>
        row.id !== studentRow.id &&
        normalizeStudentName(row.name || "") === normalizeStudentName(nextName)
    );

    if (nameTaken) {
      window.alert("That student name already exists. Use merge if these are duplicates.");
      return;
    }

    const confirmed = window.confirm(`Rename "${studentRow.name}" to "${nextName}"?`);
    if (!confirmed) return;

    setIsUpdatingRoster(true);

    try {
      const nextDocRef = doc(db, "classes", classId, "roster", buildRosterDocId(nextName));
      await setDoc(
        nextDocRef,
        {
          ...studentRow,
          name: nextName,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      if (nextDocRef.id !== studentRow.id) {
        await deleteDoc(doc(db, "classes", classId, "roster", studentRow.id));
      }

      await rewriteStudentNameAcrossResponses(studentRow.name, nextName);
      await syncAssignedStudents((assignedTo) =>
        assignedTo.map((name) => (name === studentRow.name ? nextName : name))
      );

      setRosterDrafts((prev) => {
        const next = { ...prev };
        delete next[studentRow.id];
        return next;
      });
    } catch (error) {
      console.error("Rename roster student failed:", error);
      window.alert("Could not rename this student.");
    } finally {
      setIsUpdatingRoster(false);
    }
  };

  const removeRosterStudent = async (studentRow) => {
    if (!classId || !studentRow?.id || isUpdatingRoster) return;

    const confirmed = window.confirm(
      `Remove "${studentRow.name}" from the roster? Responses will remain, but the student will no longer appear in the class roster.`
    );
    if (!confirmed) return;

    setIsUpdatingRoster(true);

    try {
      await deleteDoc(doc(db, "classes", classId, "roster", studentRow.id));
      await syncAssignedStudents((assignedTo) =>
        assignedTo.filter((name) => name !== studentRow.name)
      );
    } catch (error) {
      console.error("Remove roster student failed:", error);
      window.alert("Could not remove this student.");
    } finally {
      setIsUpdatingRoster(false);
    }
  };

  const mergeRosterStudents = async () => {
    if (!classId || !mergeSourceName || !mergeTargetName || isUpdatingRoster) return;
    if (mergeSourceName === mergeTargetName) {
      window.alert("Choose two different student names to merge.");
      return;
    }

    const sourceRow = roster.find((row) => row.name === mergeSourceName);
    const targetRow = roster.find((row) => row.name === mergeTargetName);
    if (!sourceRow || !targetRow) {
      window.alert("Both students must still be on the roster.");
      return;
    }

    const confirmed = window.confirm(
      `Merge "${mergeSourceName}" into "${mergeTargetName}"? This will move response history to the target name and remove the source roster entry.`
    );
    if (!confirmed) return;

    setIsUpdatingRoster(true);

    try {
      await rewriteStudentNameAcrossResponses(mergeSourceName, mergeTargetName);
      await syncAssignedStudents((assignedTo) =>
        Array.from(
          new Set(
            assignedTo.map((name) => (name === mergeSourceName ? mergeTargetName : name))
          )
        )
      );
      const sourceKey = getRosterStudentKey(sourceRow);
      const targetKey = getRosterStudentKey(targetRow);
      const sourceNote = studentNotesLookup[sourceKey];

      if (sourceNote) {
        await setDoc(
          doc(db, "classes", classId, "studentNotes", targetKey),
          {
            studentKey: targetKey,
            studentName: mergeTargetName,
            note: sourceNote.note || studentNotesLookup[targetKey]?.note || "",
            followUp: Boolean(sourceNote.followUp || studentNotesLookup[targetKey]?.followUp),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
        await deleteDoc(doc(db, "classes", classId, "studentNotes", sourceKey));
      }

      await deleteDoc(doc(db, "classes", classId, "roster", sourceRow.id));
      setMergeSourceName("");
      setMergeTargetName("");
    } catch (error) {
      console.error("Merge roster students failed:", error);
      window.alert("Could not merge these students.");
    } finally {
      setIsUpdatingRoster(false);
    }
  };

  const saveStudentNote = async (studentRow) => {
    if (!classId || !studentRow?.studentKey || isSavingStudentNote) return;

    const noteText = (studentRow.note || "").trim();
    const followUp = Boolean(studentRow.followUp);
    const noteRef = doc(db, "classes", classId, "studentNotes", studentRow.studentKey);

    setIsSavingStudentNote(true);

    try {
      if (!noteText && !followUp) {
        await deleteDoc(noteRef).catch(() => {});
      } else {
        await setDoc(
          noteRef,
          {
            studentKey: studentRow.studentKey,
            studentName: studentRow.name,
            note: noteText,
            followUp,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }

      setStudentNoteDrafts((prev) => {
        const next = { ...prev };
        delete next[studentRow.studentKey];
        return next;
      });
    } catch (error) {
      console.error("Save student note failed:", error);
      window.alert("Could not save this student note.");
    } finally {
      setIsSavingStudentNote(false);
    }
  };

  const archivePracticeData = async ({ skipConfirm = false } = {}) => {
    if (!classId || isArchivingPractice) return;

    if (!skipConfirm) {
      const confirmed = window.confirm(
        "Archive all current practice responses for this class? They will be hidden from the dashboard but kept in Firestore."
      );
      if (!confirmed) return;
    }

    setIsArchivingPractice(true);

    try {
      const updatedCount = await updateArchiveStateForResponses({
        archived: true,
        archivedReason: "practice"
      });

      if (updatedCount === 0) {
        window.alert("No practice responses were found for this class.");
        return;
      }

      window.alert("Practice responses archived.");
    } catch (error) {
      console.error("Archive practice data failed:", error);
      window.alert("Could not archive practice responses.");
    } finally {
      setIsArchivingPractice(false);
    }
  };

  const restoreArchivedPracticeData = async () => {
    if (!classId || isRestoringPractice) return;

    const confirmed = window.confirm(
      "Restore archived practice responses for this class? They will become visible in the dashboard again."
    );
    if (!confirmed) return;

    setIsRestoringPractice(true);

    try {
      const restoredCount = await updateArchiveStateForResponses({
        archived: false,
        archivedReason: null
      });

      if (restoredCount === 0) {
        window.alert("No archived practice responses were found for this class.");
        return;
      }

      window.alert("Archived practice responses restored.");
    } catch (error) {
      console.error("Restore archived practice data failed:", error);
      window.alert("Could not restore archived practice responses.");
    } finally {
      setIsRestoringPractice(false);
    }
  };

  const clearRoster = async ({ skipConfirm = false } = {}) => {
    if (!classId || isClearingRoster) return;

    if (!skipConfirm) {
      const confirmed = window.confirm(
        "Clear the student roster for this class? This removes student names from the roster, but does not delete responses."
      );
      if (!confirmed) return;
    }

    setIsClearingRoster(true);

    try {
      const rosterSnapshot = await getDocs(collection(db, "classes", classId, "roster"));

      if (rosterSnapshot.empty) {
        window.alert("The roster is already empty.");
        return;
      }

      let batch = writeBatch(db);
      let ops = 0;

      for (const rosterDoc of rosterSnapshot.docs) {
        batch.delete(rosterDoc.ref);
        ops += 1;

        if (ops === 400) {
          await batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      }

      if (ops > 0) {
        await batch.commit();
      }

      window.alert("Roster cleared.");
    } catch (error) {
      console.error("Clear roster failed:", error);
      window.alert("Could not clear the roster.");
    } finally {
      setIsClearingRoster(false);
    }
  };

  const resetClassForRealUse = async () => {
    if (isArchivingPractice || isClearingRoster) return;

    const confirmed = window.confirm(
      resetClassStateOnReset
        ? "Reset this class for real use? This will archive all current practice responses, clear the roster, and reset the class back to instruction mode."
        : "Reset this class for real use? This will archive all current practice responses and clear the roster."
    );
    if (!confirmed) return;

    await archivePracticeData({ skipConfirm: true });
    await clearRoster({ skipConfirm: true });
    if (resetClassStateOnReset) {
      await resetClassState();
    }
  };

  const archiveSelectedSession = async () => {
    if (!classId || !selectedSession || isUpdatingSessionArchive) return;

    const confirmed = window.confirm(
      "Archive responses for the selected session only? They will be hidden from the dashboard but kept in Firestore."
    );
    if (!confirmed) return;

    setIsUpdatingSessionArchive(true);

    try {
      const updatedCount = await updateArchiveStateForResponses({
        sessionId: selectedSession,
        archived: true,
        archivedReason: "session"
      });

      if (updatedCount === 0) {
        window.alert("No active responses were found for that session.");
        return;
      }

      window.alert("Selected session archived.");
    } catch (error) {
      console.error("Archive selected session failed:", error);
      window.alert("Could not archive this session.");
    } finally {
      setIsUpdatingSessionArchive(false);
    }
  };

  const restoreSelectedSession = async () => {
    if (!classId || !selectedSession || isUpdatingSessionArchive) return;

    const confirmed = window.confirm(
      "Restore archived responses for the selected session? They will become visible in the dashboard again."
    );
    if (!confirmed) return;

    setIsUpdatingSessionArchive(true);

    try {
      const restoredCount = await updateArchiveStateForResponses({
        sessionId: selectedSession,
        archived: false,
        archivedReason: null
      });

      if (restoredCount === 0) {
        window.alert("No archived responses were found for that session.");
        return;
      }

      window.alert("Selected session restored.");
    } catch (error) {
      console.error("Restore selected session failed:", error);
      window.alert("Could not restore this session.");
    } finally {
      setIsUpdatingSessionArchive(false);
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

      <div
        style={{
          marginBottom: 25,
          padding: 16,
          border: "1px solid #ffd8a8",
          background: "#fff9db",
          borderRadius: 10
        }}
      >
        <h3 style={{ marginTop: 0 }}>Practice Data Tools</h3>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
          Use these after practice sessions to hide practice analytics and remove student names before real classroom use.
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={showArchivedData}
            onChange={(event) => setShowArchivedData(event.target.checked)}
          />
          Show archived responses in dashboard views
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={resetClassStateOnReset}
            onChange={(event) => setResetClassStateOnReset(event.target.checked)}
          />
          Also reset class state to instruction mode when using reset
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={resetClassForRealUse}
            disabled={isArchivingPractice || isClearingRoster}
            style={controlBtn("#228be6", isArchivingPractice || isClearingRoster)}
          >
            {isArchivingPractice || isClearingRoster
              ? "Resetting..."
              : "Reset Class for Real Use"}
          </button>
          <button
            onClick={archivePracticeData}
            disabled={isArchivingPractice}
            style={controlBtn("#f08c00", isArchivingPractice)}
          >
            {isArchivingPractice ? "Archiving..." : "Archive Practice Data"}
          </button>
          <button
            onClick={restoreArchivedPracticeData}
            disabled={isRestoringPractice}
            style={controlBtn("#4c6ef5", isRestoringPractice)}
          >
            {isRestoringPractice ? "Restoring..." : "Restore Archived Practice Data"}
          </button>
          <button
            onClick={clearRoster}
            disabled={isClearingRoster}
            style={controlBtn("#c92a2a", isClearingRoster)}
          >
            {isClearingRoster ? "Clearing..." : "Clear Roster"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 25, padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>Session Archive Tools</h3>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
          Archive or restore just one session without affecting the rest of the class history.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selectedSession || ""}
            onChange={(event) => setSelectedSession(event.target.value || null)}
            style={{
              minWidth: 360,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "white"
            }}
          >
            <option value="">Select a session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {getSessionLabel(session)}
              </option>
            ))}
          </select>
          <button
            onClick={archiveSelectedSession}
            disabled={!selectedSession || isUpdatingSessionArchive}
            style={controlBtn("#f08c00", !selectedSession || isUpdatingSessionArchive)}
          >
            {isUpdatingSessionArchive ? "Working..." : "Archive Selected Session"}
          </button>
          <button
            onClick={restoreSelectedSession}
            disabled={!selectedSession || isUpdatingSessionArchive}
            style={controlBtn("#4c6ef5", !selectedSession || isUpdatingSessionArchive)}
          >
            {isUpdatingSessionArchive ? "Working..." : "Restore Selected Session"}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 25, padding: 20, border: "1px solid #ddd", borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>Roster Management</h3>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
          Rename, remove, or merge student roster names without manually editing Firestore.
        </div>

        {duplicateRosterGroups.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#fff4e6",
              border: "1px solid #ffd8a8",
              borderRadius: 8
            }}
          >
            <div style={{ fontWeight: "600", marginBottom: 8 }}>Possible duplicates found</div>
            <div style={{ fontSize: 14, color: "#555" }}>
              {duplicateRosterGroups
                .map((group) => group.map((studentRow) => studentRow.name).join(" / "))
                .join(" • ")}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          {rosterWithDrafts.length === 0 ? (
            <div style={{ color: "#999", fontSize: 13 }}>No students on roster yet.</div>
          ) : (
            rosterWithDrafts.map((studentRow) => (
              <div
                key={studentRow.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(220px, 1fr) auto auto",
                  gap: 10,
                  alignItems: "center"
                }}
              >
                <input
                  value={studentRow.draftName}
                  onChange={(event) =>
                    setRosterDrafts((prev) => ({
                      ...prev,
                      [studentRow.id]: event.target.value
                    }))
                  }
                  style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "1px solid #ddd"
                  }}
                />
                <button
                  onClick={() => renameRosterStudent(studentRow)}
                  disabled={isUpdatingRoster}
                  style={controlBtn("#228be6", isUpdatingRoster)}
                >
                  Rename
                </button>
                <button
                  onClick={() => removeRosterStudent(studentRow)}
                  disabled={isUpdatingRoster}
                  style={controlBtn("#c92a2a", isUpdatingRoster)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {roster.length >= 2 && (
          <div
            style={{
              paddingTop: 14,
              borderTop: "1px solid #eee",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <div style={{ fontWeight: "600" }}>Merge duplicate names</div>
            <select
              value={mergeSourceName}
              onChange={(event) => setMergeSourceName(event.target.value)}
              style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd" }}
            >
              <option value="">Merge from</option>
              {roster.map((studentRow) => (
                <option key={`source-${studentRow.id}`} value={studentRow.name}>
                  {studentRow.name}
                </option>
              ))}
            </select>
            <select
              value={mergeTargetName}
              onChange={(event) => setMergeTargetName(event.target.value)}
              style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd" }}
            >
              <option value="">Merge into</option>
              {roster
                .filter((studentRow) => studentRow.name !== mergeSourceName)
                .map((studentRow) => (
                  <option key={`target-${studentRow.id}`} value={studentRow.name}>
                    {studentRow.name}
                  </option>
                ))}
            </select>
            <button
              onClick={mergeRosterStudents}
              disabled={!mergeSourceName || !mergeTargetName || isUpdatingRoster}
              style={controlBtn("#7048e8", !mergeSourceName || !mergeTargetName || isUpdatingRoster)}
            >
              Merge Students
            </button>
          </div>
        )}
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
          <div
            style={{
              marginBottom: 20,
              padding: 18,
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
            }}
          >
            <div style={{ fontWeight: "700", marginBottom: 12 }}>Submission Status</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {[
                { label: "Missing", value: liveSubmissionSummary.counts.missing, color: "#868e96" },
                { label: "Recording", value: liveSubmissionSummary.counts.recording, color: "#f08c00" },
                { label: "Recorded", value: liveSubmissionSummary.counts.recorded, color: "#5c7cfa" },
                { label: "Processing", value: liveSubmissionSummary.counts.processing, color: "#fab005" },
                { label: "Submitted", value: liveSubmissionSummary.counts.submitted, color: "#2f9e44" }
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    minWidth: 120,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#f8f9fa",
                    border: `1px solid ${item.color}33`
                  }}
                >
                  <div style={{ fontSize: 12, color: "#666" }}>{item.label}</div>
                  <div style={{ fontSize: 26, fontWeight: "700", color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {liveSubmissionSummary.rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background:
                      row.status === "submitted"
                        ? "#ebfbee"
                        : row.status === "processing"
                          ? "#fff9db"
                          : row.status === "recorded"
                            ? "#edf2ff"
                            : row.status === "recording"
                              ? "#fff4e6"
                              : "#f1f3f5",
                    border: "1px solid #e9ecef"
                  }}
                >
                  <div style={{ fontWeight: "600" }}>{row.name}</div>
                  <div style={{ fontSize: 13, color: "#666", textTransform: "capitalize" }}>
                    {row.status}
                  </div>
                </div>
              ))}
            </div>
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
          <div
            style={{
              marginBottom: 20,
              padding: 18,
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: "700" }}>Teacher Notes and Follow-Up</div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  Track who needs follow-up and save private notes for future instruction.
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>
                Flagged students: <strong>{flaggedStudents.length}</strong>
              </div>
            </div>

            {flaggedStudents.length > 0 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 8,
                  background: "#fff4e6",
                  border: "1px solid #ffd8a8"
                }}
              >
                <strong>Follow-up list:</strong>{" "}
                {flaggedStudents.map((studentRow) => studentRow.name).join(", ")}
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {rosterWithNotes.length === 0 ? (
                <div style={{ color: "#777", fontSize: 14 }}>No students on the roster yet.</div>
              ) : (
                rosterWithNotes.map((studentRow) => (
                  <div
                    key={`note-${studentRow.studentKey}`}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #e9ecef",
                      background: "#f8f9fa"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                      <strong>{studentRow.name}</strong>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={studentRow.followUp}
                          onChange={(event) =>
                            setStudentNoteDrafts((prev) => ({
                              ...prev,
                              [studentRow.studentKey]: {
                                note: studentRow.note,
                                followUp: event.target.checked
                              }
                            }))
                          }
                        />
                        Needs follow-up
                      </label>
                    </div>
                    <textarea
                      value={studentRow.note}
                      onChange={(event) =>
                        setStudentNoteDrafts((prev) => ({
                          ...prev,
                          [studentRow.studentKey]: {
                            note: event.target.value,
                            followUp: studentRow.followUp
                          }
                        }))
                      }
                      placeholder="Add a quick note about this student's thinking, participation, or next step..."
                      style={{
                        width: "100%",
                        minHeight: 84,
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #ced4da",
                        resize: "vertical",
                        boxSizing: "border-box"
                      }}
                    />
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => saveStudentNote(studentRow)}
                        disabled={isSavingStudentNote}
                        style={controlBtn("#228be6", isSavingStudentNote)}
                      >
                        {isSavingStudentNote ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div
            style={{
              marginBottom: 20,
              padding: 18,
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
            }}
          >
            <div style={{ fontWeight: "700", marginBottom: 12 }}>Moderation Events</div>
            {moderationEvents.length === 0 ? (
              <div style={{ color: "#777", fontSize: 14 }}>No moderation events recorded for this class.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {moderationEvents.slice(0, 12).map((eventRow) => (
                  <div
                    key={eventRow.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: eventRow.severity === "block" ? "#fff5f5" : "#fff9db",
                      border: `1px solid ${eventRow.severity === "block" ? "#ffa8a8" : "#ffe066"}`
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <strong>{eventRow.studentName || eventRow.studentId || "Student"}</strong>
                      <span style={{ fontSize: 12, color: "#666" }}>
                        {eventRow.type} • {getTimestamp(eventRow) ? new Date(getTimestamp(eventRow)).toLocaleString() : "No timestamp"}
                      </span>
                    </div>
                    {Array.isArray(eventRow.matches) && eventRow.matches.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
                        Matched: {eventRow.matches.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
            className={classData?.className || classData?.name || "ThinkOutLoud Class"}
            analytics={analytics}
            roster={roster}
            studentNotes={studentNotes}
            onDeleteResponse={handleDeleteResponse}
          />
        </div>
      )}
    </div>
  );
}
