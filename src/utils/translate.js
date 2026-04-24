// src/utils/translate.js

export const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  ht: "Kreyòl Ayisyen",
  ar: "Arabic",
  zh: "Chinese",
  vi: "Vietnamese",
  tl: "Tagalog",
  ko: "Korean",
  pl: "Polski",
  ru: "Russian",
  so: "Soomaali",
  ur: "Urdu",
  hi: "Hindi",
  ja: "日本語",
  it: "Italiano"
};

const TRANSLATE_URL =
  process.env.REACT_APP_TRANSLATE_API_URL ||
  process.env.TRANSLATE_API_URL ||
  "/api/translate";

const cache = {};

// 🔹 SINGLE TRANSLATION
export async function translateText(
  text,
  targetLang,
  context = "student",
  options = {}
) {
  const { sourceLang = null, force = false } = options;

  if (!text || typeof text !== "string") return text;

  const trimmed = text.trim();
  if (!trimmed) return text;

  if (targetLang === "en" && !force) return text;

  const key = `${targetLang}:${context}:${sourceLang || ""}:${force ? "1" : "0"}:${trimmed}`;

  if (cache[key]) return cache[key];

  try {
    const res = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: trimmed,
        targetLanguage: targetLang,
        context,
        sourceLang,
        force,
      }),
    });

    if (!res.ok) {
      console.error("Translation API error:", res.status);
      return text;
    }

    const data = await res.json();

    const result =
      data.translatedText ||
      data.translated ||
      text;

    cache[key] = result;

    return result;
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
}

// 🔹 BATCH TRANSLATION
export async function translateMany(strings, targetLang, context = "student") {
  if (!Array.isArray(strings) || strings.length === 0) return [];
  if (targetLang === "en") return strings;

  try {
    const res = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        texts: strings,
        targetLanguage: targetLang,
        context,
      }),
    });

    if (!res.ok) {
      console.error("Batch API error:", res.status);
      return strings;
    }

    const data = await res.json();

    return data.translations || strings;
  } catch (err) {
    console.error("Batch translation failed:", err);
    return strings;
  }
}

// 🔹 FOR SCORING
export async function translateForScoring(text, sourceLang) {
  if (!text || !sourceLang || sourceLang === "en") return text;

  return translateText(text, "en", "scoring", {
    sourceLang,
    force: true,
  });
}
