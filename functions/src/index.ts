
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

/* ======================================================
   SUBMIT STUDENT RESPONSE
====================================================== */

export const submitStudentResponse = onCall(
  { region: "us-central1" },
  async (request) => {

    const {
      responseId,
      classCode,
      questionId,
      student,
      category,
      transcript,
      durationSeconds,
      audioURL
    } = request.data;

    /* ================= VALIDATION ================= */

    if (!responseId) {
      throw new HttpsError("invalid-argument", "Missing responseId.");
    }

    if (!classCode || !questionId || !student || !durationSeconds || !audioURL) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const classId = classCode;

    /* ================= LOAD CLASS ================= */

    const classSnap = await db.doc(`classes/${classId}`).get();

    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Class not found.");
    }

    const classData = classSnap.data() || {};

    const teacherId = classData.teacherId;
    const schoolId = classData.schoolId || null;
    const districtId = classData.districtId || null;

    if (!teacherId) {
      throw new HttpsError("internal", "Class missing teacher.");
    }

    /* ================= SCORING ================= */

    const safeTranscript = (transcript || "").toLowerCase();

    const reasoningWords =
      safeTranscript.match(
        /because|therefore|since|evidence|so that|for example|this shows/g
      ) || [];

    let score = 0;

    if (durationSeconds >= 60) score += 1;
    if (reasoningWords.length > 0) score += 2;

    const reasoningDetected = reasoningWords.length > 0;

    /* ================= UPDATE RESPONSE ================= */

    const responseRef = db.collection("responses").doc(responseId);

    await responseRef.update({
      classId,
      teacherId,
      schoolId,
      districtId,
      questionId,
      student,
      category: category || "General",
      transcript: transcript || "",
      durationSeconds,
      audioURL,
      score,
      reasoningDetected,
      status: "graded",
      completed: true,
      deleted: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    /* ================= UPDATE CLASS ANALYTICS ================= */

    const analyticsRef = db.doc(`classAnalytics/${classId}`);

    await db.runTransaction(async (transaction) => {

      const analyticsSnap = await transaction.get(analyticsRef);

      if (!analyticsSnap.exists) {

        transaction.set(analyticsRef, {
          totalResponses: 1,
          totalScore: score,
          reasoningResponses: reasoningDetected ? 1 : 0,
          avgScore: score,
          reasoningRate: reasoningDetected ? 1 : 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      } else {

        const data = analyticsSnap.data() || {};

        const totalResponses = (data.totalResponses || 0) + 1;
        const totalScore = (data.totalScore || 0) + score;
        const reasoningResponses =
          (data.reasoningResponses || 0) + (reasoningDetected ? 1 : 0);

        transaction.update(analyticsRef, {
          totalResponses,
          totalScore,
          reasoningResponses,
          avgScore: totalScore / totalResponses,
          reasoningRate: reasoningResponses / totalResponses,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      }

    });

    /* ================= LOGGING ================= */

    logger.info("Student response graded", {
      classId,
      student,
      questionId,
      score,
      reasoningDetected
    });

    /* ================= RETURN RESULT ================= */

    return {
      success: true,
      responseId,
      score,
      reasoningDetected
    };

  }
);

/* ======================================================
   DAILY FIRESTORE BACKUP
====================================================== */

export const dailyFirestoreBackup = onSchedule(
  {
    region: "us-central1",
    schedule: "0 2 * * *",
    timeZone: "America/New_York",
  },
  async () => {

    const snapshot = await db.collection("responses").get();
    const date = new Date().toISOString().split("T")[0];
    const backupRef = db.collection("backups").doc(date);

    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {

      batch.set(
        backupRef.collection("responses").doc(doc.id),
        doc.data()
      );

      count++;

      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }

    }

    if (count > 0) await batch.commit();

    logger.info(`Backup complete for ${date}`);

  }
);

/* ======================================================
   AUDIO VALIDATION
====================================================== */

export const validateAudioUpload = onObjectFinalized(
  {
    region: "us-central1",
    bucket: "think-out-loud-40d3a.firebasestorage.app",
  },
  async (event) => {

    const file = event.data;

    if (!file.name) return;
    if (!file.name.startsWith("audio/")) return;

    const MAX_SIZE_BYTES = 10 * 1024 * 1024;

    const bucket = admin.storage().bucket();
    const fileRef = bucket.file(file.name);

    if (file.size && Number(file.size) > MAX_SIZE_BYTES) {
      await fileRef.delete();
      return;
    }

    if (!file.contentType?.startsWith("audio/")) {
      await fileRef.delete();
      return;
    }

    logger.info("Audio validated:", file.name);

  }
);
