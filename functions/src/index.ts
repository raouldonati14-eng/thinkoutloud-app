import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { transcribeFromGCS } from "./services/speech.js";
import OpenAI from "openai";
import { buildUserPrompt } from "./prompts/scorePrompt";
admin.initializeApp();

const db = admin.firestore();

const getMeaningfulWordCount = (text = "") =>
  text
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}']/gu, ""))
    .filter((word) => word.length >= 2).length;

const getSpokenEvidenceCap = (transcript = "") => {
  const spokenWordCount = getMeaningfulWordCount(transcript);

  if (spokenWordCount < 8) {
    return {
      maxScore: 1,
      spokenWordCount,
      reason: "There is not enough spoken evidence to score this as an oral response."
    };
  }

  if (spokenWordCount < 20) {
    return {
      maxScore: 2,
      spokenWordCount,
      reason: "The spoken response is present but still too limited for full oral proficiency."
    };
  }

  return {
    maxScore: 3,
    spokenWordCount,
    reason: ""
  };
};

/* ================= FEEDBACK FUNCTION ================= */
const generateFeedback = (score: number, transcript: string) => {
  if (!transcript) return "Try explaining your thinking more clearly.";
  if (score === 3) return "Excellent explanation. You clearly connected ideas and showed strong reasoning.";
  if (score === 2) return "Good thinking. Try to make your cause-and-effect reasoning even clearer.";
  return "Keep trying. Use words like 'because' or 'this leads to' to explain your thinking.";
};

/* ================= MAIN FUNCTION ================= */
export const submitStudentResponse = onCall(
  { region: "us-central1" },
  async (request) => {
    console.log("🔥 FUNCTION RUNNING");
    console.log("📦 DATA RECEIVED:", request.data);

    const data = request.data as any;
    const { responseId, classCode, sessionId, questionId, student, category, durationSeconds, audioURL } = data;

    if (!responseId || !classCode || !sessionId || !questionId || !student || durationSeconds === undefined || !audioURL) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const classSnap = await db.doc(`classes/${classCode}`).get();
    if (!classSnap.exists) throw new HttpsError("not-found", "Class not found.");

    const teacherId = classSnap.data()?.teacherId;
    if (!teacherId) throw new HttpsError("internal", "Class missing teacher.");

    let transcriptText = "";

    try {
      console.log("🧠 Starting transcription...");
      const bucket = admin.storage().bucket();
      const bucketName = bucket.name;
      console.log("🪵 AUDIO PATH:", audioURL);

      const file = bucket.file(audioURL);
      const [exists] = await file.exists();
      console.log("📁 FILE EXISTS:", exists);

      if (!exists) throw new Error("Audio file does not exist in storage");

      const gcsUri = `gs://${bucketName}/${audioURL}`;
      console.log("🌐 GCS URI:", gcsUri);

      transcriptText = await transcribeFromGCS(gcsUri);
      console.log("📝 TRANSCRIPT:", transcriptText);

      if (!transcriptText) throw new Error("Empty transcript returned");
    } catch (err: any) {
      console.error("❌ TRANSCRIPTION ERROR FULL:", err);
      throw new HttpsError("internal", err.message || "Transcription failed");
    }

    const safeTranscript = transcriptText.toLowerCase();
    const durationMet = durationSeconds >= 60;

    const sentences = safeTranscript
      .replace(/([.!?])([A-Z])/g, "$1 $2")
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const causalPatterns = [
      /because/i, /since/i, /\bso\b/i, /so that/i, /so it/i,
      /therefore/i, /thus/i, /as a result/i, /this means/i, /this shows/i,
      /that'?s why/i, /which means/i, /which leads to/i, /leads to/i,
      /can lead to/i, /results in/i, /results?/i, /due to/i, /causes?/i,
      /creates?/i, /makes?/i, /allows?/i, /driven by/i, /adapt(s|ation)?/i, /if .* then/i
    ];

    let causalChains = 0;
    sentences.forEach((s) => {
      causalPatterns.forEach(pattern => { if (pattern.test(s)) causalChains++; });
    });
    causalChains = Math.min(causalChains, 5);

    const longSentences = sentences.filter(s => s.split(" ").length > 12);
    let conceptLinks = 0;
    for (let i = 0; i < sentences.length - 1; i++) {
      if (sentences[i].length > 20 && sentences[i + 1].length > 20) conceptLinks++;
    }

    console.log("🧠 SENTENCE COUNT:", sentences.length);
    console.log("🧠 CAUSAL CHAINS:", causalChains);
    console.log("🧠 LONG SENTENCES:", longSentences.length);
    console.log("🧠 CONCEPT LINKS:", conceptLinks);

    let score = 1;
    if (durationMet && causalChains >= 2 && longSentences.length >= 2 && conceptLinks >= 1) score = 3;
    else if (durationMet && (causalChains >= 1 || longSentences.length >= 2)) score = 2;

    const reasoningDetected = causalChains > 0;
    console.log("🧠 FINAL SCORE:", score);

    await db.doc(`classes/${classCode}/sessions/${sessionId}/responses/${responseId}`).set({
      classId: classCode, teacherId, questionId, student,
      category: category || "General", transcript: transcriptText,
      durationSeconds, audioURL, score, reasoningDetected,
      status: "graded", timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      score, reasoningDetected, transcript: transcriptText,
      aiFeedback: generateFeedback(score, transcriptText),
      feedback: {
        durationMet, reasoningCount: causalChains,
        explanationDepth: longSentences.length, conceptConnections: conceptLinks
      }
    };
  }
);

/* ================= TRANSLATE FUNCTION ================= */
export const translate = onRequest(
  { region: "us-central1", cors: true, secrets: ["OPENAI_API_KEY"] },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).end(); return; }

    // ✅ OpenAI instantiated inside handler — never at module level
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { text, texts, targetLanguage, context = "student" } = req.body || {};

    const langName: Record<string, string> = {
      es: "Español", pt: "Português", fr: "Français", ht: "Kreyòl Ayisyen",
      ar: "Arabic", zh: "Chinese", vi: "Vietnamese", tl: "Tagalog",
      ko: "Korean", pl: "Polski", ru: "Russian", so: "Soomaali",
      ur: "Urdu", hi: "Hindi", it: "Italiano", ja: "Japanese"
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
        if (!targetLanguage || targetLanguage === "en") { res.json({ translations: texts }); return; }
        const translations = await Promise.all(texts.map(translateText));
        res.json({ translations }); return;
      }
      if (!text || !targetLanguage || targetLanguage === "en") { res.json({ translatedText: text }); return; }
      res.json({ translatedText: await translateText(text) });
    } catch (err) {
      console.error("Translation error:", err);
      Array.isArray(texts)
        ? res.json({ translations: texts })
        : res.json({ translatedText: text });
    }
  }
);

