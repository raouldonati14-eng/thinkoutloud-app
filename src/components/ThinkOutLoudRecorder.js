import React, { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { audioRepository } from "../data/audioRepository";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,          // ✅ ADD THIS
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { highlightReasoning } from "../utils/highlightReasoning";
import { logClientEvent } from "../utils/logEvent";
import { getRubricLevel } from "./teacher/ScoringRubricPanel";
import T from "./common/T";
import { useBatchTranslate } from "../hooks/useBatchTranslate";

const ScoreBreakdown = ({ score, studentLanguage }) => {
  const rubric = getRubricLevel(score);

  const texts = [
    "Score Summary",
    `Overall score: ${score} / 3`,
    rubric ? `${rubric.label}: ${rubric.title}` : "",
    ...(rubric ? rubric.criteria.slice(0, 3) : [])
  ];

  const translated = useBatchTranslate(texts, studentLanguage);

  if (!translated || translated.length === 0) {
    return null;
  }

  const [scoreSummary, overallScore, rubricHeader, ...criteriaTranslated] = translated;

  return (
    <div
      style={{
        marginTop: 20,
        background: "#ffffff",
        padding: 16,
        borderRadius: 10,
        border: "1px solid #e5e7eb"
      }}
    >
      <h3>{scoreSummary}</h3>
      <div>{overallScore}</div>
      {rubric && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, color: rubric.color, marginBottom: 8 }}>
            {rubricHeader}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
            {criteriaTranslated.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const RECOGNITION_LANGUAGE_MAP = {
  en: "en-US", es: "es-ES", pt: "pt-BR", fr: "fr-FR", ht: "ht-HT",
  ar: "ar-SA", zh: "zh-CN", vi: "vi-VN", tl: "fil-PH", ko: "ko-KR",
  pl: "pl-PL", ru: "ru-RU", so: "so-SO", ur: "ur-PK", hi: "hi-IN", it: "it-IT",
  ja: "ja-JP"
};

const primaryButtonStyle = {
  minWidth: 180,
  minHeight: 60,
  padding: "16px 24px",
  borderRadius: 12,
  border: "none",
  background: "#228be6",
  color: "white",
  fontWeight: 800,
  fontSize: 22,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(34, 139, 230, 0.22)"
};

const secondaryButtonStyle = {
  marginTop: 12,
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #ced4da",
  background: "#ffffff",
  color: "#212529",
  fontWeight: 700,
  cursor: "pointer"
};

const SCORE_RESPONSE_URL =
  process.env.REACT_APP_SCORE_RESPONSE_URL ||
  "https://us-central1-think-out-loud-40d3a.cloudfunctions.net/scoreResponse";

const toMillis = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value?.toMillis && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }

  return null;
};

function containsProfanity(text) {
  const badWords = [
    "damn", "hell", "shit", "fuck", "bitch", "ass",
    "crap", "piss", "dumbass", "idiot", "stupid",
    "wtf", "omfg", "bs", "bullshit",
    "sucks", "jerk", "loser"
  ];

  const clean = text.toLowerCase();

  return badWords.some(word =>
    new RegExp(`\\b${word}\\b`, "i").test(clean)
  );
}
function highlightMissingIdeas(written, missingIdeas) {
  if (!written || !missingIdeas?.length) return written;

  let result = written;

  missingIdeas.forEach((idea) => {
    const safeIdea = idea.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex

    const regex = new RegExp(`(${safeIdea})`, "gi");

    result = result.replace(
      regex,
      `<span style="background:#fff3bf;padding:2px 4px;border-radius:4px;">$1</span>`
    );
  });

  return result;
}
export default function ThinkOutLoudRecorder({
  student,
  questionId,
  questionText,
  category,
  classId,
  sessionId,
  teacherLanguage = "en",
  studentLanguage = "en",
  writtenResponse = "",
  responseWindowEndsAt = null,
  storageKeyBase = null,
  onRecordingChange,
  onFinish
}) {

  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [timer, setTimer] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [activeResponseId, setActiveResponseId] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState("recording");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [retryWindowEndsAt, setRetryWindowEndsAt] = useState(null);
  const [retryNow, setRetryNow] = useState(Date.now());

  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const responseIdRef = useRef(null);
  const recognitionRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  const celebratedResponseRef = useRef(null);
  const recorderStorageKey = storageKeyBase ? `${storageKeyBase}:recorder` : null;
  const supportsSpeechRecognition = "webkitSpeechRecognition" in window;
  const supportsAudioRecording =
    !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const maxAttempts = 3;
  const MAX_RECORDING_TIME = 45;
  const retryWindowMs = 15 * 60 * 1000;
  const sessionRetryWindowEndsAt =
    toMillis(responseWindowEndsAt) ?? retryWindowEndsAt;
  const attemptsRemaining = Math.max(0, maxAttempts - attempts.length);
  const retryWindowActive =
    sessionRetryWindowEndsAt === null || sessionRetryWindowEndsAt > retryNow;
  const retryWindowTimeLeft =
    sessionRetryWindowEndsAt === null
      ? retryWindowMs
      : Math.max(0, sessionRetryWindowEndsAt - retryNow);
  const retryWindowLabel = `${Math.floor(retryWindowTimeLeft / 60000)}:${Math.floor(
    (retryWindowTimeLeft % 60000) / 1000
  ).toString().padStart(2, "0")}`;
  const canAttemptAgain =
    attempts.length < maxAttempts && (attempts.length === 0 || retryWindowActive);

  const bestAttempt = attempts.reduce((best, attempt) => {
    if (!best || (attempt.score ?? 0) > (best.score ?? 0)) return attempt;
    return best;
  }, null);

  useEffect(() => {
    wavesurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#dee2e6",
      progressColor: "#4dabf7",
      height: 90
    });
    return () => wavesurferRef.current?.destroy();
  }, []);

  useEffect(() => {
    return () => {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  useEffect(() => {
    if (typeof window === "undefined" || !recorderStorageKey) return;

    const savedState = window.localStorage.getItem(recorderStorageKey);
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState);
      setAttempts(Array.isArray(parsed.attempts) ? parsed.attempts : []);
      setRetryWindowEndsAt(
        Number.isFinite(parsed.retryWindowEndsAt) ? parsed.retryWindowEndsAt : null
      );
      setActiveResponseId(parsed.activeResponseId || null);
      setTranscript(parsed.transcript || "");
      setPhase(parsed.phase || "recording");
      setResponseData(parsed.responseData || null);
    } catch (error) {
      console.error("Failed to restore recorder state", error);
    }
  }, [recorderStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !recorderStorageKey) return;

    window.localStorage.setItem(
      recorderStorageKey,
      JSON.stringify({
        attempts,
        retryWindowEndsAt,
        activeResponseId,
        transcript,
        phase,
        responseData
      })
    );
  }, [
    activeResponseId,
    attempts,
    phase,
    recorderStorageKey,
    responseData,
    retryWindowEndsAt,
    transcript
  ]);

  useEffect(() => {
    if (!classId || !sessionId || !student) return;

    const responsesQuery = query(
      collection(db, "responses"),
      where("classId", "==", classId),
      where("sessionId", "==", sessionId)
    );

    const unsubscribe = onSnapshot(responsesQuery, (snapshot) => {
      const docs = snapshot.docs
        .map((responseDoc) => ({
          id: responseDoc.id,
          ...responseDoc.data()
        }))
        .filter((responseDoc) => responseDoc.studentId === student);

      const completeAttempts = docs
        .filter((attempt) => attempt.status === "complete")
        .map((attempt, index) => ({
          id: attempt.id,
          score: attempt.score,
          feedback: attempt.feedback,
          analysis: attempt.analysis,
          attemptNumber: attempt.attemptNumber || index + 1
        }))
        .sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

      setAttempts(completeAttempts);

      const latest = docs.sort((a, b) => {
        const aTime =
          toMillis(a.completedAt) ??
          toMillis(a.createdAt) ??
          0;
        const bTime =
          toMillis(b.completedAt) ??
          toMillis(b.createdAt) ??
          0;
        return bTime - aTime;
      })[0];

      if (!latest || recording || audioURL) return;

      if (
        phase === "recording" &&
        activeResponseId === null &&
        completeAttempts.length > 0
      ) {
        return;
      }

      if (latest.status === "processing") {
        setActiveResponseId(latest.id);
        setPhase("processing");
        setStatusMessage("Analyzing your response...");
        setIsSubmitting(true);
      }

      if (latest.status === "complete") {
        setActiveResponseId(latest.id);
        setResponseData(latest);
        setPhase("feedback");
        setStatusMessage("Feedback ready.");
        setIsSubmitting(false);
        setError("");
      }
    });

    return () => unsubscribe();
  }, [activeResponseId, audioURL, classId, phase, recording, sessionId, student]);

  useEffect(() => {
    if (!activeResponseId) return;
    const responseRef = doc(db, "responses", activeResponseId);
    const unsubscribe = onSnapshot(responseRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setResponseData(data);

      if (data.status === "processing") {
        setPhase("processing");
        setStatusMessage("Analyzing your response...");
      }

      if (data.status === "complete") {
        setPhase("feedback");
        setStatusMessage("Feedback ready.");
        setIsSubmitting(false);
        setError("");
        setRetryWindowEndsAt((prev) => prev ?? Date.now() + retryWindowMs);
        setAttempts((prev) => {
          const next = prev.filter((a) => a.id !== activeResponseId);
          return [
            ...next,
            {
              id: activeResponseId,
              score: data.score,
              feedback: data.feedback,
              analysis: data.analysis,
              attemptNumber: data.attemptNumber || next.length + 1
            }
          ].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));
        });
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
        if (onFinish) onFinish(data);
      }
    });
    return () => unsubscribe();
  }, [activeResponseId, onFinish, retryWindowMs]);

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (attempts.length === 0 || retryWindowEndsAt === null) return;
    const interval = setInterval(() => setRetryNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [attempts.length, retryWindowEndsAt]);

  useEffect(() => {
    const explicitWindowEnd = toMillis(responseWindowEndsAt);
    if (!explicitWindowEnd) return;
    setRetryWindowEndsAt(explicitWindowEnd);
  }, [responseWindowEndsAt]);

  useEffect(() => {
    if (
      phase !== "feedback" ||
      responseData?.status !== "complete" ||
      responseData?.score !== 3 ||
      !activeResponseId ||
      celebratedResponseRef.current === activeResponseId
    ) return;

    celebratedResponseRef.current = activeResponseId;
    setShowCelebration(true);
    const timeout = setTimeout(() => setShowCelebration(false), 2600);

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const startAt = audioContext.currentTime + index * 0.08;
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(frequency, startAt);
          gainNode.gain.setValueAtTime(0.0001, startAt);
          gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.35);
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start(startAt);
          oscillator.stop(startAt + 0.4);
        });
        setTimeout(() => audioContext.close().catch(() => {}), 700);
      }
    } catch (celebrationError) {
      console.error("CELEBRATION AUDIO ERROR", celebrationError);
    }

    return () => clearTimeout(timeout);
  }, [activeResponseId, phase, responseData]);

  const resetForNextAttempt = () => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    responseIdRef.current = null;
    setActiveResponseId(null);
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setTranscript("");
    setResponseData(null);
    setTimer(0);
    setPhase("recording");
    setStatusMessage("");
    setError("");
    setIsSubmitting(false);
  };

  const startRecording = async () => {
    if (!canAttemptAgain) {
      logClientEvent("student_attempt_blocked", {
        classId,
        sessionId,
        attempts: attempts.length,
        retryWindowActive
      });
      setError(
        attempts.length >= maxAttempts
          ? "You have reached the maximum of 3 attempts."
          : "Your 15-minute revision window has ended."
      );
      setStatusMessage(
        attempts.length >= maxAttempts
          ? "No attempts remaining."
          : "Revision window closed."
      );
      return;
    }

    if (!classId || !sessionId) {
      setStatusMessage("Session not ready.");
      return;
    }

    if (!supportsAudioRecording) {
      logClientEvent("student_recording_unavailable", {
        classId,
        sessionId,
        student
      });
      setError("This browser cannot record audio. Try Chrome on the classroom device.");
      setStatusMessage("Audio recording is unavailable.");
      return;
    }

    if (!responseIdRef.current) {
      responseIdRef.current = doc(collection(db, "responses")).id;
      setActiveResponseId(responseIdRef.current);
    }

    if (supportsSpeechRecognition) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = RECOGNITION_LANGUAGE_MAP[studentLanguage] || "en-US";
      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
      };
      recognition.onerror = () => {
        setStatusMessage("Recording audio. Live transcript is unavailable right now.");
      };
      recognition.start();
      recognitionRef.current = recognition;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      setTimer(0);
      setStatusMessage(
        supportsSpeechRecognition
          ? "Recording..."
          : "Recording started. Transcription is not available in this browser."
      );
      setPhase("recording");
      setResponseData(null);
      setActiveResponseId(responseIdRef.current);
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      setAudioURL(null);
      setTranscript("");
      setIsSubmitting(false);
      setError("");

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      recorder.onstop = () => {
        clearInterval(intervalRef.current);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setRecording(false);
        onRecordingChange?.(false);
        setPhase("ready");
        setStatusMessage("Recording ready to submit.");
        wavesurferRef.current?.load(url);
        recognitionRef.current?.stop();
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
      onRecordingChange?.(true);
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);

      await setDoc(
        doc(db, "classes", classId, "sessions", sessionId, "recording", student),
        { student, startedAt: serverTimestamp() }
      );
      logClientEvent("student_recording_started", {
        classId,
        sessionId,
        student
      });
    } catch (err) {
      console.error("Recording start error:", err);
      recognitionRef.current?.stop();
      setRecording(false);
      onRecordingChange?.(false);
      setPhase("recording");
      setError("We could not access the microphone. Check browser permissions and try again.");
      setStatusMessage("Microphone access failed.");
      logClientEvent("student_recording_start_failed", {
        classId,
        sessionId,
        student,
        message: err?.message || "unknown"
      });
    }
  };

  const stopRecording = async () => {
    setStatusMessage("Finishing recording...");
    mediaRecorderRef.current?.stop();
    try {
      await deleteDoc(
        doc(db, "classes", classId, "sessions", sessionId, "recording", student)
      );
      logClientEvent("student_recording_stopped", {
        classId,
        sessionId,
        student,
        timer
      });
    } catch (err) {
      console.error("Recording cleanup error:", err);
    }
  };

  const finalizeResponse = async () => {
    if (isSubmitting || recording) return;
    if (!sessionId) {
      console.error("Missing session");
      setError("Session not ready");
      return;
    }
    if (!classId || !student) return;
    const combinedText = `${transcript} ${writtenResponse}`;

    if (containsProfanity(combinedText)) {
      setError("Please revise your response to remove inappropriate language.");
      setStatusMessage("Inappropriate language detected.");
      setIsSubmitting(false);

      logClientEvent("profanity_detected", {
        studentId: student,
        classId,
        sessionId,
        transcript,
        writtenResponse,
        timestamp: Date.now()
      });

      await addDoc(collection(db, "classes", classId, "moderationEvents"), {
        type: "profanity_detected",
        studentId: student,
        studentName: student,
        classId,
        sessionId,
        transcript: transcript || "",
        writtenResponse: writtenResponse || "",
        createdAt: serverTimestamp()
      });

      return;
    }
    try {
      setError("");
      setIsSubmitting(true);
      setStatusMessage("Submitting your response...");

      const responseId =
        responseIdRef.current || doc(collection(db, "responses")).id;
      responseIdRef.current = responseId;
      setActiveResponseId(responseId);

      const responseRef = doc(db, "responses", responseId);
      let uploadedAudioURL = audioURL || null;

      if (audioURL) {
        const response = await fetch(audioURL);
        const blob = await response.blob();
        uploadedAudioURL = await audioRepository.uploadAudio(
          blob, classId, sessionId, responseId
        );
      }

      console.log("SUBMIT DATA", { studentId: student, sessionId, audioUrl: uploadedAudioURL });

      await setDoc(responseRef, {
        studentId: student,
        classId,
        sessionId,
        responseLanguage: studentLanguage || "en",
        attemptNumber: attempts.length + 1,
        studentName: student,
        questionId: questionId || null,
        category: category || null,
        audioUrl: uploadedAudioURL || null,
        transcript: transcript || "",
        writtenResponse: writtenResponse || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "processing"
      });
      logClientEvent("student_response_saved_for_scoring", {
        classId,
        sessionId,
        student,
        responseId
      });

      setPhase("processing");
      setStatusMessage("Response submitted. Preparing feedback...");

      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);

      processingTimeoutRef.current = setTimeout(() => {
        setError("Your response is saved. Feedback is taking longer than expected, but it is still processing.");
        setStatusMessage("Processing is delayed, but your response was saved.");
        logClientEvent("student_scoring_delayed", {
          classId,
          sessionId,
          student,
          responseId
        });
      }, 15000);

      const scoreRes = await fetch(SCORE_RESPONSE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript || "",
          writtenResponse: writtenResponse || "",
          questionText: questionText || "",
          category: category || "Health",
          studentName: student,
          studentLanguage: studentLanguage || "en"
        })
      });

      if (!scoreRes.ok) {
        throw new Error(`Scoring request failed with status ${scoreRes.status}`);
      }

      const assessment = await scoreRes.json();

      if (typeof assessment?.score !== "number") {
        throw new Error("Scoring response was incomplete");
      }

      setTimeout(async () => {
        try {
         await updateDoc(responseRef, {
            status: "complete",
            score: assessment.score,
            feedback: assessment.feedback,
            analysis: assessment.analysis,
            vocabularyUsed: assessment.vocabularyUsed || [],
            ideaCoverage: assessment.ideaCoverage || null,
            missingIdeas: assessment.missingIdeas || [],
            coveredIdeas: assessment.coveredIdeas || [],
            ideaFeedback: assessment.ideaFeedback || "",
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          logClientEvent("student_response_scored", {
            classId,
            sessionId,
            student,
            responseId,
            score: assessment.score
          });
        } catch (updateError) {
          console.error("ASSESSMENT ERROR", updateError);
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          setIsSubmitting(false);
          setError("We could not generate feedback for this response.");
          setStatusMessage("Feedback generation failed.");
          logClientEvent("student_feedback_write_failed", {
            classId,
            sessionId,
            student,
            responseId,
            message: updateError?.message || "unknown"
          });
        }
      }, 1500);
    } catch (err) {
      console.error("SUBMIT ERROR", err);
      setError("We could not finish submitting this response. Your notes are still saved, so you can try again.");
      setStatusMessage("Submission failed.");
      setIsSubmitting(false);
      setPhase("ready");
      logClientEvent("student_response_submit_failed", {
        classId,
        sessionId,
        student,
        message: err?.message || "unknown"
      });
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <style>{`
        @keyframes tol-firework-burst {
          0% { transform: translate(0, 0) scale(0.2); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
        }
        @keyframes tol-celebration-pop {
          0% { transform: scale(0.92); opacity: 0; }
          20% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tol-ribbon-float {
          0% { transform: translateY(12px); opacity: 0; }
          20% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-8px); opacity: 0; }
        }
        @keyframes tol-score-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(255, 212, 59, 0); }
          50% { box-shadow: 0 0 0 10px rgba(255, 212, 59, 0.18); }
        }
      `}</style>

      {/* ── Attempts summary bar ── */}
      {attempts.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#f8f9fa",
            borderRadius: 10,
            border: "1px solid #e5e7eb"
          }}
        >
          <T text={`Attempts: ${attempts.length}`} lang={studentLanguage} />
          <T text={`Best score: ${bestAttempt?.score ?? "-"} / 3`} lang={studentLanguage} />
          <T text={`Remaining: ${attemptsRemaining}`} lang={studentLanguage} />
          <T
            text={`Revision window: ${retryWindowActive ? retryWindowLabel : "Closed"}`}
            lang={studentLanguage}
          />
        </div>
      )}

      {/* ── Recording timer ── */}
      {recording && (
        <div style={{ marginBottom: 12, fontWeight: "bold" }}>
          <T text="Local recording:" lang={studentLanguage} />{" "}
          {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
          {timer < MAX_RECORDING_TIME && (
            <span style={{ fontSize: 13, fontWeight: 400, color: "#868e96", marginLeft: 8 }}>
              ({MAX_RECORDING_TIME - timer}s remaining)
            </span>
          )}
          {timer >= MAX_RECORDING_TIME && (
            <span style={{ fontSize: 13, fontWeight: 400, color: "#2f9e44", marginLeft: 8 }}>
              ✓ Minimum reached — stop when ready
            </span>
          )}
          <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: "#e9ecef", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min((timer / MAX_RECORDING_TIME) * 100, 100)}%`,
              background: timer >= MAX_RECORDING_TIME ? "#2f9e44" : "#4dabf7",
              transition: "width 1s linear, background 0.5s"
            }} />
          </div>
        </div>
      )}

      {/* ── Ready to submit notice ── */}
      {!recording && audioURL && phase !== "feedback" && (
        <div style={{ marginBottom: 12, color: "#555" }}>
          <T text="Recording captured and ready to submit." lang={studentLanguage} />
        </div>
      )}

      <div ref={waveformRef} />

      {/* ── Start button ── */}
      {!recording && !audioURL && phase !== "processing" && phase !== "feedback" && canAttemptAgain && (
        <button onClick={startRecording} style={primaryButtonStyle}>
          <T text="Start" lang={studentLanguage} />
        </button>
      )}

      {/* ── Stop button (before minimum) ── */}
      {recording && timer < MAX_RECORDING_TIME && (
        <button onClick={stopRecording} style={secondaryButtonStyle}>
          <T text="Stop" lang={studentLanguage} />
        </button>
      )}

      {/* ── Stop & Submit button (after minimum met) ── */}
      {recording && timer >= MAX_RECORDING_TIME && (
        <button
          onClick={stopRecording}
          style={{
            ...primaryButtonStyle,
            background: "#2f9e44",
            boxShadow: "0 12px 24px rgba(47, 158, 68, 0.22)"
          }}
        >
          <T text="Stop" lang={studentLanguage} />
        </button>
      )}

      {/* ── Submit button (after stopping) ── */}
      {audioURL && phase !== "feedback" && (
        <button disabled={isSubmitting} onClick={finalizeResponse}>
          {isSubmitting ? (
            <T text="Submitting..." lang={studentLanguage} />
          ) : (
            <T text="Submit" lang={studentLanguage} />
          )}
        </button>
      )}

      {/* ── Status / error ── */}
      {statusMessage && (
        <div style={{ marginTop: 12 }}>
          <T text={statusMessage} lang={studentLanguage} />
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, color: "#c92a2a" }}>
          <T text={error} lang={studentLanguage} />
        </div>
      )}

      {/* ── Audio playback (pre-submit) ── */}
      {audioURL && phase !== "feedback" && (
        <div style={{ marginTop: 16 }}>
          <audio controls src={audioURL} style={{ width: "100%" }} />
        </div>
      )}

      {/* ── Processing state ── */}
      {phase === "processing" && (
        <T text="Processing your response and preparing feedback..." lang={studentLanguage} />
      )}

      {!supportsSpeechRecognition && !recording && phase !== "feedback" && (
        <div style={{ marginTop: 12, color: "#555" }}>
          <T
            text="This browser can record audio, but live transcript support is limited. You can still submit your recording."
            lang={studentLanguage}
          />
        </div>
      )}

      {error && phase !== "feedback" && (
        <button onClick={resetForNextAttempt} style={secondaryButtonStyle}>
          <T text="Reset and Try Again" lang={studentLanguage} />
        </button>
      )}

      {/* ── Feedback panel ── */}
      {phase === "feedback" && responseData?.status === "complete" && (
        <div
          style={{
            marginTop: 30,
            padding: 24,
            borderRadius: 12,
            background:
              responseData.score === 3
                ? "linear-gradient(180deg, #fff7cc 0%, #fff3bf 48%, #fff9db 100%)"
                : "#f8f9fa",
            position: "relative",
            overflow: "hidden",
            animation: responseData.score === 3 ? "tol-celebration-pop 320ms ease-out" : "none"
          }}
        >
          {showCelebration && responseData.score === 3 && (
            <>
              <div
                style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "radial-gradient(circle at top, rgba(255, 236, 153, 0.7), transparent 52%), radial-gradient(circle at bottom right, rgba(255, 169, 77, 0.18), transparent 36%)"
                }}
              />
              <div
                style={{
                  position: "absolute", top: -120, right: -80, width: 260, height: 260,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.55), transparent 62%)",
                  pointerEvents: "none"
                }}
              />
              {[0, 1, 2].map((burstIndex) => (
                <div
                  key={`burst-${burstIndex}`}
                  style={{
                    position: "absolute",
                    top: burstIndex === 0 ? "22%" : burstIndex === 1 ? "16%" : "24%",
                    left: burstIndex === 0 ? "16%" : burstIndex === 1 ? "50%" : "84%",
                    width: 12, height: 12, pointerEvents: "none"
                  }}
                >
                  {Array.from({ length: 12 }).map((_, particleIndex) => {
                    const angle = (Math.PI * 2 * particleIndex) / 12;
                    const distance = 58 + burstIndex * 12;
                    const colors = ["#ff922b", "#ffd43b", "#fa5252", "#4dabf7", "#12b886"];
                    return (
                      <span
                        key={`particle-${burstIndex}-${particleIndex}`}
                        style={{
                          "--dx": `${Math.cos(angle) * distance}px`,
                          "--dy": `${Math.sin(angle) * distance}px`,
                          position: "absolute", top: 0, left: 0, width: 8, height: 8,
                          borderRadius: "50%",
                          background: colors[(burstIndex + particleIndex) % colors.length],
                          boxShadow: "0 0 14px rgba(255, 212, 59, 0.75)",
                          animation: `tol-firework-burst 1050ms ease-out ${burstIndex * 120}ms forwards`
                        }}
                      />
                    );
                  })}
                </div>
              ))}
              {["Amazing work", "Perfect score", "3 out of 3"].map((label, index) => (
                <div
                  key={label}
                  style={{
                    position: "absolute",
                    top: 54 + index * 30,
                    left: index % 2 === 0 ? 24 : "auto",
                    right: index % 2 === 1 ? 24 : "auto",
                    padding: "4px 10px", borderRadius: 999,
                    background: "rgba(255,255,255,0.7)", color: "#7a4e00",
                    fontWeight: 700, fontSize: 12, letterSpacing: 0.3,
                    pointerEvents: "none",
                    animation: `tol-ribbon-float 1300ms ease-out ${index * 110}ms forwards`
                  }}
                >
                  {label}
                </div>
              ))}
              <div
                style={{
                  position: "absolute", top: 16, right: 16,
                  padding: "6px 10px", borderRadius: 999,
                  background: "#2f9e44", color: "white", fontWeight: 700, letterSpacing: 0.3
                }}
              >
                Perfect Score
              </div>
            </>
          )}

          <h2><T text="Feedback" lang={studentLanguage} /></h2>

          <div style={{ marginBottom: 12 }}>
            <T text={`Attempt ${responseData.attemptNumber || attempts.length}`} lang={studentLanguage} />
          </div>

          {responseData.score === 3 && (
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                marginBottom: 14, padding: "10px 16px", borderRadius: 999,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(255, 212, 59, 0.75)",
                color: "#7a4e00", fontWeight: 800,
                animation: "tol-score-glow 1.8s ease-in-out infinite"
              }}
            >
              <span style={{ fontSize: 20 }}>3 / 3</span>
              <span><T text="You nailed it." lang={studentLanguage} /></span>
            </div>
          )}

          {responseData.score !== 3 && <h3>{responseData.score} / 3</h3>}

          <ScoreBreakdown score={responseData.score} studentLanguage={studentLanguage} />

          <div style={{ marginTop: 20 }}>
            <h3><T text="Feedback" lang={studentLanguage} /></h3>
            <p>{responseData.feedback}</p>
          </div>

          {responseData.analysis && (
            <div style={{ marginTop: 20 }}>
              <h3><T text="Why You Received This Score" lang={studentLanguage} /></h3>
              <p>{responseData.analysis}</p>
            </div>
          )}

          {responseData.vocabularyUsed?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3><T text="Vocabulary Used" lang={studentLanguage} /></h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {responseData.vocabularyUsed.map((word) => (
                  <span
                    key={word}
                    style={{
                      padding: "6px 10px", borderRadius: 999,
                      background: "#e7f5ff", color: "#1864ab",
                      fontWeight: 600, fontSize: 14
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {audioURL && (
            <div style={{ marginTop: 20 }}>
              <h3><T text="Playback" lang={studentLanguage} /></h3>
              <audio controls src={audioURL} style={{ width: "100%" }} />
            </div>
          )}

          {transcript && (
            <div style={{ marginTop: 20 }}>
              <h3><T text="Your Response" lang={studentLanguage} /></h3>
              <div
  dangerouslySetInnerHTML={{
    __html: highlightMissingIdeas(
      writtenResponse,
      responseData?.missingIdeas || []
    )
  }}
/>
         {/* ── Written response ── */}
         {writtenResponse && (
  <div style={{ marginTop: 20 }}>
    <h3><T text="Your Written Response" lang={studentLanguage} /></h3>
    <div
      style={{
        background: "#f8f9fa",
        padding: 14,
        borderRadius: 8,
        fontSize: 14,
        lineHeight: 1.6,
        border: "1px solid #e9ecef"
      }}
    >
      <div
        dangerouslySetInnerHTML={{
          __html: highlightMissingIdeas(
            writtenResponse,
            responseData.missingIdeas
          )
        }}
      />
    </div>
  </div>
)}
              </div>
          )}

          {/* ── Spoken response ── */}
          {transcript && (
            <div style={{ marginTop: 20 }}>
              <h3><T text="Your Spoken Response" lang={studentLanguage} /></h3>
              <div style={{ background: "#f8f9fa", padding: 14, borderRadius: 8, fontSize: 14, lineHeight: 1.6, border: "1px solid #e9ecef" }}>
                <div dangerouslySetInnerHTML={{ __html: highlightReasoning(transcript) }} />
              </div>
            </div>
          )}

          {/* ── Idea coverage (from GPT) ── */}
          {responseData.ideaCoverage && responseData.ideaCoverage.total > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3><T text="Idea Coverage" lang={studentLanguage} /></h3>
              <div style={{
                padding: 14, borderRadius: 8, fontWeight: 600, fontSize: 15,
                background: responseData.ideaCoverage.covered === responseData.ideaCoverage.total ? "#ebfbee" : "#fff9db",
                border: `1px solid ${responseData.ideaCoverage.covered === responseData.ideaCoverage.total ? "#a9e34b" : "#ffd43b"}`
              }}>
                {responseData.ideaCoverage.covered} / {responseData.ideaCoverage.total}{" "}
                <T text="key ideas covered" lang={studentLanguage} />
              </div>
              {responseData.ideaFeedback && (
                <p style={{ marginTop: 10, fontSize: 14, color: "#495057" }}>{responseData.ideaFeedback}</p>
              )}
            </div>
          )}

          {/* ── Missing ideas (from GPT) ── */}
          {responseData.missingIdeas?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3><T text="Ideas to Add Next Time" lang={studentLanguage} /></h3>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {responseData.missingIdeas.map((idea, i) => (
                  <li key={i} style={{ marginBottom: 6, fontSize: 14, color: "#495057" }}>{idea}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={resetForNextAttempt} style={{ marginTop: 20 }} disabled={!canAttemptAgain}>
            {!retryWindowActive ? (
              <T text="Revision Window Closed" lang={studentLanguage} />
            ) : attempts.length >= maxAttempts ? (
              <T text="Maximum Attempts Reached" lang={studentLanguage} />
            ) : (
              <T text="Try Again" lang={studentLanguage} />
            )}
          </button>
        </div>
      )}

      {/* ── Retry window expired notice ── */}
      {!retryWindowActive && attempts.length > 0 && phase !== "feedback" && (
        <div style={{ marginTop: 16, color: "#555" }}>
          <T text="Your 15-minute revision window has ended." lang={studentLanguage} />
        </div>
      )}

     {/* ── Max attempts notice ── */}
      {attempts.length >= maxAttempts && phase !== "feedback" && (
        <div style={{ marginTop: 16, color: "#555" }}>
          <T text="You have used all 3 attempts." lang={studentLanguage} />
        </div>
      )}
    </div>
  );
}
