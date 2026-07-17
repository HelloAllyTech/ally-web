import { describe, expect, it } from "vitest";

import {
  createWatchTracker,
  recordWatchSample,
  shouldReport,
  watchedPctFromSeconds,
} from "../useVideoWatchProgress";

describe("recordWatchSample (unique watched seconds)", () => {
  it("credits every integer second crossed during continuous playback", () => {
    const tracker = createWatchTracker();
    recordWatchSample(tracker, 0);
    recordWatchSample(tracker, 1);
    recordWatchSample(tracker, 2);
    // Seconds 0, 1, 2 watched.
    expect(tracker.watched.size).toBe(3);
  });

  it("does not credit a forward seek (jump larger than the step)", () => {
    const tracker = createWatchTracker();
    recordWatchSample(tracker, 0);
    // Jump from 0 -> 50: a seek, credits nothing but re-anchors.
    recordWatchSample(tracker, 50);
    expect(tracker.watched.size).toBe(0);
    // Continuing from 50 now credits normally.
    recordWatchSample(tracker, 51);
    expect(tracker.watched.has(50)).toBe(true);
  });

  it("counts a re-watched second only once", () => {
    const tracker = createWatchTracker();
    recordWatchSample(tracker, 0);
    recordWatchSample(tracker, 1);
    recordWatchSample(tracker, 2);
    // Re-anchor to the start and replay the same span.
    tracker.lastTime = 0;
    recordWatchSample(tracker, 1);
    recordWatchSample(tracker, 2);
    expect(tracker.watched.size).toBe(3);
  });

  it("ignores non-finite / negative samples", () => {
    const tracker = createWatchTracker();
    recordWatchSample(tracker, Number.NaN);
    recordWatchSample(tracker, -5);
    expect(tracker.watched.size).toBe(0);
    expect(tracker.lastTime).toBeNull();
  });
});

describe("watchedPctFromSeconds", () => {
  it("is 0 for a zero/invalid duration", () => {
    expect(watchedPctFromSeconds(10, 0)).toBe(0);
    expect(watchedPctFromSeconds(10, -1)).toBe(0);
  });

  it("computes a rounded, clamped percentage", () => {
    expect(watchedPctFromSeconds(50, 100)).toBe(50);
    expect(watchedPctFromSeconds(1, 3)).toBe(33);
    // Never exceeds 100 even if unique > floor(duration).
    expect(watchedPctFromSeconds(200, 100)).toBe(100);
  });
});

describe("shouldReport", () => {
  it("never reports a non-increasing percentage", () => {
    expect(shouldReport(40, 40, 0, 100_000)).toBe(false);
    expect(shouldReport(40, 30, 0, 100_000)).toBe(false);
  });

  it("reports immediately when the delta meets the threshold", () => {
    expect(shouldReport(0, 10, 0, 0)).toBe(true);
  });

  it("reports on interval elapse even for a small delta", () => {
    // +5% (below the 10% delta) but 11s since last report.
    expect(shouldReport(0, 5, 0, 11_000)).toBe(true);
    // Same small delta but only 5s elapsed -> hold.
    expect(shouldReport(0, 5, 0, 5_000)).toBe(false);
  });
});
