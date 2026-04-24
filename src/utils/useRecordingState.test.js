import {
  getRecordingStatus,
  getRecordingTimeLeft,
  getRecordingWindowEnd,
  toMillis
} from "./useRecordingState";

describe("useRecordingState helpers", () => {
  it("converts firestore-like timestamps", () => {
    expect(
      toMillis({
        toMillis: () => 1234
      })
    ).toBe(1234);
  });

  it("prefers explicit response window end values", () => {
    const classData = {
      recording: {
        clientStartTime: 1000,
        durationMs: 60000,
        responseWindowEndsAt: 7000
      }
    };

    expect(getRecordingWindowEnd(classData)).toBe(7000);
  });

  it("returns active while the response window is still open", () => {
    const classData = {
      classPhase: "recording",
      recording: {
        responseWindowEndsAt: 10000
      }
    };

    expect(getRecordingStatus(classData, 5000)).toBe("active");
    expect(getRecordingTimeLeft(classData, 5000)).toBe(5000);
  });

  it("returns extended after the shared timer ends", () => {
    const classData = {
      classPhase: "recording",
      recording: {
        responseWindowEndsAt: 10000
      }
    };

    expect(getRecordingStatus(classData, 15000)).toBe("extended");
    expect(getRecordingTimeLeft(classData, 15000)).toBe(0);
  });

  it("treats stale recording windows as waiting", () => {
    const classData = {
      classPhase: "recording",
      recording: {
        responseWindowEndsAt: 1000
      }
    };

    expect(getRecordingStatus(classData, 1000 + 13 * 60 * 60 * 1000)).toBe("waiting");
  });
});
