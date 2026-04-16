import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/* ---------------- QUESTIONS ---------------- */

const questions = [
  {
    questionId: "q1",
    order: 1,
    unit: "Drugs",
    category: "Addiction",
    lesson: 1,
    difficulty: "Medium",
    title: "Addiction and the Brain",
    text: "Why might someone continue using drugs even when they know the risks? Explain what happens in the brain and use details from the lesson to support your reasoning.",
    keywordBank: ["dopamine", "reward system", "tolerance", "dependence", "brain changes"],
    reasoningTriggers: ["because", "therefore", "as a result", "this leads to"]
  },
  {
    questionId: "q2",
    order: 2,
    unit: "Drugs",
    category: "Depressants",
    lesson: 1,
    difficulty: "Medium",
    title: "Depressants and Club Drugs",
    text: "Why do some people find depressants appealing, and how can those effects lead to repeated use?",
    keywordBank: ["sedative", "relaxation", "mood", "addiction", "brain chemistry"],
    reasoningTriggers: ["because", "which causes", "as a result"]
  }

  // 👉 continue same structure for all questions
];

/* ---------------- SEED FUNCTION ---------------- */

async function seed() {
  console.log("🔥 Starting question seed...");

  /* ---------- STEP 1: DELETE EXISTING ---------- */

  const snapshot = await db.collection("questions").get();

  if (!snapshot.empty) {
    const deleteBatch = db.batch();

    snapshot.docs.forEach((doc) => {
      deleteBatch.delete(doc.ref);
    });

    await deleteBatch.commit();
    console.log(`🗑 Deleted ${snapshot.size} existing questions`);
  }

  /* ---------- STEP 2: INSERT NEW (BATCH) ---------- */

  const batch = db.batch();

  questions.forEach((q) => {
    if (!q.questionId) {
      throw new Error("❌ Missing questionId");
    }

    const ref = db.collection("questions").doc(q.questionId);

    batch.set(ref, {
      ...q,
      questionId: q.questionId,
      category: q.category,
      lesson: q.lesson,
      released: true,
      version: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();

  console.log(`✅ ${questions.length} Questions Seeded Successfully`);
}

/* ---------------- RUN SCRIPT ---------------- */

seed()
  .then(() => {
    console.log("🎉 DONE");
    process.exit();
  })
  .catch((err) => {
    console.error("❌ SEED ERROR:", err);
    process.exit(1);
  });