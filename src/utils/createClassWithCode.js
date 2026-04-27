import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase";

const generateJoinCode = () =>
  Math.random().toString(36).substring(2, 7).toUpperCase();

const DEFAULT_CLASS_FIELDS = {
  active: true,
  classPhase: "instruction",
  lessonLocked: false,
  questionOpen: false,
  category: "Drugs",
  currentLesson: 1,
  currentQuestion: 1,
  currentQuestionIncrement: true,
  activeSessionId: null,
  spotlightResponseId: null,
  teacherLanguage: "en",
  presentationMode: false,
  slideIndex: 0,
  essentialQuestion: "",
  discussionPrompts: [],
  reflectionPrompts: [],
  instructionText: "Explain your reasoning clearly. Use evidence and complete sentences."
};

const omitUndefined = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );

const generateUniqueJoinCode = async () => {
  let code = "";

  do {
    code = generateJoinCode();
  } while ((await getDoc(doc(db, "joinCodes", code))).exists());

  return code;
};

export const createClassWithCode = async ({
  className,
  teacherId,
  teacherName,
  schoolId,
  districtId,
  extraFields = {}
}) => {
  const code = await generateUniqueJoinCode();

  const classRef = doc(collection(db, "classes"));

  await setDoc(classRef, {
    ...DEFAULT_CLASS_FIELDS,
    ...omitUndefined({
      className,
      teacherId,
      teacherName,
      schoolId,
      districtId
    }),
    ...extraFields,
    joinCode: code,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "joinCodes", code), {
    classId: classRef.id
  });

  return {
    classId: classRef.id,
    joinCode: code
  };
};
