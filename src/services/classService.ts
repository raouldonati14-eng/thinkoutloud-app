import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export const createClass = async (classId: string, teacherId: string): Promise<void> => {
  await setDoc(doc(db, "classes", classId), {
    className: "Period 3",
    teacherId,
    currentPhase: "instruction",
    activeQuestionId: null,
    createdAt: serverTimestamp()
  });
};