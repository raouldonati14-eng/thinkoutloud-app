import { SpeechClient } from "@google-cloud/speech";

const speechClient = new SpeechClient();

export async function transcribeFromGCS(gcsUri: string): Promise<string> {
  const request = {
    audio: { uri: gcsUri },
    config: {
      encoding: "WEBM_OPUS" as const,
      sampleRateHertz: 48000,
      languageCode: "en-US",
      enableAutomaticPunctuation: true,
      model: "latest_long",
    },
  };

  const [operation] = await speechClient.longRunningRecognize(request);
  const [response] = await operation.promise();

  return (
    response.results
      ?.map((r) => r.alternatives?.[0]?.transcript ?? "")
      .join(" ")
      .trim() ?? ""
  );
}