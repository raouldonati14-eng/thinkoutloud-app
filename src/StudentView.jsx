import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import EssentialQuestionScreen from "./screens/EssentialQuestionScreen";
import { logClientEvent } from "./utils/logEvent";
import { useRecordingState } from "./utils/useRecordingState";
import { SUPPORTED_LANGUAGES, translateMany } from "./utils/translate";
import DebugPanel from "./components/DebugPanel"; // adjust path if needed
const STUDENT_PROFILE_STORAGE_KEY = "tol:student-profile";

export default function StudentView() {
  const [classData, setClassData] = useState(null);
  const [classLoaded, setClassLoaded] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [student, setStudent] = useState(null);
  const [studentStarted, setStudentStarted] = useState(false);
  const { recordingState, timeLeft } = useRecordingState(classData || {});
  const [language, setLanguage] = useState("en");
  const [makeupData, setMakeupData] = useState(null);
  const [makeupStarted, setMakeupStarted] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // 🌐 TRANSLATED UI STRINGS
  const [ui, setUi] = useState({
    joinClass: "Join Class",
    joinCode: "Join Code",
    lastName: "Last Name",
    firstName: "First Name",
    start: "Start",
    instructions: "Instructions",
    waitingForTeacher: "Waiting for teacher...",
    startResponse: "Start Response",
    timeUp: "Time is up — you can still respond",
    takeYourTime: "Take your time",
    makeupTitle: "You have a make-up assignment",
    makeupCategory: "Category",
    startMakeup: "Start Make-Up",
    presentationMode: "Presentation Mode"
  });

  const presentationMode = classData?.presentationMode || false;
  const slideIndex = classData?.slideIndex || 0;
  const seconds = Math.ceil(timeLeft / 1000);
  const studentSessionStateKey =
    selectedClassId && classData?.activeSessionId && student
      ? `tol:student-session:${selectedClassId}:${classData.activeSessionId}:${student}`
      : null;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedProfile = window.localStorage.getItem(STUDENT_PROFILE_STORAGE_KEY);
    if (!savedProfile) return;

    try {
      const parsed = JSON.parse(savedProfile);
      setJoinCode(parsed.joinCode || "");
      setSelectedClassId(parsed.selectedClassId || "");
      setLastName(parsed.lastName || "");
      setFirstName(parsed.firstName || "");
      setStudent(parsed.student || null);
      setLanguage(parsed.language || "en");
    } catch (error) {
      console.error("Could not restore student profile", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      STUDENT_PROFILE_STORAGE_KEY,
      JSON.stringify({
        joinCode,
        selectedClassId,
        lastName,
        firstName,
        student,
        language
      })
    );
  }, [firstName, joinCode, language, lastName, selectedClassId, student]);

  // 🌐 RE-TRANSLATE UI WHEN LANGUAGE CHANGES
  useEffect(() => {
    let cancelled = false;

    if (language === "en") {
      setUi({
        joinClass: "Join Class",
        joinCode: "Join Code",
        lastName: "Last Name",
        firstName: "First Name",
        start: "Start",
        instructions: "📘 Instructions",
        waitingForTeacher: "⏸ Waiting for teacher...",
        startResponse: "▶️ Start Response",
        timeUp: "⏱ Time is up — you can still respond",
        takeYourTime: "⏱ Take your time",
        makeupTitle: "📝 You have a make-up assignment",
        makeupCategory: "Category",
        startMakeup: "▶️ Start Make-Up",
        presentationMode: "🎬 Presentation Mode"
      });
      return () => {
        cancelled = true;
      };
    }

    const keys = [
      "Join Class", "Join Code", "Last Name", "First Name", "Start",
      "📘 Instructions", "⏸ Waiting for teacher...", "▶️ Start Response",
      "⏱ Time is up — you can still respond", "⏱ Take your time",
      "📝 You have a make-up assignment", "Category",
      "▶️ Start Make-Up", "🎬 Presentation Mode"
    ];

    translateMany(keys, language, "student").then(translated => {
      if (cancelled) return;
      setUi({
        joinClass: translated[0],
        joinCode: translated[1],
        lastName: translated[2],
        firstName: translated[3],
        start: translated[4],
        instructions: translated[5],
        waitingForTeacher: translated[6],
        startResponse: translated[7],
        timeUp: translated[8],
        takeYourTime: translated[9],
        makeupTitle: translated[10],
        makeupCategory: translated[11],
        startMakeup: translated[12],
        presentationMode: translated[13]
      });
    });

    return () => {
      cancelled = true;
    };
  }, [language]);

  // 🔥 CLASS LISTENER
  useEffect(() => {
    if (!selectedClassId) return;
    const classRef = doc(db, "classes", selectedClassId);
    const unsubscribe = onSnapshot(classRef, (snap) => {
      if (!snap.exists()) {
        setClassData(null);
        setClassLoaded(false);
        setJoinError("This class is no longer available. Please re-enter your join code.");
        return;
      }
      setClassData(snap.data());
      setClassLoaded(true);
      setJoinError("");
    });
    return () => unsubscribe();
  }, [selectedClassId]);

  // Reset student response state whenever teacher pushes a new active session
  useEffect(() => {
    if (!classData?.activeSessionId) return;
    setStudentStarted(false);
  }, [classData?.activeSessionId]);

  useEffect(() => {
    if (typeof window === "undefined" || !studentSessionStateKey) return;

    const savedState = window.localStorage.getItem(studentSessionStateKey);
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState);
      setStudentStarted(Boolean(parsed.studentStarted));
      setMakeupStarted(Boolean(parsed.makeupStarted));
    } catch (error) {
      console.error("Could not restore student session state", error);
    }
  }, [studentSessionStateKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !studentSessionStateKey) return;

    window.localStorage.setItem(
      studentSessionStateKey,
      JSON.stringify({ studentStarted, makeupStarted })
    );
  }, [makeupStarted, studentSessionStateKey, studentStarted]);

  // 🔥 MAKE-UP LISTENER
  useEffect(() => {
    if (!selectedClassId || !student) return;
    const makeupRef = doc(db, "classes", selectedClassId, "makeup", "assignment");
    const unsubscribe = onSnapshot(makeupRef, (snap) => {
      if (!snap.exists()) { setMakeupData(null); return; }
      const data = snap.data();
      if (data.open && data.assignedTo?.includes(student)) {
        setMakeupData(data);
      } else {
        setMakeupData(null);
      }
    });
    return () => unsubscribe();
  }, [selectedClassId, student]);

  // 🔥 ROSTER SAVE
  useEffect(() => {
    if (!selectedClassId || !student) return;
    const rosterRef = doc(
      db, "classes", selectedClassId, "roster",
      student.replace(/\s+/g, "_")
    );
    setDoc(rosterRef, { name: student, joinedAt: serverTimestamp() }, { merge: true });
  }, [selectedClassId, student]);

  // 🔥 JOIN
  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const startSession = async () => {
    const code = joinCode.replace(/\s+/g, "").trim().toUpperCase();
    if (!code || !lastName || !firstName) {
      setJoinError("Enter the class code, last name, and first name to continue.");
      logClientEvent("student_join_validation_failed", {
        hasCode: Boolean(code),
        hasLastName: Boolean(lastName),
        hasFirstName: Boolean(firstName)
      });
      return;
    }

    setIsJoining(true);
    setJoinError("");
    setJoinStatus("Joining class...");

    try {
      const joinRef = doc(db, "joinCodes", code);
      const joinSnap = await getDoc(joinRef);
      let classId = joinSnap.exists() ? joinSnap.data().classId : null;

      if (!classId) {
        const classQuery = query(
          collection(db, "classes"),
          where("joinCode", "==", code)
        );
        const classSnap = await getDocs(classQuery);

        if (!classSnap.empty) {
          classId = classSnap.docs[0].id;
          await setDoc(joinRef, { classId }, { merge: true });
        }
      }

      if (!classId) {
        setJoinError("Code not found. Ask your teacher to confirm the 5-character join code.");
        setJoinStatus("");
        logClientEvent("student_join_code_not_found", { joinCode: code });
        return;
      }

      const formattedName = `${capitalize(lastName)}, ${capitalize(firstName)}`;

      setStudentStarted(false);
      setClassData(null);
      setClassLoaded(false);
      setSelectedClassId(classId);
      setStudent(formattedName);
      setJoinStatus("Connected. Waiting for class data...");
      logClientEvent("student_join_succeeded", {
        classId,
        joinCode: code
      });
    } catch (error) {
      console.error("Join failed", error);
      setJoinError("We could not connect right now. Check your internet and try again.");
      setJoinStatus("");
      logClientEvent("student_join_failed", {
        joinCode: code,
        message: error?.message || "unknown"
      });
    } finally {
      setIsJoining(false);
    }
  };

  // 🌐 TRANSLATE CONTENT (question text, prompts, instructions)
  const [translatedContent, setTranslatedContent] = useState({});

  useEffect(() => {
    let cancelled = false;

    if (!classData || language === "en") {
      setTranslatedContent({});
      return () => {
        cancelled = true;
      };
    }

    const toTranslate = [
      classData.instructionText,
      classData.essentialQuestion,
      ...(classData.discussionPrompts || []),
      ...(classData.reflectionPrompts || [])
    ].filter(Boolean);

    translateMany(toTranslate, language, "student").then(results => {
      if (cancelled) return;
      let i = 0;
      const map = {};
      if (classData.instructionText) map.instructionText = results[i++];
      if (classData.essentialQuestion) map.essentialQuestion = results[i++];
      if (classData.discussionPrompts) {
        map.discussionPrompts = classData.discussionPrompts.map(() => results[i++]);
      }
      if (classData.reflectionPrompts) {
        map.reflectionPrompts = classData.reflectionPrompts.map(() => results[i++]);
      }
      setTranslatedContent(map);
    });

    return () => {
      cancelled = true;
    };
  }, [classData, language]);

  const t = (key) => translatedContent[key] || classData?.[key] || "";
  const tArray = (key) => translatedContent[key] || classData?.[key] || [];

  /* ---------------- PHASE RENDER ---------------- */
  const renderPhase = () => {
    switch (classData?.classPhase) {

      case "instruction":
        return (
          <div style={{ textAlign: "center" }}>
            <h2>{ui.instructions}</h2>
            <p>{t("instructionText")}</p>
          </div>
        );

      case "recording":
        return (
          <div style={{ textAlign: "center" }}>
            {recordingState === "waiting" && (
              <div>{ui.waitingForTeacher}</div>
            )}

            {recordingState !== "waiting" && !studentStarted && (
              <>
                <div>
                  {recordingState === "active" ? `🎤 ${seconds}s` : ui.timeUp}
                </div>
                <button
                  onClick={() => setStudentStarted(true)}
                  style={{
                    minWidth: 220,
                    minHeight: 64,
                    padding: "18px 28px",
                    marginTop: 16,
                    background: "#228be6",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: "bold",
                    fontSize: 24,
                    cursor: "pointer",
                    boxShadow: "0 12px 24px rgba(34, 139, 230, 0.24)"
                  }}
                >
                  {ui.startResponse}
                </button>
              </>
            )}

            {studentStarted && recordingState !== "waiting" && (
              <>
                <div>
                  {recordingState === "active" ? `⏱ ${seconds}s` : ui.takeYourTime}
                </div>
                <EssentialQuestionScreen
                  key={`normal-${classData?.activeSessionId || "none"}-${classData?.currentQuestion || ""}`}
                  classCode={joinCode}
                  classId={selectedClassId}
                  student={student}
                  classData={classData}
                  language={language}
                  studentLanguage={language}
                  translatedQuestion={t("essentialQuestion")}
                />
              </>
            )}
          </div>
        );

      case "discussion":
        const discussion = tArray("discussionPrompts");
        return (
          <div style={{ textAlign: "center" }}>
            <div>{slideIndex + 1} / {discussion.length}</div>
            <p>{discussion[slideIndex]}</p>
          </div>
        );

      case "reflection":
        const reflection = tArray("reflectionPrompts");
        return (
          <div style={{ textAlign: "center" }}>
            <div>{slideIndex + 1} / {reflection.length}</div>
            <p>{reflection[slideIndex]}</p>
          </div>
        );

      default:
        return <div />;
    }
  };

  /* ---------------- ENTRY ---------------- */
  if (!student) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", justifyContent: "center",
        alignItems: "center", background: "#f1f3f5", fontFamily: "sans-serif"
      }}>
        <div style={{
          width: 320, background: "white", padding: 30, borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)", textAlign: "center"
        }}>
          <div style={{ marginBottom: 16, textAlign: "right" }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd" }}
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <h2 style={{ marginBottom: 20 }}>{ui.joinClass}</h2>

          <input
            placeholder={ui.joinCode}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 10, boxSizing: "border-box" }}
          />
          <input
            placeholder={ui.lastName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 10, boxSizing: "border-box" }}
          />
          <input
            placeholder={ui.firstName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={{ width: "100%", marginBottom: 20, padding: 10, boxSizing: "border-box" }}
          />

          <button
            onClick={startSession}
            disabled={isJoining}
            style={{
              width: "100%", padding: 12, background: "#228be6",
              color: "white", border: "none", borderRadius: 6,
              fontWeight: "bold", fontSize: 16, cursor: isJoining ? "wait" : "pointer",
              opacity: isJoining ? 0.75 : 1
            }}
          >
            {isJoining ? "Joining..." : ui.start}
          </button>

          {joinStatus && (
            <div style={{ marginTop: 12, fontSize: 14, color: "#495057" }}>
              {joinStatus}
            </div>
          )}
          {joinError && (
            <div style={{ marginTop: 12, fontSize: 14, color: "#c92a2a" }}>
              {joinError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!classLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#495057", fontSize: 18 }}>
          {joinStatus || "Reconnecting to your class..."}
        </div>
      </div>
    );
  }

  /* ---------------- MAIN ---------------- */
  return (
    <div style={{
      minHeight: "100vh", display: "flex", justifyContent: "center",
      alignItems: "center", background: "#f1f3f5", fontFamily: "sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: presentationMode ? "100%" : 600,
        height: presentationMode ? "100vh" : "auto",
        background: "white",
        padding: presentationMode ? 60 : 30,
        borderRadius: presentationMode ? 0 : 12,
        boxShadow: presentationMode ? "none" : "0 10px 30px rgba(0,0,0,0.1)",
        textAlign: "center",
        fontSize: presentationMode ? 28 : 18,
        position: "relative"
      }}>
        {presentationMode && (
          <div style={{
            position: "absolute", top: 20, left: 20,
            background: "#2f9e44", color: "white",
            padding: "6px 12px", borderRadius: 6,
            fontWeight: "bold", fontSize: 14
          }}>
            {ui.presentationMode}
          </div>
        )}

        {/* LANGUAGE SELECTOR */}
        <div style={{ marginBottom: 10, textAlign: "right" }}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd" }}
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* MAKE-UP CARD */}
        {makeupData && !makeupStarted && (
          <div style={{
            marginBottom: 20, padding: 16,
            background: "#fff9db", border: "1px solid #ffd43b",
            borderRadius: 10, textAlign: "left"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>
              {ui.makeupTitle}
            </div>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>
              <strong>{ui.makeupCategory}:</strong> {makeupData.category}
            </div>
            <div style={{ fontSize: 15, marginBottom: 12 }}>
              {language === "en"
                ? makeupData.questionText
                : translatedContent[makeupData.questionText] || makeupData.questionText}
            </div>
            <button
              onClick={() => setMakeupStarted(true)}
              style={{
                padding: "10px 16px", borderRadius: 6, border: "none",
                background: "#228be6", color: "white",
                fontWeight: "bold", cursor: "pointer"
              }}
            >
              {ui.startMakeup}
            </button>
          </div>
        )}

        {/* MAKE-UP RESPONSE */}
        {makeupData && makeupStarted && (
          <EssentialQuestionScreen
            key={`makeup-${classData?.activeSessionId || "none"}-${makeupData?.questionText || ""}`}
            classCode={joinCode}
            classId={selectedClassId}
            student={student}
            language={language}
            studentLanguage={language}
            translatedQuestion={t("essentialQuestion")}
            classData={{
              ...classData,
              essentialQuestion: makeupData.questionText,
              category: makeupData.category,
              discussionPrompts: makeupData.discussionPrompts,
              reflectionPrompts: makeupData.reflectionPrompts,
              questionOpen: true
            }}
          />
        )}

        {/* NORMAL PHASE */}
        {!makeupData && !makeupStarted && renderPhase()}
       {process.env.NODE_ENV !== "production" && (
  <DebugPanel
    user={{ role: "student", name: student }}
    classPhase={classData?.classPhase}
    questionOpen={classData?.questionOpen}
  />
)}
      </div>
    </div>
  );
}
