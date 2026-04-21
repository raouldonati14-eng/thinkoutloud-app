import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUPPORTED_LANGUAGES = {
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
  it: "Italiano"
};

async function translateWithOpenAI(text, targetLang, context, sourceLang) {
  const langName = SUPPORTED_LANGUAGES[targetLang] || targetLang;

  const sourceHint = sourceLang
    ? `The source language is likely ${SUPPORTED_LANGUAGES[sourceLang] || sourceLang}.`
    : "";

  const audience =
    context === "teacher"
      ? "for a high school teacher"
      : context === "scoring"
        ? "for rubric scoring while preserving exact meaning"
        : "for a 9th grade student";

  const systemPrompt = `
You are a professional educational translator.
Translate the text into ${langName} ${audience}.
${sourceHint}
Keep formatting, punctuation, and meaning intact.
Return ONLY the translated text.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ]
  });

  return response?.choices?.[0]?.message?.content?.trim() || text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const {
    text,
    texts,
    targetLanguage,
    context = "student",
    sourceLang = null,
    force = false
  } = req.body || {};

  try {
    // 🔥 BATCH MODE
    if (Array.isArray(texts)) {
      if (!targetLanguage || targetLanguage === "en") {
        return res.status(200).json({ translations: texts });
      }

      const results = await Promise.all(
        texts.map((t) =>
          translateWithOpenAI(t, targetLanguage, context, sourceLang)
        )
      );

      return res.status(200).json({ translations: results });
    }

    // 🔹 SINGLE MODE
    if (!text || !targetLanguage || (targetLanguage === "en" && !force)) {
      return res.status(200).json({ translatedText: text });
    }

    const translated = await translateWithOpenAI(
      text,
      targetLanguage,
      context,
      sourceLang
    );

    return res.status(200).json({ translatedText: translated });

  } catch (error) {
    console.error("Translation error:", error);

    if (Array.isArray(texts)) {
      return res.status(200).json({ translations: texts });
    }

    return res.status(200).json({ translatedText: text });
  }
}