/* ================= SCORE RESPONSE FUNCTION ================= */
export const scoreResponse = onRequest(
  { region: "us-central1", cors: true, secrets: ["OPENAI_API_KEY"] },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).end(); return; }

    const {
      transcript,
      writtenResponse,
      questionText,
      category,
      studentName,
      studentLanguage = "en"
    } = req.body || {};

    if (!transcript && !writtenResponse) {
      res.json({
        score: 1,
        feedback: "No response was provided.",
        analysis: "The student did not submit a response.",
        vocabularyUsed: []
      });
      return;
    }

    // ✅ OpenAI instantiated inside handler — never at module level
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const langNames: Record<string, string> = {
      en: "English", es: "Español", pt: "Português", fr: "Français",
      ht: "Kreyòl Ayisyen", ar: "Arabic", zh: "Chinese", vi: "Vietnamese",
      tl: "Tagalog", ko: "Korean", pl: "Polski", ru: "Russian",
      so: "Soomaali", ur: "Urdu", hi: "Hindi", it: "Italiano", ja: "Japanese"
    };

    const langName = langNames[studentLanguage] || "English";
    const responseText = transcript || writtenResponse || "";
    const writtenText = writtenResponse || "";
    const spokenEvidence = getSpokenEvidenceCap(transcript || "");

    const systemPrompt = `
You are an expert health education teacher scoring a 9th grade student's spoken response.

IMPORTANT RULES:
- If the response contains profanity, slurs, or inappropriate language, assign score 1 regardless of content quality. Note this clearly in the feedback and analysis.
- This is an ORAL LANGUAGE task. Writing may help with idea analysis and coaching, but it cannot replace speaking for the final score.
- If the spoken transcript appears garbled, nonsensical, or does not match the topic, do NOT use the written notes as a substitute for a high score. Score the oral evidence that is actually present.
- If both spoken and written responses are off-topic or empty, assign score 1.
- Score based on MEANING and UNDERSTANDING, not just keyword matching.
- A student may only earn a 3 if the spoken transcript itself contains enough clear, on-topic evidence.

RUBRIC:
- Score 3 (Proficient): Response is complete (35+ words, 2+ sentences), uses 3+ lesson vocabulary terms accurately, AND includes 2+ reasoning signals with content (because, therefore, this leads to, as a result, for example, etc.). The student clearly connects ideas with evidence.
- Score 2 (Developing): Response is partial (18+ words, 1+ sentences), uses at least 1 vocabulary term, AND includes at least 1 reasoning signal with content.
- Score 1 (Beginning): Response is very short, missing vocabulary, lacks reasoning, is off-topic, or contains inappropriate language.

CATEGORY: ${category || "Health"}
QUESTION: ${questionText || "Explain your thinking about this health topic."}
STUDENT NAME: ${studentName || "The student"}

IDEA ANALYSIS INSTRUCTIONS:
If the student provided written notes, extract the key ideas from those notes (each distinct claim or explanation counts as one idea). Then check which of those ideas actually appeared in the spoken response. An idea is "covered" if the spoken response expresses the same meaning, even in different words.

SCORING NOTE:
- Use written notes to understand intended ideas and to generate feedback.
- Do not award a high score just because the writing is strong.
- The score must reflect the strength of the spoken response.

Respond ONLY with valid JSON in this exact format:
{
  "score": 1, 2, or 3,
  "feedback": "2-3 sentence encouraging feedback addressed to the student directly in ${langName}. If profanity was used, note that respectful language is required. Start with a strength if possible, then give one specific next step.",
  "analysis": "1-2 sentence teacher-facing explanation of why this score was given, in English. Note if profanity was detected or if the transcript appeared garbled.",
  "vocabularyUsed": ["array", "of", "lesson", "vocabulary", "words", "found", "in", "response"],
  "ideaCoverage": {
    "covered": 0,
    "total": 0
  },
  "missingIdeas": ["brief description of each idea from written notes not expressed in spoken response"],
  "coveredIdeas": ["brief description of each idea from written notes that was expressed in spoken response"],
  "ideaFeedback": "1 sentence in ${langName} about which ideas were covered well and which were missing. Empty string if no written notes provided."
}
`;

  const userContent = buildUserPrompt({
  questionText: questionText || "",
  writtenResponse: writtenText,
  transcript: responseText
});

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      });

      const raw = completion.choices?.[0]?.message?.content?.trim() || "";
