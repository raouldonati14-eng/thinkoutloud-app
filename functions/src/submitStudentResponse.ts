import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const submitStudentResponse = onCall(
  { region: "us-central1" },
  async (request) => {
    try {
      console.log("🔥 NEW VERSION DEPLOYED");
      console.log("📦 DATA RECEIVED:", JSON.stringify(request.data, null, 2));

      // ✅ Extract data safely
      const {
        responseId,
        classId,
        sessionId,
        questionId,
        student,
        transcript,
        durationSeconds,
        audioURL
      } = request.data || {};

      // ✅ Field check log
      console.log("🔍 FIELD CHECK:", {
        responseId: !!responseId,
        classId: !!classId,
        sessionId: !!sessionId,
        questionId: !!questionId,
        student: !!student,
        durationSeconds,
        audioURL: !!audioURL
      });

      // ✅ Validation
      if (
        !responseId ||
        !classId ||
        !sessionId ||
        !questionId ||
        !student ||
        durationSeconds === undefined ||
        !audioURL
      ) {
        console.error("❌ Missing field(s):", {
          responseId,
          classId,
          sessionId,
          questionId,
          student,
          durationSeconds,
          audioURL
        });

        throw new HttpsError("invalid-argument", "Missing required fields.");
      }

      // 🔍 Get question
      const questionSnap = await db
        .collection("questions")
        .where("order", "==", questionId)
        .limit(1)
        .get();

      if (questionSnap.empty) {
        throw new HttpsError("not-found", "Question not found.");
      }

      const question = questionSnap.docs[0].data() || {};

      // ✅ Strong array validation (better than || [])
      const keywordBank = Array.isArray(question.keywordBank)
        ? question.keywordBank
        : [];

      const reasoningTriggers = Array.isArray(question.reasoningTriggers)
        ? question.reasoningTriggers
        : [];

      // 🧠 Normalize transcript
      const lowerTranscript = (transcript || "").toLowerCase();

      // 🔍 DEBUG LOGS (KEEP TEMPORARILY)
      console.log("🧪 keywordBank:", keywordBank);
      console.log("🧪 reasoningTriggers:", reasoningTriggers);
      console.log("🧪 transcript:", lowerTranscript);

      // ✅ SAFE MATCHING
      const keywordMatches = keywordBank.filter(word =>
        typeof word === "string" &&
        word.trim() !== "" &&
        lowerTranscript.includes(word.toLowerCase())
      );

      const reasoningMatches = reasoningTriggers.filter(phrase =>
        typeof phrase === "string" &&
        phrase.trim() !== "" &&
        lowerTranscript.includes(phrase.toLowerCase())
      );

      // 🎯 Scoring
      let score = 0;

      if (durationSeconds >= 60) score += 1;
      if (keywordMatches.length >= 2) score += 1;
      if (reasoningMatches.length >= 1) score += 1;

      const reasoningDetected = reasoningMatches.length > 0;
      const durationMet = durationSeconds >= 60;

      // 💾 Save (correct path)
      const responseRef = db.doc(
        `classes/${classId}/sessions/${sessionId}/responses/${responseId}`
      );

      await responseRef.set({
        responseId,
        classId,
        sessionId,
        questionId,
        student,
        transcript: transcript || "",
        durationSeconds,
        audioURL,
        keywordMatches,
        reasoningDetected,
        score,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log("✅ RESPONSE SAVED:", responseId);

      // ✅ Return
      return {
        success: true,
        score,
        reasoningDetected,
        feedback: {
          durationMet,
          reasoningCount: reasoningMatches.length
        }
      };

    } catch (err) {
      console.error("❌ FUNCTION ERROR:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", "Unexpected error occurred.");
    }
  }
);