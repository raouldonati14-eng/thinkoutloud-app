import React, { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import EssentialQuestionScreen from "./screens/EssentialQuestionScreen";
import { useRecordingState } from "./utils/useRecordingState";
import { SUPPORTED_LANGUAGES, translateMany } from "./utils/translate";

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
  console.log("makeupData:", makeupData, "makeupStarted:", makeupStarted);

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

  // 🌐 RE-TRANSLATE UI WHEN LANGUAGE CHANGES
  useEffect(() => {
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
      return;
    }

    const keys = [
      "Join Class", "Join Code", "Last Name", "First Name", "Start",
      "📘 Instructions", "⏸ Waiting for teacher...", "▶️ Start Response",
      "⏱ Time is up — you can still respond", "⏱ Take your time",
      "📝 You have a make-up assignment", "Category",
      "▶️ Start Make-Up", "🎬 Presentation Mode"
    ];

    translateMany(keys, language, "student").then(translated => {
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
  }, [language]);

  // 🔥 CLASS LISTENER
  useEffect(() => {
    if (!selectedClassId) return;
    const classRef = doc(db, "classes", selectedClassId);
    const unsubscribe = onSnapshot(classRef, (snap) => {
      if (!snap.exists()) return;
      setClassData(snap.data());
      setClassLoaded(true);
    });
    return () => unsubscribe();
  }, [selectedClassId]);

  // Reset student response state whenever teacher pushes a new active session
  useEffect(() => {
    if (!classData?.activeSessionId) return;
    setStudentStarted(false);
  }, [classData?.activeSessionId]);

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
    setDoc(rosterRef, { name: student, joinedAt: Date.now() }, { merge: true });
  }, [selectedClassId, student]);

  // 🔥 JOIN
  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const startSession = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !lastName || !firstName) {
      alert("Please enter all fields.");
      return;
    }
    const joinRef = doc(db, "joinCodes", code);
    const joinSnap = await getDoc(joinRef);
    if (!joinSnap.exists()) { alert("Invalid join code"); return; }

    const classId = joinSnap.data().classId;
    const formattedName = `${capitalize(lastName)}, ${capitalize(firstName)}`;

    setStudentStarted(false);
    setClassData(null);
    setClassLoaded(false);
    setSelectedClassId(classId);
    setStudent(formattedName);
  };

  // 🌐 TRANSLATE CONTENT (question text, prompts, instructions)
  const [translatedContent, setTranslatedContent] = useState({});

  useEffect(() => {
    if (!classData || language === "en") {
      setTranslatedContent({});
      return;
    }

    const toTranslate = [
      classData.instructionText,
      classData.essentialQuestion,
      ...(classData.discussionPrompts || []),
      ...(classData.reflectionPrompts || [])
    ].filter(Boolean);

    translateMany(toTranslate, language, "student").then(results => {
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
                <button onClick={() => setStudentStarted(true)}>
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
            style={{
              width: "100%", padding: 12, background: "#228be6",
              color: "white", border: "none", borderRadius: 6,
              fontWeight: "bold", fontSize: 16, cursor: "pointer"
            }}
          >
            {ui.start}
          </button>
        </div>
      </div>
    );
  }

  if (!classLoaded) return <div />;

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
      </div>
    </div>
  );
}
