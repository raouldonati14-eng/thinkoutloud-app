import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
  hi: "हिन्दी"
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { text, targetLang, context = "student" } = req.body;

  if (!text || !targetLang || targetLang === "en") {
    return res.status(200).json({ translated: text });
  }

  const langName = SUPPORTED_LANGUAGES[targetLang] || targetLang;

  const systemPrompt = context === "teacher"
    ? `You are a professional educational translator. Translate the following into ${langName} for a high school teacher. Keep all formatting, punctuation, and meaning exactly the same. Return only the translated text.`
    : `You are a professional educational translator. Translate the following into ${langName} for a 9th grade student. Keep the language clear and age-appropriate. Return only the translated text.`;

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