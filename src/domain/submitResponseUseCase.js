import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export const submitResponseUseCase = async (responseData) => {
  return await addDoc(collection(db, "responses"), responseData);
};
