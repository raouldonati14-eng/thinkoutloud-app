import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Espanol",
  pt: "Portugues",
  fr: "Francais",
  ht: "Kreyol Ayisyen",
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    text,
    targetLang,
    context = "student",
    sourceLang = null,
    force = false
  } = req.body;

  if (!text || !targetLang || (targetLang === "en" && !force)) {
    return res.status(200).json({ translated: text });
  }

  const langName = SUPPORTED_LANGUAGES[targetLang] || targetLang;

  const baseContext =
    context === "teacher"
      ? "for a high school teacher"
      : context === "scoring"
        ? "for assessment processing while preserving meaning exactly"
        : "for a 9th grade student";

  const sourceHint = sourceLang
    ? `The source language is likely ${SUPPORTED_LANGUAGES[sourceLang] || sourceLang}.`
    : "";

  const systemPrompt = `You are a professional educational translator. Translate the following into ${langName} ${baseContext}. ${sourceHint} Keep formatting, punctuation, and meaning intact. Return only the translated text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.2
    });

    res.status(200).json({
      translated: response.choices[0].message.content.trim()
    });
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed", translated: text });
  }
}

