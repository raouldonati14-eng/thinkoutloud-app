const admin = require("firebase-admin");
const path = require("path");

// 🔐 Load service account key
// Replace with the path to your service account JSON file
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Load questions JSON
const questions = require("./questions.json");

async function uploadQuestions() {
  try {
    console.log("Starting batch upload...");

    const batch = db.batch();

    questions.forEach((question) => {
      const docRef = db
        .collection("questions")
        .doc(`Q${question.order}`);

      batch.set(docRef, question);
    });

    await batch.commit();

    console.log("✅ All questions uploaded successfully!");
    process.exit();
  } catch (error) {
    console.error("❌ Error uploading questions:", error);
    process.exit(1);
  }
}

uploadQuestions();