export async function convertAudioToText(audioBlob) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("This is a simulated transcript of the student's spoken answer.");
    }, 500);
  });
}

export function getScoreFromResponse(text) {
  return Math.floor(Math.random() * 4);
}
