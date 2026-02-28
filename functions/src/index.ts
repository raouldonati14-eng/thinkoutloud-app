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
      classCode,
      questionId,
      student,
      category,
      transcript,
      durationSeconds,
      audioURL
    } = request.data;

    if (!classCode || !questionId || !student || !durationSeconds || !audioURL) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const classSnap = await db.doc(`classes/${classCode}`).get();
    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Class not found.");
    }

    const classData = classSnap.data();
    const teacherId = classData?.teacherId;
    const className = classData?.className;

    if (!teacherId) {
      throw new HttpsError("internal", "Class missing teacher.");
    }

    /* ================= SCORING ================= */

    const reasoningWords =
      transcript?.toLowerCase().match(
        /because|therefore|since|evidence|so that|for example|this shows/g
      ) || [];

    let score = 0;

    if (durationSeconds >= 60) score += 1;
    if (reasoningWords.length > 0) score += 2;

    const reasoningDetected = reasoningWords.length > 0;

    /* ================= SAVE ================= */

    await db.collection("responses").add({
      classCode,
      className,
      teacherId,
      questionId,
      student,
      category: category || "General",
      transcript: transcript || "",
      durationSeconds,
      audioURL,
      score,
      reasoningDetected,
      completed: true,
      deleted: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, score, reasoningDetected };
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

/* ======================================================
   RESET CLASS DATA (Secure + Batched)
====================================================== */
export const resetClassData = onCall(
  { region: "us-central1" },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    const { classCode } = request.data;
    if (!classCode) {
      throw new HttpsError("invalid-argument", "Class code required.");
    }

    const teacherUid = request.auth.uid;
    const classSnap = await db.doc(`classes/${classCode}`).get();

    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Class not found.");
    }

    if (classSnap.data()?.teacherId !== teacherUid) {
      throw new HttpsError("permission-denied", "Not your class.");
    }

    const responsesSnap = await db
      .collection("responses")
      .where("classCode", "==", classCode)
      .where("deleted", "!=", true)
      .get();

    let batch = db.batch();
    let count = 0;

    for (const doc of responsesSnap.docs) {
      batch.update(doc.ref, { deleted: true });
      count++;

      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();

    return { success: true };
  }
);

/* ======================================================
   RESTORE CLASS DATA
====================================================== */
export const restoreClassData = onCall(
  { region: "us-central1" },
  async (request) => {

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required.");
    }

    const { classCode } = request.data;
    if (!classCode) {
      throw new HttpsError("invalid-argument", "Class code required.");
    }

    const teacherUid = request.auth.uid;
    const classSnap = await db.doc(`classes/${classCode}`).get();

    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Class not found.");
    }

    if (classSnap.data()?.teacherId !== teacherUid) {
      throw new HttpsError("permission-denied", "Not your class.");
    }

    const deletedResponses = await db
      .collection("responses")
      .where("classCode", "==", classCode)
      .where("deleted", "==", true)
      .get();

    let batch = db.batch();
    let count = 0;

    for (const doc of deletedResponses.docs) {
      batch.update(doc.ref, { deleted: false });
      count++;

      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();

    return { success: true };
  }
);