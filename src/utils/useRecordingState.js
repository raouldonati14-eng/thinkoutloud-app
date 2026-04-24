import { useEffect, useState } from "react";
import { useRef } from "react";

export function toMillis(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value?.toMillis && typeof value.toMillis === "function") {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }

  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }

  return null;
}

export function getRecordingWindowEnd(classData) {
  const recording = classData?.recording;
  const explicitEnd =
    toMillis(recording?.responseWindowEndsAt) ??
    toMillis(recording?.endsAt);

  if (explicitEnd) {
    return explicitEnd;
  }

  const startTime =
    toMillis(recording?.startTime) ??
    toMillis(recording?.clientStartTime);
  const durationMs =
    typeof recording?.durationMs === "number" &&
    Number.isFinite(recording.durationMs)
      ? recording.durationMs
      : null;

  if (!startTime || durationMs === null) {
    return null;
  }

  return startTime + durationMs;
}

export function getRecordingTimeLeft(classData, now = Date.now()) {
  if (classData?.classPhase !== "recording") {
    return 0;
  }

  const windowEnd = getRecordingWindowEnd(classData);
  if (!windowEnd) {
    return 0;
  }

  return Math.max(0, windowEnd - now);
}

export function getRecordingStatus(classData, now = Date.now()) {
  if (classData?.classPhase !== "recording") {
    return "waiting";
  }

  const windowEnd = getRecordingWindowEnd(classData);
  if (!windowEnd) {
    return "waiting";
  }

  if (now - windowEnd > 12 * 60 * 60 * 1000) {
    console.warn("Ignoring stale recording");
    return "waiting";
  }

  return now < windowEnd ? "active" : "extended";
}

export function formatRecordingTime(timeLeft) {
  const totalSeconds = Math.max(0, Math.ceil((timeLeft || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useRecordingState(classData) {
  const [now, setNow] = useState(Date.now());
  const staleWarningShownRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (classData?.classPhase !== "recording") {
    staleWarningShownRef.current = false;
    return { recordingState: "waiting", timeLeft: 0 };
  }

  const windowEnd = getRecordingWindowEnd(classData);
  if (!windowEnd) {
    staleWarningShownRef.current = false;
    return {
      recordingState: "waiting",
      timeLeft: 0
    };
  }

  if (now - windowEnd > 12 * 60 * 60 * 1000) {
    if (!staleWarningShownRef.current) {
      console.warn("Ignoring stale recording");
      staleWarningShownRef.current = true;
    }
    return {
      recordingState: "waiting",
      timeLeft: 0
    };
  }

  staleWarningShownRef.current = false;
  const remainingMs = Math.max(0, windowEnd - now);

  return {
    recordingState: remainingMs > 0 ? "active" : "extended",
    timeLeft: remainingMs
  };
}
