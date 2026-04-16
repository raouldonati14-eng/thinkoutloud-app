export const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  ht: "Kreyòl Ayisyen",
  ar: "العربية",
  zh: "中文",
  vi: "Tiếng Việt",
  tl: "Tagalog",
  ko: "한국어",
  pl: "Polski",
  ru: "Русский",
  so: "Soomaali",
  ur: "اردو",
  hi: "हिن्दी"
};

const cache = {};

export async function translateText(text, targetLang, context = "student") {
  if (!text || targetLang === "en") return text;

  const key = `${targetLang}:${context}:${text}`;
  if (cache[key]) return cache[key];

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang, context })
    });

    const data = await res.json();
    const result = data.translated || text;
    cache[key] = result;
    return result;
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
}

export async function translateMany(strings, targetLang, context = "student") {
  if (targetLang === "en") return strings;
  return Promise.all(strings.map(s => translateText(s, targetLang, context)));
}