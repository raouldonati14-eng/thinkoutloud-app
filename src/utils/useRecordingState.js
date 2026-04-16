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

export function getRecordingTimeLeft(classData, now = Date.now()) {
  if (classData?.classPhase !== "recording") {
    return 0;
  }

  const recording = classData?.recording;
  const startTime =
    recording?.startTime?.toMillis?.() ??
    recording?.clientStartTime ??
    null;
  const durationMs =
    typeof recording?.durationMs === "number" &&
    Number.isFinite(recording.durationMs)
      ? recording.durationMs
      : null;

  if (!startTime) {
    return durationMs ?? 0;
  }

  if (durationMs === null) {
    return 0;
  }

  if (now - startTime > durationMs * 2) {
    console.warn("Ignoring stale recording");
    return durationMs;
  }

  const elapsed = Math.max(0, now - startTime);
  const remainingMs = Math.max(0, durationMs - elapsed);

  return remainingMs;
}

export function getRecordingStatus(classData, now = Date.now()) {
  if (classData?.classPhase !== "recording") {
    return "waiting";
  }

  const recording = classData?.recording;
  const startTime =
    recording?.startTime?.toMillis?.() ??
    recording?.clientStartTime ??
    null;
  const durationMs =
    typeof recording?.durationMs === "number" &&
    Number.isFinite(recording.durationMs)
      ? recording.durationMs
      : null;

  if (!startTime) {
    return "waiting";
  }

  if (durationMs === null) {
    return "active";
  }

  if (now - startTime > durationMs * 2) {
    console.warn("Ignoring stale recording");
    return "waiting";
  }

  return getRecordingTimeLeft(classData, now) > 0 ? "active" : "extended";
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

  const recording = classData?.recording;
  const startTime =
    recording?.startTime?.toMillis?.() ??
    recording?.clientStartTime ??
    null;
  const durationMs =
    typeof recording?.durationMs === "number" &&
    Number.isFinite(recording.durationMs)
      ? recording.durationMs
      : null;

  if (!startTime) {
    staleWarningShownRef.current = false;
    return {
      recordingState: "waiting",
      timeLeft: durationMs ?? 0
    };
  }

  if (durationMs !== null && now - startTime > durationMs * 3) {
    if (!staleWarningShownRef.current) {
      console.warn("Ignoring stale recording");
      staleWarningShownRef.current = true;
    }
    return {
      recordingState: "waiting",
      timeLeft: durationMs
    };
  }

  staleWarningShownRef.current = false;

  const elapsed = Math.max(0, now - startTime);
  const remainingMs =
    durationMs === null ? 0 : Math.max(0, durationMs - elapsed);

  return {
    recordingState: remainingMs > 0 ? "active" : "extended",
    timeLeft: remainingMs
  };
}
