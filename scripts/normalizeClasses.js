const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const APPLY = process.argv.includes("--apply");
const TEMPLATE_CLASS_NAME = "Gold 2";

const STRUCTURAL_DEFAULTS = {
  active: true,
  classPhase: "instruction",
  lessonLocked: false,
  questionOpen: false,
  currentQuestionIncrement: true,
  spotlightResponseId: null,
  teacherLanguage: "en",
  presentationMode: false,
  slideIndex: 0,
  instructionText: "Explain your reasoning clearly. Use evidence and complete sentences."
};

const CONTENT_DEFAULTS = {};

const STRUCTURAL_FIELDS = Object.keys(STRUCTURAL_DEFAULTS);
const CONTENT_FIELDS = Object.keys(CONTENT_DEFAULTS);

function isDefined(value) {
  return value !== undefined;
}

function valuesDiffer(currentValue, nextValue) {
  return JSON.stringify(currentValue) !== JSON.stringify(nextValue);
}

async function loadGold2Template() {
  const snapshot = await db
    .collection("classes")
    .where("className", "==", TEMPLATE_CLASS_NAME)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.warn(
      `No class named "${TEMPLATE_CLASS_NAME}" was found. Falling back to structural defaults only.`
    );
    return { ...CONTENT_DEFAULTS };
  }

  const gold2 = snapshot.docs[0].data();
  const template = {};

  for (const field of CONTENT_FIELDS) {
    template[field] = isDefined(gold2[field]) ? gold2[field] : CONTENT_DEFAULTS[field];
  }

  console.log(`Using "${TEMPLATE_CLASS_NAME}" as the template source.`);
  return template;
}

function buildPatch(current, template) {
  const patch = {};

  for (const field of STRUCTURAL_FIELDS) {
    const nextValue = STRUCTURAL_DEFAULTS[field];
    if (isDefined(current[field])) {
      continue;
    }
    patch[field] = nextValue;
  }

  for (const field of CONTENT_FIELDS) {
    const nextValue = isDefined(template[field]) ? template[field] : CONTENT_DEFAULTS[field];
    if (isDefined(current[field])) {
      continue;
    }
    patch[field] = nextValue;
  }

  return patch;
}

async function normalizeClasses() {
  const template = await loadGold2Template();
  const snapshot = await db.collection("classes").get();

  if (snapshot.empty) {
    console.log("No classes found.");
    return;
  }

  let changedCount = 0;
  let skippedCount = 0;
  let writeCount = 0;
  let batch = db.batch();
  let batchOps = 0;

  for (const classDoc of snapshot.docs) {
    const current = classDoc.data();
    const patch = buildPatch(current, template);
    const patchKeys = Object.keys(patch);

    if (patchKeys.length === 0) {
      skippedCount += 1;
      continue;
    }

    changedCount += 1;
    console.log("");
    console.log(`[${current.className || classDoc.id}] ${patchKeys.length} field(s) to normalize`);
    patchKeys.forEach((key) => {
      console.log(`  - ${key}: ${JSON.stringify(current[key])} -> ${JSON.stringify(patch[key])}`);
    });

    if (!APPLY) {
      continue;
    }

    patch.updatedAt = FieldValue.serverTimestamp();
    batch.set(classDoc.ref, patch, { merge: true });
    batchOps += 1;

    if (batchOps === 400) {
      await batch.commit();
      writeCount += batchOps;
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (APPLY && batchOps > 0) {
    await batch.commit();
    writeCount += batchOps;
  }

  console.log("");
  console.log(`Classes scanned: ${snapshot.size}`);
  console.log(`Classes already aligned: ${skippedCount}`);
  console.log(`Classes needing updates: ${changedCount}`);

  if (APPLY) {
    console.log(`Classes updated: ${writeCount}`);
    console.log("Normalization complete.");
  } else {
    console.log("Dry run only. Re-run with --apply to write changes.");
  }
}

normalizeClasses()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Class normalization failed:", error);
    process.exit(1);
  });
