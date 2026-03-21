import React, { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { audioRepository } from "../data/audioRepository";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

export default function ThinkOutLoudRecorder({
  student,
  questionId = 1,
  category = "General",
  classCode,
  sessionId,
  onFinish
}) {

  const MIN_SECONDS = 60;

  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [timer, setTimer] = useState(0);
  const [saved, setSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transcript, setTranscript] = useState("");

  // prevents duplicate response docs
  const [responseStarted, setResponseStarted] = useState(false);

  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const responseIdRef = useRef(null);

  /* ---------- INITIALIZE WAVEFORM ---------- */

  useEffect(() => {

    wavesurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#dee2e6",
      progressColor: "#4dabf7",
      height: 90
    });

    return () => wavesurferRef.current?.destroy();

  }, []);
  /* ---------- PREVENT DUPLICATE SUBMISSIONS ---------- */

useEffect(() => {

  if (!classCode || !sessionId || !student) return;

  const responsesRef = collection(
    db,
    "classes",
    classCode,
    "sessions",
    sessionId,
    "responses"
  );

  const q = query(
    responsesRef,
    where("student", "==", student)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {

    if (!snapshot.empty) {

      const existing = snapshot.docs[0].data();

      if (existing.status === "graded" || existing.status === "submitted") {

        setSaved(true);
        setStatusMessage("You already submitted a response.");

      }

    }

  });

  return () => unsubscribe();

}, [classCode, sessionId, student]);

  /* ---------- START RECORDING ---------- */

  const startRecording = async () => {

    if (responseStarted) return;

    setResponseStarted(true);

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = async (event) => {

          let text = "";

          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + " ";
          }

          setTranscript(text);

          if (responseIdRef.current) {

            await updateDoc(
              doc(
                db,
                "classes",
                classCode,
                "sessions",
                sessionId,
                "responses",
                responseIdRef.current
              ),
              {
                transcript: text,
                status: "recording"
              }
            );

          }

        };

        recognition.start();
        recognitionRef.current = recognition;

      }

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      setTranscript("");
      setTimer(0);
      setSaved(false);
      setStatusMessage("Recording...");

      /* ---------- CREATE RESPONSE DOCUMENT ---------- */

      const docRef = await addDoc(
        collection(
          db,
          "classes",
          classCode,
          "sessions",
          sessionId,
          "responses"
        ),
        {
          student,
          classCode,
          questionId,
          category,
          status: "recording",
          transcript: "",
          durationSeconds: 0,
          timestamp: serverTimestamp()
        }
      );

      responseIdRef.current = docRef.id;

      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {

        clearInterval(intervalRef.current);
        recognitionRef.current?.stop();

        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm"
        });

        const url = URL.createObjectURL(blob);

        setAudioURL(url);
        setRecording(false);

        wavesurferRef.current?.load(url);

        setStatusMessage("Recording complete.");

        if (responseIdRef.current) {

          await updateDoc(
            doc(
              db,
              "classes",
              classCode,
              "sessions",
              sessionId,
              "responses",
              responseIdRef.current
            ),
            {
              status: "processing"
            }
          );

        }

      };

      recorder.start();
      setRecording(true);

      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);

    } catch {

      setStatusMessage("Microphone access denied.");

    }

  };

  /* ---------- STOP RECORDING ---------- */

  const stopRecording = () => {

    if (mediaRecorderRef.current && recording) {

      mediaRecorderRef.current.stop();
      setRecording(false);

    }

  };

  /* ---------- FINALIZE RESPONSE ---------- */

 const finalizeResponse = async () => {

  if (!audioURL || timer < MIN_SECONDS) return;

  try {

    setSubmitting(true);
    setStatusMessage("Uploading audio...");

    const response = await fetch(audioURL);
    const blob = await response.blob();

    const uploadedAudioURL = await audioRepository.uploadAudio(
      blob,
      classCode,
      sessionId,
      responseIdRef.current
    );

    const functions = getFunctions();

    const submitStudentResponse = httpsCallable(
      functions,
      "submitStudentResponse"
    );

    const result = await submitStudentResponse({

      responseId: responseIdRef.current,
      student,
      classCode,
      questionId,
      category,
      transcript,
      durationSeconds: timer,
      audioURL: uploadedAudioURL

    });

    await updateDoc(
      doc(
        db,
        "classes",
        classCode,
        "sessions",
        sessionId,
        "responses",
        responseIdRef.current
      ),
      {
        transcript,
        durationSeconds: timer,
        audioURL: uploadedAudioURL,
        score: result.data.score,
        reasoningDetected: result.data.reasoningDetected,
        status: "graded"
      }
    );

    setSaved(true);
    setSubmitting(false);
    setStatusMessage("Submission successful ✓");
    setResponseStarted(false);

    if (onFinish) {
      onFinish({
        transcript,
        score: result.data.score,
        reasoningDetected: result.data.reasoningDetected
      });
    }

  } catch (error) {

    console.error("Submission error:", error);
    setSubmitting(false);
    setStatusMessage(error.message || "Error submitting.");

  }

};

  /* ---------- UI ---------- */

  return (

    <div style={styles.card}>

      <h2 style={styles.title}>{category}</h2>

      <div style={styles.timer}>
        {Math.floor(timer / 60).toString().padStart(2, "0")}:
        {(timer % 60).toString().padStart(2, "0")}
      </div>

      <div ref={waveformRef} style={{ margin: "20px 0" }} />

      <div style={styles.buttonRow}>

        {!recording && !audioURL && !saved && (
  <button onClick={startRecording} style={styles.primary}>
    Start Recording
  </button>
)}

        {recording && (
          <button onClick={stopRecording} style={styles.secondary}>
           Stop
          </button>
        )}

        {audioURL && !recording && (
          <button
            onClick={finalizeResponse}
            disabled={timer < MIN_SECONDS || submitting}
            style={styles.primary}
          >
            {submitting ? "Submitting..." : "Submit Response"}
          </button>
        )}

      </div>

      {statusMessage && (
        <div style={styles.status}>{statusMessage}</div>
      )}

    </div>

  );

}

/* ---------- STYLES ---------- */

const styles = {

  card: {
    background: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    textAlign: "center",
    maxWidth: "700px",
    margin: "0 auto"
  },

  title: {
    marginBottom: "10px"
  },

  timer: {
    fontSize: "48px",
    fontWeight: "bold",
    marginBottom: "10px"
  },

  buttonRow: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "10px"
  },

  primary: {
    padding: "12px 20px",
    backgroundColor: "#4dabf7",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },

  secondary: {
    padding: "12px 20px",
    backgroundColor: "#e9ecef",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },

  status: {
    marginTop: "15px",
    color: "#555"
  }

};