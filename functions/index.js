const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.updateLiveAnalytics = functions.firestore
.document("classes/{classId}/sessions/{sessionId}/responses/{responseId}")
.onWrite(async (change, context) => {

  const { classId, sessionId } = context.params;

  const analyticsRef = admin.firestore().doc(
    `classes/${classId}/sessions/${sessionId}/analytics/liveStats`
  );

  const responsesRef = admin.firestore().collection(
    `classes/${classId}/sessions/${sessionId}/responses`
  );

  const snapshot = await responsesRef.get();

  let totalResponses = 0;
  let reasoningDetected = 0;
  let counterarguments = 0;
  let totalScore = 0;

  snapshot.forEach(doc => {

    const r = doc.data();

    totalResponses++;

    if (r.reasoningDetected) reasoningDetected++;

    if (r.counterargumentDetected) counterarguments++;

    totalScore += r.score || 0;

  });

  const avgScore = totalResponses
    ? totalScore / totalResponses
    : 0;

  await analyticsRef.set({
    totalResponses,
    reasoningDetected,
    counterarguments,
    avgScore,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

});