console.log("🔍 RAW GPT OUTPUT:\n", raw);

const clean = raw
  .replace(/^```json\s*/i, "")
  .replace(/```\s*$/i, "")
  .trim();

const parsed = JSON.parse(clean);
console.log("✅ PARSED GPT OUTPUT:", parsed);
      const rawScore = Math.min(3, Math.max(1, Number(parsed.score) || 1));
      const finalScore = Math.min(rawScore, spokenEvidence.maxScore);
      const cappedForSpeaking = finalScore !== rawScore;
      const adjustedFeedback = cappedForSpeaking
        ? `${parsed.feedback || "You showed good thinking in your planning."} To earn full credit, you need to say your ideas aloud with enough detail.`
        : parsed.feedback || "Good effort. Keep practicing.";
      const adjustedAnalysis = cappedForSpeaking
        ? `${parsed.analysis || ""} Score capped at ${spokenEvidence.maxScore} because the spoken response only included ${spokenEvidence.spokenWordCount} meaningful words. Writing was used for idea analysis, but oral evidence is required for full credit.`.trim()
        : parsed.analysis || "";
      res.json({
        score: finalScore,
        feedback: adjustedFeedback,
        analysis: adjustedAnalysis,
        vocabularyUsed: Array.isArray(parsed.vocabularyUsed) ? parsed.vocabularyUsed : [],
        ideaCoverage: parsed.ideaCoverage || null,
        missingIdeas: Array.isArray(parsed.missingIdeas) ? parsed.missingIdeas : [],
        coveredIdeas: Array.isArray(parsed.coveredIdeas) ? parsed.coveredIdeas : [],
        ideaFeedback: parsed.ideaFeedback || ""
      });
    } catch (err) {
      console.error("scoreResponse error:", err);
      res.json({
        score: 1,
        feedback: "We could not generate feedback for this response. Please try again.",
        analysis: "Scoring failed due to an error.",
        vocabularyUsed: [],
        ideaCoverage: null,
        missingIdeas: [],
        coveredIdeas: [],
        ideaFeedback: ""
      });
    }
  }
);
