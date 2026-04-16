import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import * as admin from "firebase-admin";

admin.initializeApp();

// ✅ FIX: use Firebase config ONLY (more reliable)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeResponse = onDocumentCreated(
  "responses/{responseId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();

    // ✅ guard clause
    if (!data?.originalText || data.originalText.length < 10) {
      logger.log("Skipping short response");
      return;
    }

    const prompt = `
Analyze this student response:

"${data.originalText}"

Return ONLY valid JSON:
{
  "score": number,
  "claim": boolean,
  "evidence": boolean,
  "counterargument": boolean,
  "correct": "",
  "incorrect": "",
  "suggestion": ""
}
`;

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-5.4-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      const content = res.choices?.[0]?.message?.content;

      if (!content) {
        logger.error("No AI response");
        return;
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch (err) {
        logger.error("JSON parse failed:", content);
        return;
      }

      await snap.ref.update({
        reasoning: {
          claim: !!result.claim,
          evidence: !!result.evidence,
          counterargument: !!result.counterargument,
        },
        aiFeedback: {
          score: result.score ?? 0,
          correct: result.correct ?? "",
          incorrect: result.incorrect ?? "",
          suggestion: result.suggestion ?? "",
        },
        isNew: false,
      });

    } catch (error) {
      logger.error("AI analysis failed:", error);
    }
  }
);