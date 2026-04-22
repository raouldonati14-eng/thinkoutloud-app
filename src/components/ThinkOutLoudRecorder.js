import React, { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { audioRepository } from "../data/audioRepository";
import { db } from "../firebase";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";
import { highlightReasoning } from "../utils/highlightReasoning";
import { getRubricLevel } from "./teacher/ScoringRubricPanel";
import { translateForScoring, translateText } from "../utils/translate";
import T from "./common/T";
import { useBatchTranslate } from "../hooks/useBatchTranslate";

const ScoreBreakdown = ({ score, studentLanguage }) => {
  const rubric = getRubricLevel(score);

  const texts = [
    "Score Summary",
    `Overall score: ${score} / 3`,
    rubric ? `${rubric.label}: ${rubric.title}` : "",
    ...(rubric ? rubric.criteria.slice(0, 3) : [])
  ];

  const translated = useBatchTranslate(texts, studentLanguage);

  if (!translated || translated.length === 0) {
    return null;
  }

  const [scoreSummary, overallScore, rubricHeader, ...criteriaTranslated] =
    translated;

  return (
    <div
      style={{
        marginTop: 20,
        background: "#ffffff",
        padding: 16,
        borderRadius: 10,
        border: "1px solid #e5e7eb"
      }}
    >
      <h3>{scoreSummary}</h3>
      <div>{overallScore}</div>
      {rubric && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{ fontWeight: 700, color: rubric.color, marginBottom: 8 }}
          >
            {rubricHeader}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
            {criteriaTranslated.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const CATEGORY_SCORING_PROFILES = {
  Drugs: {
    vocabulary: [
      // Core brain/addiction concepts
      "addiction", "dopamine", "reward", "brain", "craving", "dependence",
      "withdrawal", "tolerance", "synapses", "psychoactive", "drug misuse", "drug abuse",
      "antagonism", "synergism",
      // Drug types — formal
      "depressant", "stimulant", "hallucinogen", "inhalant", "narcotic",
      "barbiturate", "amphetamine", "methamphetamine", "cocaine", "opium",
      "marijuana", "thc", "hashish", "caffeine", "anabolic steroid",
      "performance enhancing", "club drug",
      // Drug types — informal (students speak this way)
      "meth", "weed", "crack", "heroin", "steroids", "ped",
      // Question-specific concepts
      "misuse", "appealing", "repeated use", "health risk", "risk", "unfair",
      "athletic performance", "side effect", "mental health", "mood", "mind", "body"
    ],
    synonyms: {
      "weed": "marijuana", "meth": "methamphetamine", "crack": "cocaine",
      "steroids": "anabolic steroid", "heroin": "narcotic", "ped": "performance enhancing"
    },
    reasoning: [
      "because", "therefore", "so", "as a result", "this leads to",
      "which causes", "this affects", "for example", "this means",
      "which makes", "due to", "since", "even though", "however"
    ],
    questionConcepts: {
      "addiction": ["dopamine", "reward", "craving", "withdrawal", "tolerance", "dependence"],
      "depressant": ["mood", "brain", "repeated use", "appealing", "club drug", "barbiturate"],
      "narcotic": ["misuse", "pain", "opium", "dependence", "withdrawal", "hard to stop"],
      "stimulant": ["energy", "alertness", "cocaine", "amphetamine", "risk", "heart"],
      "hallucinogen": ["perception", "mind", "inhalant", "risky", "effects"],
      "marijuana": ["thc", "brain", "mood", "risk", "lung", "effects"],
      "performance": ["steroid", "unfair", "health", "athlete", "hormone", "risk"]
    }
  },

  Tobacco: {
    vocabulary: [
      "nicotine", "addiction", "tar", "carbon monoxide", "smokeless tobacco",
      "alveoli", "emphysema", "trachea", "bronchi", "lungs", "diaphragm",
      "withdrawal", "psychological dependence", "physical dependence", "tolerance",
      "relapse", "secondhand smoke", "passive smoker", "mainstream smoke",
      "sidestream smoke", "respiratory", "nicotine replacement", "cancer",
      "heart disease", "health risk", "peer pressure", "advertising", "media"
    ],
    synonyms: {
      "smoke": "tobacco", "cig": "tobacco", "cigarette": "tobacco",
      "chew": "smokeless tobacco", "dip": "smokeless tobacco"
    },
    reasoning: [
      "because", "this causes", "as a result", "which can lead to",
      "therefore", "this damages", "for example", "since", "which means"
    ],
    questionConcepts: {
      "start": ["peer pressure", "advertising", "curiosity", "stress", "social"],
      "health risk": ["cancer", "emphysema", "addiction", "heart", "lung", "carbon monoxide"]
    }
  },

  Vaping: {
    vocabulary: [
      "nicotine", "addiction", "cadmium", "cartridge", "electronic cigarette",
      "pod", "vape", "vape pen", "vapor", "aerosol", "chemical", "lungs",
      "health risk", "damage", "alveoli", "respiratory", "flavoring",
      "teen", "advertising", "appealing", "brain development", "popcorn lung"
    ],
    synonyms: {
      "e-cig": "electronic cigarette", "juul": "vape", "e cigarette": "electronic cigarette"
    },
    reasoning: [
      "because", "this can cause", "which leads to", "as a result",
      "this damages", "therefore", "for example", "since", "which means"
    ],
    questionConcepts: {
      "reasons": ["flavoring", "advertising", "peer pressure", "social", "curiosity", "stress relief"],
      "health risk": ["nicotine", "addiction", "aerosol", "chemical", "lung", "cadmium", "brain"]
    }
  },

  Alcohol: {
    vocabulary: [
      "alcohol", "depressant", "fermentation", "intoxicated", "blood alcohol",
      "alcohol poisoning", "malnutrition", "overdose", "ulcer", "alcoholism",
      "neuron", "central nervous system", "binge drinking", "fatty liver", "cirrhosis",
      "fetal alcohol syndrome", "tolerance", "physical dependence", "withdrawal",
      "rehabilitation", "detoxification", "relapse", "reaction time", "zero-tolerance",
      "judgment", "decision", "impaired", "liver", "brain", "heart", "health risk"
    ],
    synonyms: {
      "drunk": "intoxicated", "drinking": "alcohol", "bac": "blood alcohol",
      "fas": "fetal alcohol syndrome", "liver damage": "cirrhosis"
    },
    reasoning: [
      "because", "which can lead to", "as a result", "therefore",
      "this affects", "this causes", "for example", "since", "which impairs"
    ],
    questionConcepts: {
      "reasons": ["social", "peer pressure", "stress", "curiosity", "advertising", "celebration"],
      "health risk": ["liver", "brain", "cirrhosis", "addiction", "alcohol poisoning",
                      "fetal alcohol syndrome", "impaired judgment", "reaction time"]
    }
  },

  "Nervous System": {
    vocabulary: [
      "nervous system", "central nervous system", "peripheral nervous system",
      "neuron", "somatic", "autonomic", "brain", "spinal cord",
      "signal", "response", "reflex", "stimulus", "stimuli",
      "traumatic brain injury", "detect", "process", "react",
      "sense receptor", "sensory", "motor", "synapse", "nerve"
    ],
    synonyms: {
      "cns": "central nervous system", "pns": "peripheral nervous system",
      "nerve cell": "neuron", "tbi": "traumatic brain injury"
    },
    reasoning: [
      "first", "next", "then", "after that", "because", "which sends",
      "this triggers", "so that", "which causes", "in order to", "finally"
    ],
    questionConcepts: {
      "stimulus response": ["detect", "process", "respond", "reflex", "signal",
                            "neuron", "brain", "spinal cord", "sense receptor", "motor"]
    }
  },

  "Mental Health": {
    vocabulary: [
      "mental health", "emotional health", "resilience", "empathy", "self-actualization",
      "self-concept", "self-esteem", "anxiety", "panic", "depression", "stress", "stressor",
      "eustress", "distress", "adrenaline", "fight-or-flight", "coping", "defense mechanism",
      "bipolar", "mood disorder", "phobia", "post-traumatic", "obsessive-compulsive",
      "seasonal affective", "cyberbullying", "optimistic", "confidence",
      "therapist", "psychiatrist", "psychologist", "treatment", "well-being",
      "health triangle", "physical health", "social health", "emotion",
      "fear", "positive", "negative", "disorder", "daily life"
    ],
    synonyms: {
      "ptsd": "post-traumatic", "ocd": "obsessive-compulsive", "sad": "seasonal affective",
      "fight or flight": "fight-or-flight", "self esteem": "self-esteem"
    },
    reasoning: [
      "because", "this affects", "which can lead to", "for example",
      "as a result", "this causes", "when", "if", "however", "on the other hand"
    ],
    questionConcepts: {
      "self-esteem": ["confidence", "well-being", "mental health", "social", "negative", "positive"],
      "fear": ["positive", "negative", "helpful", "unhealthy", "emotion", "response", "protect"],
      "stress": ["physical health", "mental health", "social health", "health triangle",
                 "stressor", "distress", "eustress", "coping", "adrenaline"],
      "disorder": ["treatment", "daily life", "cause", "support", "therapist",
                   "psychiatrist", "psychologist", "well-being"]
    }
  },

  Nutrition: {
    vocabulary: [
      "nutrient", "nutrition", "carbohydrate", "fiber", "protein", "fat",
      "saturated fat", "unsaturated fat", "trans fat", "cholesterol", "hdl", "ldl",
      "vitamin", "mineral", "digestion", "sodium", "food allergy", "foodborne",
      "pasteurization", "calorie", "basal metabolic rate", "electrolyte",
      "eating disorder", "anorexia", "bulimia", "binge eating", "body image",
      "dietary supplement", "insulin", "diabetes", "ketosis",
      "fad diet", "weight cycling", "balanced diet", "energy", "health",
      "myplate", "nutrient-dense", "empty calorie", "food source"
    ],
    synonyms: {
      "carbs": "carbohydrate", "sugar": "carbohydrate",
      "bmr": "basal metabolic rate", "ldl": "low density", "hdl": "high density"
    },
    reasoning: [
      "because", "for example", "this helps", "which means", "as a result",
      "this provides", "which supports", "therefore", "such as", "this gives"
    ],
    questionConcepts: {
      "vitamins minerals": ["source", "health", "balanced", "deficiency", "body function", "food"],
      "carbohydrates": ["energy", "fiber", "simple", "complex", "blood sugar", "helpful", "harmful"],
      "fats": ["saturated", "unsaturated", "trans", "cholesterol", "hdl", "ldl", "heart", "healthy"],
      "protein": ["muscle", "repair", "amino acid", "too little", "too much", "body", "growth"],
      "fad diet": ["short-term", "long-term", "risk", "weight cycling", "health", "extreme"],
      "eating disorder": ["anorexia", "bulimia", "binge eating", "mental health",
                          "physical health", "cause", "treatment", "recovery"]
    }
  },

  Disease: {
    vocabulary: [
      "communicable", "infectious", "virus", "bacteria", "protozoa", "fungi",
      "pathogen", "immune system", "immunity", "immunization", "inflammation",
      "lymphatic", "lymphocyte", "antigen", "antibody", "vaccine", "t cell", "b cell",
      "phagocyte", "contagious", "tuberculosis", "pneumonia", "hepatitis",
      "sexually transmitted", "hiv", "aids", "opportunistic infection",
      "noncommunicable", "cancer", "tumor", "malignant", "carcinogen",
      "cardiovascular", "hypertension", "diabetes", "atherosclerosis",
      "arteriosclerosis", "stroke", "heart attack", "asthma", "allergy", "allergen",
      "prevention", "spread", "infection", "hygiene", "lifestyle", "risk factor",
      "developing country", "access", "healthcare", "education", "treatment"
    ],
    synonyms: {
      "germ": "pathogen", "bug": "pathogen", "white blood cell": "lymphocyte",
      "t-cell": "t cell", "b-cell": "b cell",
      "uv": "ultraviolet", "smoking": "carcinogen"
    },
    reasoning: [
      "because", "as a result", "this prevents", "which can spread",
      "this causes", "therefore", "for example", "which leads to", "since", "such as"
    ],
    questionConcepts: {
      "immune response": ["t cell", "b cell", "antibody", "antigen", "phagocyte",
                          "pathogen", "virus", "inflammation", "lymphocyte", "vaccine"],
      "pathogens": ["bacteria", "fungi", "protozoa", "virus", "spread", "prevention", "hygiene"],
      "hiv": ["developing country", "healthcare", "education", "treatment", "access", "prevention"],
      "cancer": ["lifestyle", "carcinogen", "smoking", "uv", "diet", "risk", "prevention", "tumor"],
      "heart disease": ["exercise", "diet", "smoking", "hypertension", "cholesterol",
                        "atherosclerosis", "lifestyle", "prevention"]
    }
  },

  "Endocrine System": {
    vocabulary: [
      "endocrine", "gland", "pituitary", "adrenal", "hypothalamus",
      "hormone", "metabolism", "homeostasis", "reproduction",
      "estrogen", "progesterone", "testosterone", "insulin", "blood sugar",
      "growth", "stress", "balance", "regulate", "target organ",
      "diabetes", "thyroid", "feedback", "chemical messenger", "imbalance"
    ],
    synonyms: {
      "chemical messenger": "hormone", "blood sugar": "glucose",
      "out of balance": "imbalance", "glands": "gland"
    },
    reasoning: [
      "because", "this controls", "which helps", "as a result",
      "this regulates", "which signals", "therefore", "in order to",
      "when this fails", "if this does not work", "which causes"
    ],
    questionConcepts: {
      "balance": ["growth", "metabolism", "stress", "homeostasis", "hormone",
                  "gland", "regulate", "imbalance", "diabetes", "thyroid"]
    }
  }
};

function getScoringProfile(category, questionText) {
  const base = CATEGORY_SCORING_PROFILES[category] || {
    vocabulary: ["evidence", "reason", "example", "effect", "cause", "health", "system"],
    reasoning: ["because", "for example", "therefore", "as a result"]
  };

  // Pull extra terms from the question itself (words 5+ chars)
  const questionTerms = (questionText || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 5)
    .slice(0, 10);

  // Find which concept cluster best matches this question
  let bonusVocabulary = [];
  if (base.questionConcepts) {
    const qLower = (questionText || "").toLowerCase();
    for (const [key, terms] of Object.entries(base.questionConcepts)) {
      if (key.split(" ").some((k) => qLower.includes(k))) {
        bonusVocabulary = [...bonusVocabulary, ...terms];
      }
    }
  }

  return {
    vocabulary: Array.from(new Set([...base.vocabulary, ...bonusVocabulary, ...questionTerms])),
    reasoning: Array.from(
      new Set([...base.reasoning, "because", "for example", "therefore"])
    ),
    synonyms: base.synonyms || {}
  };
}

function buildAssessment(transcript, studentName, category, questionText) {
  const normalized = (transcript || "").trim();
  const wordCount = normalized ? normalized.split(/\s+/).length : 0;
  const lower = normalized.toLowerCase();

  const profile = getScoringProfile(category, questionText);

  // ── Reasoning detection ──
  const evidenceSignals = [
    ...profile.reasoning,
    "for instance", "this shows", "since", "which means",
    "in order to", "so that", "as a result", "this is because"
  ];

  const sentences = normalized
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Only count reasoning if the same sentence also contains a vocab/content word
  // — prevents false positives like "I don't know because I wasn't listening"
  let meaningfulReasoningHits = 0;
  sentences.forEach((sentence) => {
    const sLower = sentence.toLowerCase();
    const hasReasoning = evidenceSignals.some((signal) => sLower.includes(signal));
    const hasContent = profile.vocabulary.some((term) => sLower.includes(term));
    if (hasReasoning && hasContent) {
      meaningfulReasoningHits++;
    }
  });

  // ── Vocabulary detection — including synonym expansion ──
  const expandedTranscript = (() => {
    let t = lower;
    for (const [informal, formal] of Object.entries(profile.synonyms)) {
      t = t.replace(new RegExp(`\\b${informal}\\b`, "g"), formal);
    }
    return t;
  })();

  const vocabularyUsed = profile.vocabulary.filter((term) =>
    expandedTranscript.includes(term)
  );
  const uniqueVocabularyCount = new Set(vocabularyUsed).size;

  // ── Thresholds ──
  const sentenceCount = sentences.length;
  const hasCompleteResponse = wordCount >= 35 && sentenceCount >= 2;
  const hasDevelopingResponse = wordCount >= 18 && sentenceCount >= 1;
  const hasStrongVocabulary = uniqueVocabularyCount >= 3;
  const hasSomeVocabulary = uniqueVocabularyCount >= 1;
  const hasStrongReasoning = meaningfulReasoningHits >= 2;
  const hasSomeReasoning = meaningfulReasoningHits >= 1;

  // ── Score ──
  let score = 1;
  if (hasDevelopingResponse && hasSomeVocabulary && hasSomeReasoning) score = 2;
  if (hasCompleteResponse && hasStrongVocabulary && hasStrongReasoning) score = 3;

  // ── Feedback strings ──
  const strengths = [];
  const nextSteps = [];

  if (hasCompleteResponse) {
    strengths.push("your response was complete enough for your teacher to follow your thinking");
  } else if (hasDevelopingResponse) {
    strengths.push("you answered part of the question in a clear way");
  } else {
    nextSteps.push("say more so your answer feels complete instead of very short");
  }

  if (hasStrongVocabulary) {
    strengths.push("you used lesson vocabulary accurately");
  } else if (hasSomeVocabulary) {
    strengths.push("you started to connect your answer to lesson vocabulary");
    nextSteps.push("use more precise lesson words");
  } else {
    nextSteps.push("include academic vocabulary from the lesson");
  }

  if (hasStrongReasoning) {
    strengths.push("you supported your idea with clear evidence or cause-and-effect reasoning");
  } else if (hasSomeReasoning) {
    strengths.push("you gave some reasoning to support your answer");
    nextSteps.push("explain your evidence more clearly");
  } else {
    nextSteps.push("add evidence and explain why your answer makes sense");
  }

  const rubricLevel = getRubricLevel(score);
  const strengthsLine =
    strengths.length > 0
      ? `Strengths observed: ${strengths.join("; ")}.`
      : "Strengths observed: none clearly demonstrated yet.";
  const nextStepsLine =
    nextSteps.length > 0
      ? `Next steps: ${nextSteps.join("; ")}.`
      : "Next steps: maintain this level by continuing to use precise vocabulary and explicit evidence.";
  const evidenceLine = `Evidence summary: ${wordCount} words, ${sentenceCount} complete sentence${sentenceCount === 1 ? "" : "s"}, ${uniqueVocabularyCount} lesson vocabulary term${uniqueVocabularyCount === 1 ? "" : "s"}, and ${meaningfulReasoningHits} reasoning signal${meaningfulReasoningHits === 1 ? "" : "s"}.`;
  const rubricLine = rubricLevel
    ? `Rubric alignment: Level ${score} because ${rubricLevel.criteria[0].charAt(0).toLowerCase()}${rubricLevel.criteria[0].slice(1)}.`
    : "";

  return {
    score,
    feedback: `Score ${score}/3. ${strengthsLine} ${nextStepsLine}`,
    analysis: `${studentName || "The student"} received this score for ${category || "the lesson question"}. ${evidenceLine} ${rubricLine}`.trim(),
    vocabularyUsed
  };
}

const RECOGNITION_LANGUAGE_MAP = {
  en: "en-US", es: "es-ES", pt: "pt-BR", fr: "fr-FR", ht: "ht-HT",
  ar: "ar-SA", zh: "zh-CN", vi: "vi-VN", tl: "fil-PH", ko: "ko-KR",
  pl: "pl-PL", ru: "ru-RU", so: "so-SO", ur: "ur-PK", hi: "hi-IN", it: "it-IT"
};

export default function ThinkOutLoudRecorder({
  student,
  questionId,
  questionText,
  category,
  classId,
  sessionId,
  teacherLanguage = "en",
  studentLanguage = "en",
  writtenResponse = "",
  onRecordingChange,
  onFinish
}) {

  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [timer, setTimer] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [activeResponseId, setActiveResponseId] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [phase, setPhase] = useState("recording");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [retryWindowEndsAt, setRetryWindowEndsAt] = useState(null);
  const [retryNow, setRetryNow] = useState(Date.now());

  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const responseIdRef = useRef(null);
  const recognitionRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  const celebratedResponseRef = useRef(null);

  const maxAttempts = 3;
  const MAX_RECORDING_TIME = 45;
  const retryWindowMs = 15 * 60 * 1000;
  const attemptsRemaining = Math.max(0, maxAttempts - attempts.length);
  const retryWindowActive = retryWindowEndsAt === null || retryWindowEndsAt > retryNow;
  const retryWindowTimeLeft =
    retryWindowEndsAt === null ? retryWindowMs : Math.max(0, retryWindowEndsAt - retryNow);
  const retryWindowLabel = `${Math.floor(retryWindowTimeLeft / 60000)}:${Math.floor(
    (retryWindowTimeLeft % 60000) / 1000
  )
    .toString()
    .padStart(2, "0")}`;
  const canAttemptAgain =
    attempts.length < maxAttempts && (attempts.length === 0 || retryWindowActive);

  const bestAttempt = attempts.reduce((best, attempt) => {
    if (!best || (attempt.score ?? 0) > (best.score ?? 0)) return attempt;
    return best;
  }, null);

  useEffect(() => {
    wavesurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#dee2e6",
      progressColor: "#4dabf7",
      height: 90
    });
    return () => wavesurferRef.current?.destroy();
  }, []);

  useEffect(() => {
    if (!activeResponseId) return;
    const responseRef = doc(db, "responses", activeResponseId);
    const unsubscribe = onSnapshot(responseRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setResponseData(data);

      if (data.status === "processing") {
        setPhase("processing");
        setStatusMessage("Analyzing your response...");
      }

      if (data.status === "complete") {
        setPhase("feedback");
        setStatusMessage("Feedback ready.");
        setIsSubmitting(false);
        setError("");
        setRetryWindowEndsAt((prev) => prev ?? Date.now() + retryWindowMs);
        setAttempts((prev) => {
          const next = prev.filter((a) => a.id !== activeResponseId);
          return [
            ...next,
            {
              id: activeResponseId,
              score: data.score,
              feedback: data.feedback,
              analysis: data.analysis,
              attemptNumber: data.attemptNumber || next.length + 1
            }
          ].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));
        });
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
        if (onFinish) onFinish(data);
      }
    });
    return () => unsubscribe();
  }, [activeResponseId, onFinish, retryWindowMs]);

  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (attempts.length === 0 || retryWindowEndsAt === null) return;
    const interval = setInterval(() => setRetryNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [attempts.length, retryWindowEndsAt]);

  useEffect(() => {
    if (
      phase !== "feedback" ||
      responseData?.status !== "complete" ||
      responseData?.score !== 3 ||
      !activeResponseId ||
      celebratedResponseRef.current === activeResponseId
    ) return;

    celebratedResponseRef.current = activeResponseId;
    setShowCelebration(true);
    const timeout = setTimeout(() => setShowCelebration(false), 2600);

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          const startAt = audioContext.currentTime + index * 0.08;
          oscillator.type = "triangle";
          oscillator.frequency.setValueAtTime(frequency, startAt);
          gainNode.gain.setValueAtTime(0.0001, startAt);
          gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.35);
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start(startAt);
          oscillator.stop(startAt + 0.4);
        });
        setTimeout(() => audioContext.close().catch(() => {}), 700);
      }
    } catch (celebrationError) {
      console.error("CELEBRATION AUDIO ERROR", celebrationError);
    }

    return () => clearTimeout(timeout);
  }, [activeResponseId, phase, responseData]);

  const resetForNextAttempt = () => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    responseIdRef.current = null;
    setActiveResponseId(null);
    setAudioURL(null);
    setTranscript(""); 
    setResponseData(null);
    setTimer(0);
    setPhase("recording");
    setStatusMessage("");
    setError("");
    setIsSubmitting(false);
  };

  const startRecording = async () => {
    if (!canAttemptAgain) {
      setError(
        attempts.length >= maxAttempts
          ? "You have reached the maximum of 3 attempts."
          : "Your 15-minute revision window has ended."
      );
      setStatusMessage(
        attempts.length >= maxAttempts
          ? "No attempts remaining."
          : "Revision window closed."
      );
      return;
    }

    if (!classId || !sessionId) {
      setStatusMessage("Session not ready.");
      return;
    }

    if (!responseIdRef.current) {
      responseIdRef.current = doc(collection(db, "responses")).id;
      setActiveResponseId(responseIdRef.current);
    }

    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = RECOGNITION_LANGUAGE_MAP[studentLanguage] || "en-US";
      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
      };
      recognition.start();
      recognitionRef.current = recognition;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    setTimer(0);
    setStatusMessage("Recording...");
    setPhase("recording");
    setResponseData(null);
    setActiveResponseId(responseIdRef.current);
    setAudioURL(null);
    setTranscript("");
    setIsSubmitting(false);
    setError("");

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

    recorder.onstop = () => {
      clearInterval(intervalRef.current);
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioURL(url);
      setRecording(false);
      onRecordingChange?.(false);
      setPhase("ready");
      setStatusMessage("Recording ready to submit.");
      wavesurferRef.current?.load(url);
      recognitionRef.current?.stop();
    };

    recorder.start();
    setRecording(true);
    onRecordingChange?.(true);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev + 1 >= MAX_RECORDING_TIME) {
          stopRecording();
          return MAX_RECORDING_TIME;
        }
        return prev + 1;
      });
    }, 1000);

    try {
      await setDoc(
        doc(db, "classes", classId, "sessions", sessionId, "recording", student),
        { student, startedAt: Date.now() }
      );
    } catch (err) {
      console.error("Recording start error:", err);
    }
  };

  const stopRecording = async () => {
    setStatusMessage("Finishing recording...");
    mediaRecorderRef.current?.stop();
    try {
      await deleteDoc(
        doc(db, "classes", classId, "sessions", sessionId, "recording", student)
      );
    } catch (err) {
      console.error("Recording cleanup error:", err);
    }
  };

  const finalizeResponse = async () => {
    if (isSubmitting || recording) return;
    if (!sessionId) {
      console.error("Missing session");
      setError("Session not ready");
      return;
    }
    if (!classId || !student) return;

    try {
      setError("");
      setIsSubmitting(true);
      setStatusMessage("Submitting your response...");

      const responseId =
        responseIdRef.current || doc(collection(db, "responses")).id;
      responseIdRef.current = responseId;
      setActiveResponseId(responseId);

      const responseRef = doc(db, "responses", responseId);
      let uploadedAudioURL = audioURL || null;

      if (audioURL) {
        const response = await fetch(audioURL);
        const blob = await response.blob();
        uploadedAudioURL = await audioRepository.uploadAudio(
          blob, classId, sessionId, responseId
        );
      }

      console.log("SUBMIT DATA", { studentId: student, sessionId, audioUrl: uploadedAudioURL });

      await setDoc(responseRef, {
        studentId: student,
        classId,
        sessionId,
        responseLanguage: studentLanguage || "en",
        attemptNumber: attempts.length + 1,
        studentName: student,
        questionId: questionId || null,
        category: category || null,
        audioUrl: uploadedAudioURL || null,
        transcript: transcript || "",
        writtenResponse: writtenResponse || "",
        createdAt: serverTimestamp(),
        status: "processing"
      });

      setPhase("processing");
      setStatusMessage("Response submitted. Preparing feedback...");

      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);

      processingTimeoutRef.current = setTimeout(() => {
        setIsSubmitting(false);
        setError("Feedback is taking longer than expected. Please try submitting again.");
        setStatusMessage("Processing is delayed.");
      }, 10000);

      const scoringTranscript = await translateForScoring(transcript, studentLanguage || "en");
      const assessment = buildAssessment(scoringTranscript, student, category, questionText);
      const assessmentLanguage = studentLanguage || teacherLanguage || "en";
      const translatedFeedback = await translateText(assessment.feedback, assessmentLanguage, "student");
      const translatedAnalysis = await translateText(assessment.analysis, assessmentLanguage, "student");

      setTimeout(async () => {
        try {
          await updateDoc(responseRef, {
            status: "complete",
            score: assessment.score,
            feedback: translatedFeedback,
            analysis: translatedAnalysis,
            vocabularyUsed: assessment.vocabularyUsed,
            completedAt: serverTimestamp()
          });
        } catch (updateError) {
          console.error("ASSESSMENT ERROR", updateError);
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          setIsSubmitting(false);
          setError("We could not generate feedback for this response.");
          setStatusMessage("Feedback generation failed.");
        }
      }, 1500);
    } catch (err) {
      console.error("SUBMIT ERROR", err);
      setError("Submission failed");
      setStatusMessage("Submission failed.");
      setIsSubmitting(false);
      setPhase("ready");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <style>{`
        @keyframes tol-firework-burst {
          0% { transform: translate(0, 0) scale(0.2); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
        }
        @keyframes tol-celebration-pop {
          0% { transform: scale(0.92); opacity: 0; }
          20% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tol-ribbon-float {
          0% { transform: translateY(12px); opacity: 0; }
          20% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-8px); opacity: 0; }
        }
        @keyframes tol-score-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(255, 212, 59, 0); }
          50% { box-shadow: 0 0 0 10px rgba(255, 212, 59, 0.18); }
        }
      `}</style>

      {/* ── Attempts summary bar ── */}
      {attempts.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#f8f9fa",
            borderRadius: 10,
            border: "1px solid #e5e7eb"
          }}
        >
          {/* ✅ FIX 2: replaced `forcedage` and all `forcedLanguage` with `studentLanguage` */}
          <T text={`Attempts: ${attempts.length}`} lang={studentLanguage} />
          <T text={`Best score: ${bestAttempt?.score ?? "-"} / 3`} lang={studentLanguage} />
          <T text={`Remaining: ${attemptsRemaining}`} lang={studentLanguage} />
          <T
            text={`Revision window: ${retryWindowActive ? retryWindowLabel : "Closed"}`}
            lang={studentLanguage}
          />
        </div>
      )}

      {/* ── Recording timer ── */}
      {recording && (
        <div style={{ marginBottom: 12, fontWeight: "bold" }}>
          <T text="Local recording:" lang={studentLanguage} />{" "}
          {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
          {" "}/ 0:45
          <div style={{
            marginTop: 6,
            height: 6,
            borderRadius: 3,
            background: "#e9ecef",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${Math.min((timer / MAX_RECORDING_TIME) * 100, 100)}%`,
              background: timer >= MAX_RECORDING_TIME - 10 ? "#f03e3e" : "#4dabf7",
              transition: "width 1s linear, background 0.3s"
            }} />
          </div>
        </div>
      )}

      {/* ── Ready to submit notice ── */}
      {!recording && audioURL && phase !== "feedback" && (
        <div style={{ marginBottom: 12, color: "#555" }}>
          <T text="Recording captured and ready to submit." lang={studentLanguage} />
        </div>
      )}

      <div ref={waveformRef} />

      {/* ── Start button ── */}
      {!recording &&
        !audioURL &&
        phase !== "processing" &&
        phase !== "feedback" &&
        canAttemptAgain && (
          <button onClick={startRecording}>
            <T text="Start" lang={studentLanguage} />
          </button>
        )}

      {/* ── Stop button ── */}
      {recording && (
        <button onClick={stopRecording}>
          <T text="Stop" lang={studentLanguage} />
        </button>
      )}

      {/* ── Submit button ── */}
      {audioURL && phase !== "feedback" && (
        <button disabled={isSubmitting} onClick={finalizeResponse}>
          {isSubmitting ? (
            <T text="Submitting..." lang={studentLanguage} />
          ) : (
            <T text="Submit" lang={studentLanguage} />
          )}
        </button>
      )}

      {/* ── Status / error ── */}
      {statusMessage && (
        <div style={{ marginTop: 12 }}>
          <T text={statusMessage} lang={studentLanguage} />
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, color: "#c92a2a" }}>
          <T text={error} lang={studentLanguage} />
        </div>
      )}

      {/* ── Audio playback (pre-submit) ── */}
      {audioURL && phase !== "feedback" && (
        <div style={{ marginTop: 16 }}>
          <audio controls src={audioURL} style={{ width: "100%" }} />
        </div>
      )}

      {/* ── Processing state ── */}
      {phase === "processing" && (
        <T
          text="Processing your response and preparing feedback..."
          lang={studentLanguage}
        />
      )}

      {/* ── Feedback panel ── */}
      {phase === "feedback" && responseData?.status === "complete" && (
        <div
          style={{
            marginTop: 30,
            padding: 24,
            borderRadius: 12,
            background:
              responseData.score === 3
                ? "linear-gradient(180deg, #fff7cc 0%, #fff3bf 48%, #fff9db 100%)"
                : "#f8f9fa",
            position: "relative",
            overflow: "hidden",
            animation:
              responseData.score === 3 ? "tol-celebration-pop 320ms ease-out" : "none"
          }}
        >
          {showCelebration && responseData.score === 3 && (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(circle at top, rgba(255, 236, 153, 0.7), transparent 52%), radial-gradient(circle at bottom right, rgba(255, 169, 77, 0.18), transparent 36%)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: -120,
                  right: -80,
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.55), transparent 62%)",
                  pointerEvents: "none"
                }}
              />
              {[0, 1, 2].map((burstIndex) => (
                <div
                  key={`burst-${burstIndex}`}
                  style={{
                    position: "absolute",
                    top: burstIndex === 0 ? "22%" : burstIndex === 1 ? "16%" : "24%",
                    left: burstIndex === 0 ? "16%" : burstIndex === 1 ? "50%" : "84%",
                    width: 12,
                    height: 12,
                    pointerEvents: "none"
                  }}
                >
                  {Array.from({ length: 12 }).map((_, particleIndex) => {
                    const angle = (Math.PI * 2 * particleIndex) / 12;
                    const distance = 58 + burstIndex * 12;
                    const colors = ["#ff922b", "#ffd43b", "#fa5252", "#4dabf7", "#12b886"];
                    return (
                      <span
                        key={`particle-${burstIndex}-${particleIndex}`}
                        style={{
                          "--dx": `${Math.cos(angle) * distance}px`,
                          "--dy": `${Math.sin(angle) * distance}px`,
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: colors[(burstIndex + particleIndex) % colors.length],
                          boxShadow: "0 0 14px rgba(255, 212, 59, 0.75)",
                          animation: `tol-firework-burst 1050ms ease-out ${burstIndex * 120}ms forwards`
                        }}
                      />
                    );
                  })}
                </div>
              ))}
              {["Amazing work", "Perfect score", "3 out of 3"].map((label, index) => (
                <div
                  key={label}
                  style={{
                    position: "absolute",
                    top: 54 + index * 30,
                    left: index % 2 === 0 ? 24 : "auto",
                    right: index % 2 === 1 ? 24 : "auto",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.7)",
                    color: "#7a4e00",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: 0.3,
                    pointerEvents: "none",
                    animation: `tol-ribbon-float 1300ms ease-out ${index * 110}ms forwards`
                  }}
                >
                  {label}
                </div>
              ))}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#2f9e44",
                  color: "white",
                  fontWeight: 700,
                  letterSpacing: 0.3
                }}
              >
                Perfect Score
              </div>
            </>
          )}

          {/* ✅ FIX 3: was hardcoded lang="es" — now uses studentLanguage prop */}
          <h2>
            <T text="Feedback" lang={studentLanguage} />
          </h2>

          <div style={{ marginBottom: 12 }}>
            <T
              text={`Attempt ${responseData.attemptNumber || attempts.length}`}
              lang={studentLanguage}
            />
          </div>

          {responseData.score === 3 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                padding: "10px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid rgba(255, 212, 59, 0.75)",
                color: "#7a4e00",
                fontWeight: 800,
                animation: "tol-score-glow 1.8s ease-in-out infinite"
              }}
            >
              <span style={{ fontSize: 20 }}>3 / 3</span>
              <span>
                <T text="You nailed it." lang={studentLanguage} />
              </span>
            </div>
          )}

          {responseData.score !== 3 && <h3>{responseData.score} / 3</h3>}

          <ScoreBreakdown
            score={responseData.score}
            studentLanguage={studentLanguage}
          />

          <div style={{ marginTop: 20 }}>
            <h3>
              <T text="Feedback" lang={studentLanguage} />
            </h3>
            <p>{responseData.feedback}</p>
          </div>

          {responseData.analysis && (
            <div style={{ marginTop: 20 }}>
              <h3>
                <T text="Why You Received This Score" lang={studentLanguage} />
              </h3>
              <p>{responseData.analysis}</p>
            </div>
          )}

          {responseData.vocabularyUsed?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>
                <T text="Vocabulary Used" lang={studentLanguage} />
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {responseData.vocabularyUsed.map((word) => (
                  <span
                    key={word}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#e7f5ff",
                      color: "#1864ab",
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {audioURL && (
            <div style={{ marginTop: 20 }}>
              <h3>
                <T text="Playback" lang={studentLanguage} />
              </h3>
              <audio controls src={audioURL} style={{ width: "100%" }} />
            </div>
          )}

          {transcript && (
            <div style={{ marginTop: 20 }}>
              <h3>
                <T text="Your Response" lang={studentLanguage} />
              </h3>
              <div
                dangerouslySetInnerHTML={{ __html: highlightReasoning(transcript) }}
              />
            </div>
          )}

          <button
            onClick={resetForNextAttempt}
            style={{ marginTop: 20 }}
            disabled={!canAttemptAgain}
          >
            {!retryWindowActive ? (
              <T text="Revision Window Closed" lang={studentLanguage} />
            ) : attempts.length >= maxAttempts ? (
              <T text="Maximum Attempts Reached" lang={studentLanguage} />
            ) : (
              <T text="Try Again" lang={studentLanguage} />
            )}
          </button>
        </div>
      )}

      {/* ── Retry window expired notice ── */}
      {!retryWindowActive && attempts.length > 0 && phase !== "feedback" && (
        <div style={{ marginTop: 16, color: "#555" }}>
          <T
            text="Your 15-minute revision window has ended."
            lang={studentLanguage}
          />
        </div>
      )}

      {/* ── Max attempts notice ── */}
      {attempts.length >= maxAttempts && phase !== "feedback" && (
        <div style={{ marginTop: 16, color: "#555" }}>
          <T text="You have used all 3 attempts." lang={studentLanguage} />
        </div>
      )}
    </div>
  );
}
