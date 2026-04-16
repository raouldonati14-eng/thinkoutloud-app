export const submitStudentResponse = onCall(
  { region: "us-central1" },
  async (request) => {

    console.log("🔥 FUNCTION RUNNING");
    console.log("📦 DATA RECEIVED:", request.data);

    const data = request.data || {};

    const responseId = data.responseId;
    let classId = data.classId;
    const classCode = data.classCode;
    const sessionId = data.sessionId;
    const questionId = data.questionId;
    const student = data.student;
    const category = data.category;
    const transcript = data.transcript;
    const durationSeconds = data.durationSeconds;
    const audioURL = data.audioURL;

    console.log("🧪 TRANSCRIPT (FRONTEND):", transcript);
    console.log("🧪 DURATION:", durationSeconds);
    // 🔍 DEBUG — ADD THIS HERE
console.log("🔍 FIELD CHECK:", {
  responseId,
  classId,
  classCode,
  sessionId,
  questionId,
  student,
  durationSeconds,
  audioURL
});

   // ✅ VALIDATION
if (
  !responseId ||
  (!classId && !classCode) ||
  !sessionId ||
  !questionId ||
  !student
)
{
  throw new HttpsError("invalid-argument", "Missing required fields.");
}

/* ================= FIX START ================= */

// 🔥 Convert classCode → classId (if needed)
if (!classId && classCode) {
  const classQuery = await db
    .collection("classes")
    .where("joinCode", "==", classCode)
    .get();

  if (classQuery.empty) {
    throw new HttpsError("not-found", "Class not found");
  }

  classId = classQuery.docs[0].id;
}

/* ================= FIX END ================= */

/* ================= TRANSCRIBE AUDIO ================= */

    let transcriptText = transcript || "";
if (audioURL) {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(audioURL);

    const [fileBuffer] = await file.download();

    const audioBytes = fileBuffer.toString("base64");

    const requestConfig = {
      audio: { content: audioBytes },
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "en-US",
      },
    };

    const [response] = await client.recognize(requestConfig);

    const detectedText = response.results
      .map(r => r.alternatives[0].transcript)
      .join(" ");

    if (detectedText) {
      transcriptText = detectedText;
    }

    console.log("🧠 FINAL TRANSCRIPT:", transcriptText);

  } catch (err) {
    console.error("❌ TRANSCRIPTION ERROR:", err);
  }
} else {
  console.log("⚠️ No audioURL — skipping transcription");
}

    /* ================= SCORING ================= */

    const safeTranscript = (transcriptText || "").toLowerCase();

    const durationMet = durationSeconds >= 60;

    const sentences = safeTranscript
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const causalPatterns = [
  /because/i,
  /since/i,
  /\bso\b/i,
  /so that/i,
  /so it/i,
  /therefore/i,
  /thus/i,
  /as a result/i,
  /this means/i,
  /this shows/i,
  /that'?s why/i,
  /which means/i,
  /which leads to/i,
  /leads to/i,
  /can lead to/i,        // 🔥 NEW
  /results in/i,
  /results?/i,           // 🔥 NEW
  /due to/i,
  /causes?/i,
  /creates?/i,
  /makes?/i,
  /allows?/i,
  /driven by/i,          // 🔥 NEW
  /adapt(s|ation)?/i,    // 🔥 NEW
  /if .* then/i
];

   let causalChains = 0;

sentences.forEach((s) => {
  causalPatterns.forEach(pattern => {
    if (pattern.test(s)) {
      causalChains++;
    }
  });
});

// ✅ cap it
causalChains = Math.min(causalChains, 5);
console.log("🧠 SENTENCE COUNT:", sentences.length);
console.log("🧠 CAUSAL CHAINS:", causalChains);

    const longSentences = sentences.filter(
      s => s.split(" ").length > 12
    );

    let conceptLinks = 0;

    for (let i = 0; i < sentences.length - 1; i++) {
      if (
        sentences[i].length > 20 &&
        sentences[i + 1].length > 20
      ) {
        conceptLinks++;
      }
    }

    let score = 1;

    if (
      durationMet &&
      causalChains >= 2 &&
      longSentences.length >= 2 &&
      conceptLinks >= 1
    ) {
      score = 3;
    } else if (
      durationMet &&
      (causalChains >= 1 || longSentences.length >= 2)
    ) {
      score = 2;
    }

    const reasoningDetected = causalChains > 0;

    console.log("🧠 CHAINS:", causalChains);
    console.log("🧠 SCORE:", score);
    console.log("🧠 LONG SENTENCES:", longSentences.length);
    console.log("🧠 CONCEPT LINKS:", conceptLinks);

    /* ================= SAVE ================= */

console.log("🔥 WRITING TO CLASS:", classId);
console.log("🔥 WRITING TO SESSION:", sessionId);

await db.doc(
  `classes/${classId}/sessions/${sessionId}/responses/${responseId}`
).set({
  student,
  transcript: transcriptText,
  category,
  questionId,
  durationSeconds: durationSeconds || 0,
  audioURL: audioURL || null,
  score,
  reasoningDetected,
  status: "graded",
  timestamp: admin.firestore.FieldValue.serverTimestamp()
});
    /* ================= RETURN ================= */

    return {
  score,
  reasoningDetected,
  transcript: transcriptText,   // 🔥 ADD THIS
  aiFeedback: generateFeedback(score, transcriptText), // 🔥 ADD THIS
  feedback: {
    durationMet,
    reasoningCount: causalChains,
    explanationDepth: longSentences.length,
    conceptConnections: conceptLinks
  }
};
  }
);