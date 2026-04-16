import React, { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { audioRepository } from "../data/audioRepository";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { highlightReasoning } from "../utils/highlightReasoning";
import { getRubricLevel } from "./teacher/ScoringRubricPanel";

const ScoreBreakdown = ({ score }) => {
  const rubric = getRubricLevel(score);

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
        <h3>Score Summary</h3>
        <div>Overall score: {score} / 3</div>
        {rubric && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontWeight: 700,
                color: rubric.color,
                marginBottom: 8
              }}
            >
              {rubric.label}: {rubric.title}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
              {rubric.criteria.slice(0, 3).map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

const CATEGORY_SCORING_PROFILES = {
  Drugs: {
    vocabulary: [
      "brain",
      "reward",
      "dopamine",
      "addiction",
      "drug",
      "drugs",
      "craving",
      "dependence",
      "withdrawal",
      "risk",
      "stimulant",
      "depressant",
      "narcotic",
      "marijuana",
      "hallucinogen",
      "inhalant"
    ],
    reasoning: ["because", "therefore", "so", "as a result", "this leads to"]
  },
  Tobacco: {
    vocabulary: [
      "nicotine",
      "addiction",
      "lungs",
      "heart",
      "cancer",
      "disease",
      "smoking",
      "tobacco",
      "health",
      "risk"
    ],
    reasoning: ["because", "this causes", "as a result", "which can lead to"]
  },
  Vaping: {
    vocabulary: [
      "nicotine",
      "addiction",
      "lungs",
      "vaping",
      "aerosol",
      "chemical",
      "health",
      "risk",
      "damage"
    ],
    reasoning: ["because", "this can cause", "which leads to", "as a result"]
  },
  Alcohol: {
    vocabulary: [
      "alcohol",
      "liver",
      "brain",
      "judgment",
      "decision",
      "addiction",
      "risk",
      "health",
      "disease"
    ],
    reasoning: ["because", "which can lead to", "as a result", "therefore"]
  },
  "Nervous System": {
    vocabulary: [
      "stimulus",
      "stimuli",
      "neuron",
      "neurons",
      "brain",
      "spinal cord",
      "signal",
      "response",
      "sense receptor",
      "reflex"
    ],
    reasoning: ["first", "next", "then", "after that", "because"]
  },
  "Mental Health": {
    vocabulary: [
      "stress",
      "emotion",
      "fear",
      "self-esteem",
      "mental",
      "emotional",
      "social",
      "well-being",
      "disorder",
      "treatment"
    ],
    reasoning: ["because", "this affects", "which can lead to", "for example"]
  },
  Nutrition: {
    vocabulary: [
      "nutrient",
      "vitamin",
      "mineral",
      "carbohydrate",
      "protein",
      "fat",
      "diet",
      "energy",
      "balanced",
      "health"
    ],
    reasoning: ["because", "for example", "this helps", "which means"]
  },
  Disease: {
    vocabulary: [
      "virus",
      "bacteria",
      "fungi",
      "protozoa",
      "immune system",
      "antibody",
      "t-cell",
      "b-cell",
      "infection",
      "prevention",
      "pathogen",
      "disease"
    ],
    reasoning: ["because", "as a result", "this prevents", "which can spread"]
  },
  "Endocrine System": {
    vocabulary: [
      "hormone",
      "endocrine",
      "gland",
      "metabolism",
      "growth",
      "stress",
      "homeostasis",
      "balance",
      "blood sugar"
    ],
    reasoning: ["because", "this controls", "which helps", "as a result"]
  }
};

function getScoringProfile(category, questionText) {
  const baseProfile = CATEGORY_SCORING_PROFILES[category] || {
    vocabulary: [
      "evidence",
      "reason",
      "example",
      "effect",
      "cause",
      "health",
      "system"
    ],
    reasoning: ["because", "for example", "therefore", "as a result"]
  };

  const questionTerms = (questionText || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 5)
    .slice(0, 8);

  return {
    vocabulary: Array.from(
      new Set([...baseProfile.vocabulary, ...questionTerms])
    ),
    reasoning: Array.from(
      new Set([...baseProfile.reasoning, "because", "for example", "therefore"])
    )
  };
}

function buildAssessment(transcript, studentName, category, questionText) {
  const normalized = (transcript || "").trim();
  const wordCount = normalized ? normalized.split(/\s+/).length : 0;
  const lower = normalized.toLowerCase();
  const profile = getScoringProfile(category, questionText);
  const evidenceSignals = [
    ...profile.reasoning,
    "for instance",
    "this shows",
    "since"
  ];
  const lessonVocabulary = profile.vocabulary;
  const vocabularyUsed = lessonVocabulary.filter((term) => lower.includes(term));
  const evidenceHits = evidenceSignals.filter((term) => lower.includes(term)).length;
  const uniqueVocabularyCount = new Set(vocabularyUsed).size;
  const sentenceCount = normalized
    ? normalized.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0).length
    : 0;
  const hasCompleteResponse = wordCount >= 35 && sentenceCount >= 2;
  const hasDevelopingResponse = wordCount >= 18 && sentenceCount >= 1;
  const hasStrongVocabulary = uniqueVocabularyCount >= 3;
  const hasSomeVocabulary = uniqueVocabularyCount >= 1;
  const hasStrongReasoning = evidenceHits >= 3;
  const hasSomeReasoning = evidenceHits >= 1;

  let score = 1;

  if (hasDevelopingResponse && hasSomeVocabulary && hasSomeReasoning) {
    score = 2;
  }

  if (hasCompleteResponse && hasStrongVocabulary && hasStrongReasoning) {
    score = 3;
  }

  const strengths = [];
  const nextSteps = [];

  if (hasCompleteResponse) {
    strengths.push("your response was complete enough for your teacher to follow your thinking");
  } else if (hasDevelopingResponse) {
    strengths.push("you answered part of the question in a clear way");
  } else {
    nextSteps.push("say more so your answer feels complete instead of very short");
  }

  if (hasStrongVocabulary) {
    strengths.push("you used lesson vocabulary accurately");
  } else if (hasSomeVocabulary) {
    strengths.push("you started to connect your answer to lesson vocabulary");
    nextSteps.push("use more precise lesson words");
  } else {
    nextSteps.push("include academic vocabulary from the lesson");
  }

  if (hasStrongReasoning) {
    strengths.push("you supported your idea with clear evidence or cause-and-effect reasoning");
  } else if (hasSomeReasoning) {
    strengths.push("you gave some reasoning to support your answer");
    nextSteps.push("explain your evidence more clearly");
  } else {
    nextSteps.push("add evidence and explain why your answer makes sense");
  }

  const rubricLevel = getRubricLevel(score);

  return {
    score,
    feedback: `Score ${score}/3. ${
      strengths.length > 0
        ? `You showed that ${strengths.join(" and ")}.`
        : ""
    } ${
      nextSteps.length > 0
        ? `To improve, ${nextSteps.join(" and ")}.`
        : "Your explanation was clear and well supported."
    }`,
    analysis: `${studentName || "The student"} received this score because the response had ${wordCount} words, ${sentenceCount} complete sentence${sentenceCount === 1 ? "" : "s"}, ${uniqueVocabularyCount} lesson vocabulary term${uniqueVocabularyCount === 1 ? "" : "s"} connected to ${category || "the lesson"}, and ${evidenceHits} evidence or reasoning signal${evidenceHits === 1 ? "" : "s"}. ${rubricLevel ? `${score === 3 ? "This fits the rubric because" : score === 2 ? "This matches the developing level because" : "This stays at the beginning level because"} ${rubricLevel.criteria[0].charAt(0).toLowerCase()}${rubricLevel.criteria[0].slice(1)}` : ""}.`,
    vocabularyUsed
  };
}

export default function ThinkOutLoudRecorder({
  student,
  questionId,
  questionText,
  category,
  classId,
  sessionId,
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
  const maxAttempts = 3;
  const retryWindowMs = 15 * 60 * 1000;
  const attemptsRemaining = Math.max(0, maxAttempts - attempts.length);
  const retryWindowActive =
    retryWindowEndsAt === null || retryWindowEndsAt > retryNow;
  const retryWindowTimeLeft =
    retryWindowEndsAt === null
      ? retryWindowMs
      : Math.max(0, retryWindowEndsAt - retryNow);
  const retryWindowLabel = `${Math.floor(retryWindowTimeLeft / 60000)}:${Math.floor(
    (retryWindowTimeLeft % 60000) / 1000
  )
    .toString()
    .padStart(2, "0")}`;
  const canAttemptAgain =
    attempts.length < maxAttempts &&
    (attempts.length === 0 || retryWindowActive);

  const bestAttempt = attempts.reduce((best, attempt) => {
    if (!best || (attempt.score ?? 0) > (best.score ?? 0)) {
      return attempt;
    }
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
          const next = prev.filter((attempt) => attempt.id !== activeResponseId);
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
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (attempts.length === 0 || retryWindowEndsAt === null) {
      return;
    }

    const interval = setInterval(() => {
      setRetryNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [attempts.length, retryWindowEndsAt]);

  useEffect(() => {
    if (
      phase !== "feedback" ||
      responseData?.status !== "complete" ||
      responseData?.score !== 3 ||
      !activeResponseId ||
      celebratedResponseRef.current === activeResponseId
    ) {
      return;
    }

    celebratedResponseRef.current = activeResponseId;
    setShowCelebration(true);

    const timeout = setTimeout(() => {
      setShowCelebration(false);
    }, 2600);

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

        setTimeout(() => {
          audioContext.close().catch(() => {});
        }, 700);
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

    if (!responseIdRef.current) {
      responseIdRef.current = doc(collection(db, "responses")).id;
      setActiveResponseId(responseIdRef.current);
    }

    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
      };

      recognition.start();
      recognitionRef.current = recognition;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    setTimer(0);
    setStatusMessage("Recording...");
    setPhase("recording");
    setResponseData(null);
    setActiveResponseId(responseIdRef.current);
    setAudioURL(null);
    setTranscript("");
    setIsSubmitting(false);
    setError("");

    recorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      clearInterval(intervalRef.current);

      const blob = new Blob(audioChunksRef.current, {
        type: "audio/webm"
      });

      const url = URL.createObjectURL(blob);
      setAudioURL(url);
      setRecording(false);
      setPhase("ready");
      setStatusMessage("Recording ready to submit.");

      wavesurferRef.current?.load(url);
      recognitionRef.current?.stop();
    };

    recorder.start();
    setRecording(true);

    intervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    try {
      await setDoc(
        doc(
          db,
          "classes",
          classId,
          "sessions",
          sessionId,
          "recording",
          student
        ),
        {
          student,
          startedAt: Date.now()
        }
      );
    } catch (err) {
      console.error("Recording start error:", err);
    }
  };

  const stopRecording = async () => {
    setStatusMessage("Finishing recording...");
    mediaRecorderRef.current?.stop();

    try {
      await deleteDoc(
        doc(
          db,
          "classes",
          classId,
          "sessions",
          sessionId,
          "recording",
          student
        )
      );
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

    try {
      setError("");
      setIsSubmitting(true);
      setStatusMessage("Submitting your response...");

      const responseId = responseIdRef.current || doc(collection(db, "responses")).id;
      responseIdRef.current = responseId;
      setActiveResponseId(responseId);

      const responseRef = doc(db, "responses", responseId);

      let uploadedAudioURL = audioURL || null;

      if (audioURL) {
        const response = await fetch(audioURL);
        const blob = await response.blob();

        uploadedAudioURL = await audioRepository.uploadAudio(
          blob,
          classId,
          sessionId,
          responseId
        );
      }

      console.log("SUBMIT DATA", {
        studentId: student,
        sessionId,
        audioUrl: uploadedAudioURL
      });

      await setDoc(responseRef, {
        studentId: student,
        classId,
        sessionId,
        attemptNumber: attempts.length + 1,
        studentName: student,
        questionId: questionId || null,
        category: category || null,
        audioUrl: uploadedAudioURL || null,
        transcript: transcript || "",
        createdAt: serverTimestamp(),
        status: "processing"
      });
      setPhase("processing");
      setStatusMessage("Response submitted. Preparing feedback...");

      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      processingTimeoutRef.current = setTimeout(() => {
        setIsSubmitting(false);
        setError("Feedback is taking longer than expected. Please try submitting again.");
        setStatusMessage("Processing is delayed.");
      }, 10000);

      const assessment = buildAssessment(
        transcript,
        student,
        category,
        questionText
      );

      setTimeout(async () => {
        try {
          await updateDoc(responseRef, {
            status: "complete",
            score: assessment.score,
            feedback: assessment.feedback,
            analysis: assessment.analysis,
            vocabularyUsed: assessment.vocabularyUsed,
            completedAt: serverTimestamp()
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
        }
      }, 1500);
    } catch (err) {
      console.error("SUBMIT ERROR", err);
      setError("Submission failed");
      setStatusMessage("Submission failed.");
      setIsSubmitting(false);
      setPhase("ready");
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

      <h2>{category}</h2>

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
          <div>Attempts: {attempts.length}</div>
          <div>
            Best score: {bestAttempt?.score ?? "-"} / 3
          </div>
          <div>Remaining: {attemptsRemaining}</div>
          <div>
            Revision window: {retryWindowActive ? retryWindowLabel : "Closed"}
          </div>
        </div>
      )}

      {recording && (
        <div style={{ marginBottom: 12, fontWeight: "bold" }}>
          Local recording: {Math.floor(timer / 60)}:
          {(timer % 60).toString().padStart(2, "0")}
        </div>
      )}

      {!recording && audioURL && phase !== "feedback" && (
        <div style={{ marginBottom: 12, color: "#555" }}>
          Recording captured and ready to submit.
        </div>
      )}

      <div ref={waveformRef} />

      {!recording &&
        !audioURL &&
        phase !== "processing" &&
        phase !== "feedback" &&
        canAttemptAgain && (
        <button onClick={startRecording}>Start</button>
      )}
      {recording && <button onClick={stopRecording}>Stop</button>}
      {audioURL && phase !== "feedback" && (
        <button disabled={isSubmitting} onClick={finalizeResponse}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      )}

      {statusMessage && <div style={{ marginTop: 12 }}>{statusMessage}</div>}
      {error && <div style={{ marginTop: 8, color: "#c92a2a" }}>{error}</div>}

      {audioURL && phase !== "feedback" && (
        <div style={{ marginTop: 16 }}>
          <audio controls src={audioURL} style={{ width: "100%" }} />
        </div>
      )}

      {phase === "processing" && (
        <p>Processing your response and preparing feedback...</p>
      )}

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
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at top, rgba(255, 236, 153, 0.7), transparent 52%), radial-gradient(circle at bottom right, rgba(255, 169, 77, 0.18), transparent 36%)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: -120,
                  right: -80,
                  width: 260,
                  height: 260,
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
                    width: 12,
                    height: 12,
                    pointerEvents: "none"
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
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: 8,
                          height: 8,
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
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.7)",
                    color: "#7a4e00",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: 0.3,
                    pointerEvents: "none",
                    animation: `tol-ribbon-float 1300ms ease-out ${index * 110}ms forwards`
                  }}
                >
                  {label}
                </div>
              ))}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#2f9e44",
                  color: "white",
                  fontWeight: 700,
                  letterSpacing: 0.3
                }}
              >
                Perfect Score
              </div>
            </>
          )}
          <h2>Feedback</h2>
          <div style={{ marginBottom: 12 }}>
            Attempt {responseData.attemptNumber || attempts.length}
          </div>
          {responseData.score === 3 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                padding: "10px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(255, 212, 59, 0.75)",
                color: "#7a4e00",
                fontWeight: 800,
                animation: "tol-score-glow 1.8s ease-in-out infinite"
              }}
            >
              <span style={{ fontSize: 20 }}>3 / 3</span>
              <span>You nailed it.</span>
            </div>
          )}
          {responseData.score !== 3 && <h3>{responseData.score} / 3</h3>}

          <ScoreBreakdown score={responseData.score} />

          <div style={{ marginTop: 20 }}>
            <h3>Feedback</h3>
            <p>{responseData.feedback}</p>
          </div>

          {responseData.analysis && (
            <div style={{ marginTop: 20 }}>
              <h3>Why You Received This Score</h3>
              <p>{responseData.analysis}</p>
            </div>
          )}

          {responseData.vocabularyUsed?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>Vocabulary Used</h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8
                }}
              >
                {responseData.vocabularyUsed.map((word) => (
                  <span
                    key={word}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#e7f5ff",
                      color: "#1864ab",
                      fontWeight: 600,
                      fontSize: 14
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
              <h3>Playback</h3>
              <audio controls src={audioURL} style={{ width: "100%" }} />
            </div>
          )}

          {transcript && (
            <div style={{ marginTop: 20 }}>
              <h3>Your Response</h3>
              <div
                dangerouslySetInnerHTML={{
                  __html: highlightReasoning(transcript)
                }}
              />
            </div>
          )}

          <button
            onClick={resetForNextAttempt}
            style={{ marginTop: 20 }}
            disabled={!canAttemptAgain}
          >
            {!retryWindowActive
              ? "Revision Window Closed"
              : attempts.length >= maxAttempts
                ? "Maximum Attempts Reached"
                : "Try Again"}
          </button>
        </div>
      )}

      {!retryWindowActive && attempts.length > 0 && phase !== "feedback" && (
        <div style={{ marginTop: 16, color: "#555" }}>
          Your 15-minute revision window has ended.
        </div>
      )}

      {attempts.length >= maxAttempts && phase !== "feedback" && (
        <div style={{ marginTop: 16, color: "#555" }}>
          You have used all 3 attempts.
        </div>
      )}
    </div>
  );
}
