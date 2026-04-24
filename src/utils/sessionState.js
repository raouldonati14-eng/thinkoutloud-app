const DEFAULT_RECORDING_DURATION_MS = 15 * 60 * 1000;

export function buildRecordingWindowPayload(now = Date.now()) {
  return {
    clientStartTime: now,
    durationMs: DEFAULT_RECORDING_DURATION_MS,
    responseWindowEndsAt: now + DEFAULT_RECORDING_DURATION_MS
  };
}

export function buildPhaseUpdate(phase, overrides = {}, now = Date.now()) {
  const baseUpdate = {
    classPhase: phase,
    updatedAt: now,
    lessonLocked: phase === "instruction"
  };

  if (phase === "instruction") {
    return {
      ...baseUpdate,
      instructionVisible: true,
      questionOpen: false,
      recording: null,
      ...overrides
    };
  }

  if (phase === "recording") {
    return {
      ...baseUpdate,
      questionOpen: true,
      slideIndex: 0,
      recording: buildRecordingWindowPayload(now),
      ...overrides
    };
  }

  return {
    ...baseUpdate,
    questionOpen: false,
    recording: null,
    ...overrides
  };
}

export function buildOpenQuestionUpdate(classData = {}, now = Date.now()) {
  return buildPhaseUpdate("recording", {
    activeSessionId: classData?.activeSessionId || null,
    essentialQuestion: classData?.essentialQuestion || "",
    category: classData?.category || "General"
  }, now);
}

export function buildCloseQuestionUpdate(now = Date.now()) {
  return buildPhaseUpdate("instruction", {
    slideIndex: 0
  }, now);
}

export function buildReopenSessionUpdate(sessionId, sessionData = {}, now = Date.now()) {
  return buildPhaseUpdate("recording", {
    activeSessionId: sessionId,
    essentialQuestion: sessionData?.questionText || "",
    category: sessionData?.category || "General"
  }, now);
}

export function getSessionStatusSummary(classData = {}, now = Date.now()) {
  const phase = classData?.classPhase || "instruction";
  const windowEnd = classData?.recording?.responseWindowEndsAt || null;
  const remainingMs =
    typeof windowEnd === "number" ? Math.max(0, windowEnd - now) : 0;

  return {
    phase,
    questionOpen: Boolean(classData?.questionOpen),
    hasActiveSession: Boolean(classData?.activeSessionId),
    windowEnd,
    remainingMs
  };
}

export { DEFAULT_RECORDING_DURATION_MS };
