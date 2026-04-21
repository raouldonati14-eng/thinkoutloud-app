import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import OpenAI from "openai";


const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/translate", async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Translate into ${targetLanguage}. Return only the translation.`,
        },
        { role: "user", content: text },
      ],
    });

    const translated =
      response?.choices?.[0]?.message?.content?.trim() || text;

    res.json({ translatedText: translated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Translation failed" });
  }
});

app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});