import { db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export const createQuestion = async (teacherId: string) => {
  if (!teacherId) {
    console.error("❌ Missing teacherId");
    return;
  }

  await addDoc(collection(db, "questions"), {
    questionText: "Why does this happen?",
    instructions: "Explain your reasoning clearly.",
    keyFocus: "Use evidence + counterargument",
    answerCriteria: [
      "Clear claim",
      "At least 1 piece of evidence",
      "Includes counterargument"
    ],
    examples: [],
    aiFeedbackEnabled: true,
    createdBy: teacherId,
    updatedAt: serverTimestamp()
  });
};