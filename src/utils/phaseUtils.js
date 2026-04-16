import { getRecordingStatus } from "./useRecordingState";

export function getPhaseView(classData, now) {
  if (!classData) return "loading";

  switch (classData.classPhase) {
    case "instruction":
      return "instruction";

    case "recording":
      if (getRecordingStatus(classData, now) === "waiting") {
        return "instruction";
      }

      return getRecordingStatus(classData, now) === "active"
        ? "recording_active"
        : "recording_extended";

    case "discussion":
      return "discussion";

    case "reflection":
      return "reflection";

    default:
      return "instruction";
  }
}

export function isRecordingPhase(classData) {
  return classData?.classPhase === "recording";
}

export function isDiscussionPhase(classData) {
  return classData?.classPhase === "discussion";
}

export function isReflectionPhase(classData) {
  return classData?.classPhase === "reflection";
}
