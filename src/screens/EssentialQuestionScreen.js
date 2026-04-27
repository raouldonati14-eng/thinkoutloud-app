import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import ThinkOutLoudRecorder from "../components/ThinkOutLoudRecorder";
import { resolveQuestionIdentity } from "../utils/questionIdentity";
import { translateMany } from "../utils/translate";

// ── Sentence starters by category (English source) ──
const SENTENCE_STARTERS = {
  default: [
    "Because...", "This leads to...", "For example...", "As a result...",
    "Therefore...", "This means...", "Evidence shows...", "This causes..."
  ],
  Drugs: [
    "Dopamine causes...", "Addiction happens because...", "The brain's reward system...",
    "Withdrawal occurs when...", "This drug affects...", "Because of dependence..."
  ],
  Tobacco: [
    "Nicotine causes...", "Smoking damages...", "The lungs are affected because...",
    "Secondhand smoke leads to...", "Addiction occurs when...", "Carbon monoxide..."
  ],
  Vaping: [
    "Vaping is harmful because...", "The aerosol contains...", "Nicotine addiction leads to...",
    "The lungs are damaged when...", "Young people vape because...", "Brain development is affected..."
  ],
  Alcohol: [
    "Alcohol affects the brain by...", "The liver is damaged because...", "Binge drinking leads to...",
    "Impaired judgment causes...", "Blood alcohol level rises when...", "Alcoholism develops because..."
  ],
  "Nervous System": [
    "The neuron sends a signal...", "The brain processes...", "First, the stimulus...",
    "Then, the spinal cord...", "The reflex occurs because...", "The central nervous system..."
  ],
  "Mental Health": [
    "Stress affects the body by...", "Self-esteem impacts...", "The health triangle shows...",
    "Coping strategies include...", "This disorder causes...", "Mental health affects daily life because..."
  ],
  Nutrition: [
    "This nutrient helps because...", "A balanced diet includes...", "Carbohydrates provide...",
    "Protein supports...", "Vitamins and minerals...", "A fad diet is harmful because..."
  ],
  Disease: [
    "The immune system responds by...", "T-cells and B-cells...", "This pathogen spreads through...",
    "Vaccination prevents...", "The infection occurs when...", "Antibodies fight..."
  ],
  "Endocrine System": [
    "This hormone controls...", "The gland releases...", "Homeostasis is maintained by...",
    "When the endocrine system fails...", "Metabolism is affected because...", "The pituitary gland..."
  ]
};

