import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const generateJoinCode = () =>
  Math.random().toString(36).substring(2, 7).toUpperCase();

export const createClassWithCode = async ({
  className,
  teacherId,
  schoolId,
  districtId
}) => {

  const code = generateJoinCode();

  const classRef = doc(collection(db, "classes"));

  await setDoc(classRef, {
    className,
    teacherId,
    schoolId,
    districtId,
    joinCode: code,
    currentQuestion: 1,
    classPhase: "instruction",
    lessonLocked: false,
    active: true
  });

  await setDoc(doc(db, "joinCodes", code), {
    classId: classRef.id
  });

};