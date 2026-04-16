import {
  getRecordingStatus,
  getRecordingTimeLeft
} from "./useRecordingState";

export function getRecordingState(classData, now) {
  return getRecordingStatus(classData, now);
}

export function getRemainingTime(classData, now) {
  return Math.floor(getRecordingTimeLeft(classData, now) / 1000);
}
