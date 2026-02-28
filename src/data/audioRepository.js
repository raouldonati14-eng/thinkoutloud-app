import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

export const audioRepository = {
  async uploadAudio(blob, classCode, student, questionId) {
    const timestamp = Date.now();

    const safeStudent = student.replace(/\s+/g, "_");

    // 🔥 New secure path structure
    const path = `audio/${classCode}/${safeStudent}/q${questionId}/${timestamp}.webm`;

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob, {
      contentType: "audio/webm"
    });

    // Return storage path (not download URL)
    return path;
  }
};
