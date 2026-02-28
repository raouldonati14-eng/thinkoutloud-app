export function evaluateResponse(transcript = "", category = "", duration = 0) {
  const text = transcript.toLowerCase().trim();

  let rawScore = 0;
  let matchedConcepts = [];
  let feedback = [];

  /* =================================================
     CORE CONCEPT MAP
  ================================================= */

  const conceptMap = {
    Drugs: {
      core: ["dopamine", "addiction", "tolerance", "withdrawal", "synapse"],
      risk: ["overdose", "dependence", "relapse"],
      influence: ["peer", "media", "family", "pressure"]
    },
    Diseases: {
      core: ["virus", "bacteria", "pathogen", "immune", "t cell", "b cell"],
      process: ["respond", "fight", "attack", "destroy", "activate"],
      prevention: ["vaccine", "wash", "prevent", "protect"]
    },
    Alcohol: {
      core: ["depressant", "bac", "intoxicated", "reaction time"],
      risk: ["cirrhosis", "poisoning", "liver", "addiction"],
      influence: ["peer", "family", "culture"]
    },
    Nutrition: {
      core: ["carbohydrate", "protein", "fat", "vitamin", "minerals"],
      health: ["diabetes", "obesity", "heart disease"],
      reasoning: ["balance", "excess", "deficiency"]
    }
  };

  const categoryData = conceptMap[category] || {};

  /* =================================================
     1️⃣ UNIQUE VOCABULARY MATCHING (NO STACKING)
  ================================================= */

  const uniqueMatches = new Set();

  ["core", "risk", "influence", "process", "prevention", "health", "reasoning"]
    .forEach(type => {
      if (categoryData[type]) {
        categoryData[type].forEach(word => {
          if (text.includes(word)) {
            uniqueMatches.add(word);
          }
        });
      }
    });

  const vocabCount = uniqueMatches.size;
  matchedConcepts = Array.from(uniqueMatches);

  rawScore += vocabCount * 2; // Each concept worth 2 max

  /* =================================================
     2️⃣ REASONING LANGUAGE DETECTION
  ================================================= */

  const reasoningWords = [
    "because",
    "therefore",
    "this causes",
    "this leads to",
    "results in",
    "so that",
    "which means"
  ];

  let reasoningDetected = false;

  reasoningWords.forEach(word => {
    if (text.includes(word)) {
      reasoningDetected = true;
    }
  });

  if (reasoningDetected) rawScore += 4;

  /* =================================================
     3️⃣ DEPTH CHECK (WORD COUNT)
  ================================================= */

  const wordCount = text.split(/\s+/).length;

  if (wordCount > 25) rawScore += 1;
  if (wordCount > 50) rawScore += 2;
  if (wordCount > 75) rawScore += 2;

  /* =================================================
     4️⃣ DURATION BONUS
  ================================================= */

  if (duration >= 60) rawScore += 2;
  else if (duration >= 30) rawScore += 1;

  /* =================================================
     5️⃣ MINIMUM RESPONSE CHECK
  ================================================= */

  if (wordCount < 8) {
    return {
      score: 0,
      feedback: "Response too brief to demonstrate understanding.",
      matchedKeywords: [],
      hasReasoning: false
    };
  }

  /* =================================================
     🎯 FINAL SCORING RUBRIC
  ================================================= */

  let score = 0;

  if (rawScore < 6) {
    score = 0;
    feedback.push("Limited conceptual understanding.");
  }
  else if (rawScore < 12) {
    score = 1;
    feedback.push("Basic understanding with limited explanation.");
  }
  else if (rawScore < 18) {
    score = 2;
    feedback.push("Clear understanding with supported reasoning.");
  }
  else {
    score = 3;
    feedback.push("Strong conceptual understanding with clear, evidence-based reasoning.");
  }

  return {
    score,
    feedback: feedback.join(" "),
    matchedKeywords: matchedConcepts,
    hasReasoning: reasoningDetected
  };
}