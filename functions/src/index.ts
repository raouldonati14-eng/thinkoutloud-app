import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { transcribeFromGCS } from "./services/speech.js";
import OpenAI from "openai";

admin.initializeApp();

const db = admin.firestore();

/* ================= FEEDBACK FUNCTION ================= */
const generateFeedback = (score: number, transcript: string) => {
  if (!transcript) return "Try explaining your thinking more clearly.";

  if (score === 3) {
    return "Excellent explanation. You clearly connected ideas and showed strong reasoning.";
  }

  if (score === 2) {
    return "Good thinking. Try to make your cause-and-effect reasoning even clearer.";
  }

  return "Keep trying. Use words like 'because' or 'this leads to' to explain your thinking.";
};

/* ================= MAIN FUNCTION ================= */
export const submitStudentResponse = onCall(
  { region: "us-central1" },
  async (request) => {

    console.log("🔥 FUNCTION RUNNING");
    console.log("📦 DATA RECEIVED:", request.data);

    const data = request.data as any;

    const {
      responseId,
      classCode,
      sessionId,
      questionId,
      student,
      category,
      durationSeconds,
      audioURL
    } = data;

    /* ================= VALIDATION ================= */
    if (
      !responseId ||
      !classCode ||
      !sessionId ||
      !questionId ||
      !student ||
      durationSeconds === undefined ||
      !audioURL
    ) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    /* ================= LOAD CLASS ================= */
    const classSnap = await db.doc(`classes/${classCode}`).get();

    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Class not found.");
    }

    const teacherId = classSnap.data()?.teacherId;

    if (!teacherId) {
      throw new HttpsError("internal", "Class missing teacher.");
    }

    /* ================= TRANSCRIPTION ================= */
    let transcriptText = "";

    try {
      console.log("🧠 Starting transcription...");

      const bucket = admin.storage().bucket();
      const bucketName = bucket.name;

      console.log("🪵 AUDIO PATH:", audioURL);

      const file = bucket.file(audioURL);
      const [exists] = await file.exists();

      console.log("📁 FILE EXISTS:", exists);

      if (!exists) {
        throw new Error("Audio file does not exist in storage");
      }

      const gcsUri = `gs://${bucketName}/${audioURL}`;
      console.log("🌐 GCS URI:", gcsUri);

      transcriptText = await transcribeFromGCS(gcsUri);

      console.log("📝 TRANSCRIPT:", transcriptText);

      if (!transcriptText) {
        throw new Error("Empty transcript returned");
      }

    } catch (err: any) {
      console.error("❌ TRANSCRIPTION ERROR FULL:", err);
      throw new HttpsError("internal", err.message || "Transcription failed");
    }

    /* ================= SCORING ================= */

    const safeTranscript = transcriptText.toLowerCase();

    const durationMet = durationSeconds >= 60;

    // ✅ FIXED sentence splitting
    const sentences = safeTranscript
      .replace(/([.!?])([A-Z])/g, "$1 $2")
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // ✅ UPGRADED reasoning detection
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
      /can lead to/i,
      /results in/i,
      /results?/i,
      /due to/i,
      /causes?/i,
      /creates?/i,
      /makes?/i,
      /allows?/i,
      /driven by/i,
      /adapt(s|ation)?/i,
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

    // ✅ prevent runaway counts
    causalChains = Math.min(causalChains, 5);

    const longSentences = sentences.filter(
      (s) => s.split(" ").length > 12
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

    // ✅ DEBUG LOGS (critical)
    console.log("🧠 SENTENCE COUNT:", sentences.length);
    console.log("🧠 CAUSAL CHAINS:", causalChains);
    console.log("🧠 LONG SENTENCES:", longSentences.length);
    console.log("🧠 CONCEPT LINKS:", conceptLinks);

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

    console.log("🧠 FINAL SCORE:", score);

    /* ================= SAVE ================= */
    await db.doc(
      `classes/${classCode}/sessions/${sessionId}/responses/${responseId}`
    ).set({
      classId: classCode,
      teacherId,
      questionId,
      student,
      category: category || "General",
      transcript: transcriptText,
      durationSeconds,
      audioURL,
      score,
      reasoningDetected,
      status: "graded",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    /* ================= RETURN ================= */
    return {
      score,
      reasoningDetected,
      transcript: transcriptText,
      aiFeedback: generateFeedback(score, transcriptText),
      feedback: {
        durationMet,
        reasoningCount: causalChains,
        explanationDepth: longSentences.length,
        conceptConnections: conceptLinks
      }
    };
  }
);

/* ================= TRANSLATE FUNCTION ================= */

export const translate = onRequest(
  { region: "us-central1", cors: true },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).end(); return; }

    // ✅ Move it here — inside the handler
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { text, texts, targetLanguage, context = "student" } = req.body || {};

    const langName: Record<string, string> = {
      es: "Español", pt: "Português", fr: "Français", ht: "Kreyòl Ayisyen",
      ar: "Arabic", zh: "Chinese", vi: "Vietnamese", tl: "Tagalog",
      ko: "Korean", pl: "Polski", ru: "Russian", so: "Soomaali",
      ur: "Urdu", hi: "Hindi", it: "Italiano"
    };

    const audience = context === "teacher"
      ? "for a high school teacher"
      : context === "scoring"
        ? "for rubric scoring while preserving exact meaning"
        : "for a 9th grade student";

    const translateText = async (t: string) => {
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `Translate into ${langName[targetLanguage] || targetLanguage} ${audience}. Return ONLY the translated text.`
          },
          { role: "user", content: t }
        ]
      });
      return r?.choices?.[0]?.message?.content?.trim() || t;
    };

    try {
      if (Array.isArray(texts)) {
        if (!targetLanguage || targetLanguage === "en") {
          res.json({ translations: texts }); return;
        }
        const translations = await Promise.all(texts.map(translateText));
        res.json({ translations }); return;
      }

      if (!text || !targetLanguage || targetLanguage === "en") {
        res.json({ translatedText: text }); return;
      }

      res.json({ translatedText: await translateText(text) });
    } catch (err) {
      console.error("Translation error:", err);
      Array.isArray(texts)
        ? res.json({ translations: texts })
        : res.json({ translatedText: text });
    }
  }
);