import { db } from "../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";

import { Response } from "../types/response";

// ✍️ WRITE
export const submitResponse = async ({
  classId,
  questionId,
  studentId,
  text,
  language
}: {
  classId: string;
  questionId: string;
  studentId: string;
  text: string;
  language: string;
}) => {
  try {
    const docRef = await addDoc(collection(db, "responses"), {
      classId,
      questionId,
      studentId,

      originalText: text,
      language: language || "en",
      translatedText: "",

      reasoning: null,
      aiFeedback: null,

      isNew: true,

      createdAt: serverTimestamp(),
      createdAtClient: Date.now()
    });

    return docRef.id;
  } catch (error) {
    console.error("Error submitting response:", error);
    throw error;
  }
};

// 📡 READ
export const listenToResponses = (
  classId: string,
  callback: (responses: Response[]) => void
) => {
  const q = query(
    collection(db, "responses"),
    where("classId", "==", classId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const responses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Response[];

    callback(responses);
  });

  return unsubscribe;
};