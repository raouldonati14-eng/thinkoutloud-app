import {
  buildCloseQuestionUpdate,
  buildOpenQuestionUpdate,
  buildPhaseUpdate,
  buildRecordingWindowPayload,
  buildReopenSessionUpdate,
  DEFAULT_RECORDING_DURATION_MS,
  getSessionStatusSummary
} from "./sessionState";

describe("sessionState helpers", () => {
  it("builds a recording window with a 15 minute duration", () => {
    const payload = buildRecordingWindowPayload(1000);

    expect(payload.clientStartTime).toBe(1000);
    expect(payload.durationMs).toBe(DEFAULT_RECORDING_DURATION_MS);
    expect(payload.responseWindowEndsAt).toBe(1000 + DEFAULT_RECORDING_DURATION_MS);
  });

  it("builds instruction updates that safely close the question", () => {
    const update = buildPhaseUpdate("instruction", {}, 2000);

    expect(update.classPhase).toBe("instruction");
    expect(update.questionOpen).toBe(false);
    expect(update.recording).toBeNull();
    expect(update.lessonLocked).toBe(true);
  });

  it("builds recording updates that open the question and attach a window", () => {
    const update = buildOpenQuestionUpdate(
      { activeSessionId: "session-1", essentialQuestion: "Q1", category: "Health" },
      3000
    );

    expect(update.classPhase).toBe("recording");
    expect(update.questionOpen).toBe(true);
    expect(update.activeSessionId).toBe("session-1");
    expect(update.recording.responseWindowEndsAt).toBe(3000 + DEFAULT_RECORDING_DURATION_MS);
  });

  it("builds reopen session updates that resume recording mode", () => {
    const update = buildReopenSessionUpdate(
      "session-99",
      { questionText: "How does immunity work?", category: "Disease" },
      4000
    );

    expect(update.classPhase).toBe("recording");
    expect(update.activeSessionId).toBe("session-99");
    expect(update.essentialQuestion).toBe("How does immunity work?");
    expect(update.category).toBe("Disease");
    expect(update.questionOpen).toBe(true);
  });

  it("summarizes session status for teacher controls", () => {
    const summary = getSessionStatusSummary(
      {
        classPhase: "recording",
        questionOpen: true,
        activeSessionId: "session-1",
        recording: { responseWindowEndsAt: 9000 }
      },
      3000
    );

    expect(summary.phase).toBe("recording");
    expect(summary.questionOpen).toBe(true);
    expect(summary.hasActiveSession).toBe(true);
    expect(summary.remainingMs).toBe(6000);
  });

  it("builds close question updates that clear recording state", () => {
    const update = buildCloseQuestionUpdate(5000);

    expect(update.classPhase).toBe("instruction");
    expect(update.questionOpen).toBe(false);
    expect(update.recording).toBeNull();
    expect(update.slideIndex).toBe(0);
  });
});
