import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

import ThinkOutLoudRecorder from "../components/ThinkOutLoudRecorder";
import { useBatchTranslate } from "../hooks/useBatchTranslate";
import { resolveQuestionIdentity } from "../utils/questionIdentity";

export default function EssentialQuestionScreen({
  classCode,
  classId,
  student,
  classData,
  translatedQuestion,
  studentLanguage = "en",
  writtenResponse: initialWrittenResponse = ""
}) {
  const [spotlight, setSpotlight] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const identity = resolveQuestionIdentity(classData || {});
  const questionText = translatedQuestion || identity.text;
  const interfaceText = useBatchTranslate(
    [
      identity.title || "Essential Question",
      "Recording in progress - read your notes aloud...",
      "Write your response here, then press Start and read it aloud..."
    ],
    studentLanguage,
    "student"
  );
  const translatedTitle = interfaceText[0] || identity.title || "Essential Question";
  const recordingPlaceholder =
    interfaceText[1] || "Recording in progress - read your notes aloud...";
  const planningPlaceholder =
    interfaceText[2] || "Write your response here, then press Start and read it aloud...";
  const notesStorageKey =
    classId && classData?.activeSessionId && student
      ? `tol:notes:${classId}:${classData.activeSessionId}:${student}:${identity.title || "question"}`
      : null;
  const [writtenResponse, setWrittenResponse] = useState(() => {
    if (typeof window === "undefined" || !notesStorageKey) {
      return initialWrittenResponse;
    }

    return window.localStorage.getItem(notesStorageKey) ?? initialWrittenResponse;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !notesStorageKey) {
      setWrittenResponse(initialWrittenResponse);
      return;
    }

    const saved = window.localStorage.getItem(notesStorageKey);
    setWrittenResponse(saved ?? initialWrittenResponse);
  }, [initialWrittenResponse, notesStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !notesStorageKey) return;

    if (writtenResponse) {
      window.localStorage.setItem(notesStorageKey, writtenResponse);
      return;
    }

    window.localStorage.removeItem(notesStorageKey);
  }, [notesStorageKey, writtenResponse]);

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

  if (!questionText) {
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

      <h1>{translatedTitle}</h1>
      <p style={{ fontSize: 18 }}>{questionText}</p>

      <textarea
        value={writtenResponse}
        onChange={(e) => setWrittenResponse(e.target.value)}
        readOnly={isRecording}
        placeholder={isRecording ? recordingPlaceholder : planningPlaceholder}
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
          marginBottom: 16,
          textAlign: "left",
          background: isRecording ? "#f8f9fa" : "#ffffff",
          color: isRecording ? "#495057" : "#212529"
        }}
      />

      <ThinkOutLoudRecorder
        student={student?.name || student}
        questionId={identity.title || classData?.activeSessionId || null}
        questionText={questionText}
        category={classData?.category}
        classCode={classCode}
        classId={classId}
        sessionId={classData?.activeSessionId}
        teacherLanguage={classData?.teacherLanguage || "en"}
        studentLanguage={studentLanguage}
        writtenResponse={writtenResponse}
        responseWindowEndsAt={classData?.recording?.responseWindowEndsAt}
        storageKeyBase={
          classId && classData?.activeSessionId && student
            ? `tol:response:${classId}:${classData.activeSessionId}:${student}:${identity.title || "question"}`
            : null
        }
        onRecordingChange={setIsRecording}
      />
    </div>
  );
}