function getWordCount(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export default function EssentialQuestionScreen({
  classCode,
  classId,
  student,
  studentKey,
  classData,
  translatedQuestion,
  studentLanguage = "en",
  writtenResponse: initialWrittenResponse = ""
}) {
  const [spotlight, setSpotlight] = useState(null);
  const [writtenResponse, setWrittenResponse] = useState(initialWrittenResponse);
  const [isRecording, setIsRecording] = useState(false);
  const [translatedStarters, setTranslatedStarters] = useState(null);
  const [starterLabel, setStarterLabel] = useState("Tap to add a sentence starter:");
  const [aimLabel, setAimLabel] = useState("Aim for 35+ words");
  const [greatLabel, setGreatLabel] = useState("Great length!");

  const identity = resolveQuestionIdentity(classData || {});
  const questionText = translatedQuestion || identity.text;
  const category = classData?.category || "default";
  const englishStarters = SENTENCE_STARTERS[category] || SENTENCE_STARTERS.default;

  const wordCount = getWordCount(writtenResponse);
  const TARGET_WORDS = 35;
  const wordCountColor =
    wordCount >= TARGET_WORDS ? "#2f9e44" :
    wordCount >= 18 ? "#f08c00" : "#868e96";

  // ── Translate sentence starters when language changes ──
  useEffect(() => {
    let cancelled = false;

    if (studentLanguage === "en") {
      setTranslatedStarters(englishStarters);
      setStarterLabel("Tap to add a sentence starter:");
      setAimLabel("Aim for 35+ words");
      setGreatLabel("Great length!");
      return () => { cancelled = true; };
    }

    const allStrings = [
      ...englishStarters,
      "Tap to add a sentence starter:",
      "Aim for 35+ words",
      "Great length!"
    ];

    translateMany(allStrings, studentLanguage, "student").then(results => {
      if (cancelled) return;
      const starterCount = englishStarters.length;
      setTranslatedStarters(results.slice(0, starterCount));
      setStarterLabel(results[starterCount] || "Tap to add a sentence starter:");
      setAimLabel(results[starterCount + 1] || "Aim for 35+ words");
      setGreatLabel(results[starterCount + 2] || "Great length!");
    });

    return () => { cancelled = true; };
  }, [studentLanguage, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const starters = translatedStarters || englishStarters;

  const handleStarterClick = (starter) => {
    if (isRecording) return;
    setWrittenResponse((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return starter + " ";
      return trimmed + " " + starter + " ";
    });
  };

  useEffect(() => {
    if (!classData) return;

    const loadSpotlight = async () => {
      if (!classData.spotlightResponseId || !classData.activeSessionId) {
        setSpotlight(null);
        return;
      }
      try {
        const ref = doc(
          db, "classes", classId,
          "sessions", classData.activeSessionId,
          "responses", classData.spotlightResponseId
        );
        const snap = await getDoc(ref);
        if (snap.exists()) setSpotlight(snap.data());
      } catch (err) {
        console.error("Spotlight error:", err);
      }
    };

    loadSpotlight();
  }, [classData, classId]);

  if (!questionText) {
    return <div style={{ padding: 40 }}>Waiting for your teacher...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      {spotlight && (
        <div style={{ background: "#fff9db", padding: 20, marginBottom: 20, borderRadius: 10 }}>
          <h2>{spotlight.student}</h2>
          <p>"{spotlight.transcript}"</p>
        </div>
      )}

      <h1>{identity.title || "Essential Question"}</h1>
      <p style={{ fontSize: 18 }}>{questionText}</p>

      {/* ── Sentence starter chips — hidden during recording ── */}
      {!isRecording && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#868e96", marginBottom: 6, fontWeight: 500 }}>
            {starterLabel}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {starters.map((starter, i) => (
              <button
                key={i}
                onClick={() => handleStarterClick(starter)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 20,
                  border: "1px solid #ced4da",
                  background: "#f8f9fa",
                  color: "#495057",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
                onMouseEnter={e => e.target.style.background = "#e9ecef"}
                onMouseLeave={e => e.target.style.background = "#f8f9fa"}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Planning textarea ── */}
      <textarea
        value={writtenResponse}
        onChange={(e) => setWrittenResponse(e.target.value)}
        readOnly={isRecording}
        placeholder={
          isRecording
            ? "Recording in progress — read your notes aloud..."
            : "Write your response here, then press Start and read it aloud..."
        }
        style={{
          width: "100%",
          minHeight: 120,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #ced4da",
          fontSize: 15,
          fontFamily: "inherit",
          resize: "vertical",
          boxSizing: "border-box",
          lineHeight: 1.5,
          marginBottom: 4,
          textAlign: "left",
          background: isRecording ? "#f8f9fa" : "#ffffff",
          color: isRecording ? "#495057" : "#212529"
        }}
      />

      {/* ── Word counter ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        fontSize: 13
      }}>
        <span style={{ color: wordCountColor, fontWeight: 600 }}>
          {wordCount} {wordCount === 1 ? "word" : "words"}
          {wordCount >= TARGET_WORDS && " ✓"}
        </span>
        <span style={{ color: "#adb5bd" }}>
          {wordCount < TARGET_WORDS ? aimLabel : greatLabel}
        </span>
      </div>

      <ThinkOutLoudRecorder
        student={student?.name || student}
        studentKey={studentKey}
        questionId={identity.title || classData?.activeSessionId || null}
        questionText={questionText}
        category={classData?.category}
        classCode={classCode}
        classId={classId}
        sessionId={classData?.activeSessionId}
        teacherLanguage={classData?.teacherLanguage || "en"}
        studentLanguage={studentLanguage}
        writtenResponse={writtenResponse}
        onRecordingChange={setIsRecording}
      />
    </div>
  );
}
