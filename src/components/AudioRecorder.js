import React, { useState, useRef } from "react";
import { evaluateResponse } from "../utils/evaluateResponse";

export default function AudioRecorder({ onFinish, student = "Demo Student", questionId = "Q1", category = "Nervous System" }) {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);

      // Convert blob to file
      const file = new File([audioBlob], "response.webm", { type: "audio/webm" });

      try {
        // Call Whisper API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("model", "whisper-1");

        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
          },
          body: formData
        });

        const data = await response.json();
        const transcript = data.text || "";

        // Evaluate transcript
        const { score, feedback } = evaluateResponse(transcript);

        const responseData = {
          student,
          classPeriod: localStorage.getItem("activeClassPeriod") || "Unassigned",
          transcript,
          score,
          rubricTag: feedback,
          audioURL: url,
          completed: true,
          timestamp: new Date().toISOString(),
          questionId,
          category
        };

        // Save locally
        const existing = JSON.parse(localStorage.getItem("responses")) || [];
        existing.push(responseData);
        localStorage.setItem("responses", JSON.stringify(existing));

        // Notify dashboard
        onFinish(responseData);
      } catch (err) {
        console.error("Whisper transcription error:", err);
        alert("Failed to transcribe audio. Try again.");
      }
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div style={{ marginTop: "20px" }}>
      {recording ? (
        <button onClick={stopRecording}>⏹ Stop Recording</button>
      ) : (
        <button onClick={startRecording}>🎤 Start Recording</button>
      )}
      {audioURL && (
        <div style={{ marginTop: "15px" }}>
          <audio controls src={audioURL} style={{ width: "300px" }} />
        </div>
      )}
    </div>
  );
}
