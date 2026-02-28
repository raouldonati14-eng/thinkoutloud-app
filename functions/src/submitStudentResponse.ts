import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const submitStudentResponse = onCall(
  { region: "us-central1" },
  async (request) => {

    const {
      classCode,
      questionId,
      student,
      transcript,
      durationSeconds,
      audioURL
    } = request.data;

    if (!classCode || !questionId || !student || !audioURL) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const questionSnap = await db.collection("questions")
      .where("order", "==", questionId)
      .limit(1)
      .get();

    if (questionSnap.empty) {
      throw new HttpsError("not-found", "Question not found.");
    }

    const question = questionSnap.docs[0].data();

    const keywordMatches = question.keywordBank.filter((word: string) =>
      transcript?.toLowerCase().includes(word.toLowerCase())
    );

    const reasoningMatches = question.reasoningTriggers.filter((phrase: string) =>
      transcript?.toLowerCase().includes(phrase.toLowerCase())
    );

    let score = 0;

    if (durationSeconds >= 60) score += 1;
    if (keywordMatches.length >= 2) score += 1;
    if (reasoningMatches.length >= 1) score += 1;

    await db.collection("responses").add({
      classCode,
      questionId,
      student,
      transcript,
      durationSeconds,
      audioURL,
      keywordMatches,
      reasoningDetected: reasoningMatches.length > 0,
      score,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      score,
      keywordMatches,
      reasoningDetected: reasoningMatches.length > 0
    };
  }
);