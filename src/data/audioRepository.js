import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

export const audioRepository = {

  async uploadAudio(blob, classId, sessionId, responseId) {

    const path = `audio/${classId}/${sessionId}/${responseId}.webm`;

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob, {
      contentType: "audio/webm"
    });

    return await getDownloadURL(storageRef);
  }

};
