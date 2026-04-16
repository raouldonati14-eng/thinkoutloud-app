import axios from "axios";

export async function transcribeAudio(blob) {
  const formData = new FormData();

  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");

  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    formData,
    {
      headers: {
        "Authorization": `Bearer YOUR_OPENAI_API_KEY`,
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data.text;
}