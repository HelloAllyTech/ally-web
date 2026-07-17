import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Unique-watched-seconds tracking + throttled reporting for track video
 * items. Pure helpers are exported for unit testing.
 */

/** Max gap (s) between samples still counted as continuous playback. */
export const MAX_PLAYBACK_STEP_SECONDS = 2;
/** Report at most every N ms ... */
export const REPORT_INTERVAL_MS = 10_000;
/** ... unless the watched percentage moved by at least this much. */
export const REPORT_PCT_DELTA = 10;

export interface WatchTrackerState {
  /** Integer seconds of the timeline that have actually been played. */
  watched: Set<number>;
  /** Playhead position at the previous sample, or null before playback. */
  lastTime: number | null;
}

export const createWatchTracker = (): WatchTrackerState => ({
  watched: new Set<number>(),
  lastTime: null,
});

/**
 * Records a playhead sample. Credits every integer second crossed since the
 * previous sample IF the step is small enough to be continuous playback —
 * larger jumps are seeks and credit nothing (the new position simply becomes
 * the anchor). Mutates the tracker (it is a ref-held accumulator).
 */
export const recordWatchSample = (
  tracker: WatchTrackerState,
  time: number,
  maxStepSeconds: number = MAX_PLAYBACK_STEP_SECONDS,
): void => {
  if (!Number.isFinite(time) || time < 0) return;
  const last = tracker.lastTime;
  if (last !== null && time > last && time - last <= maxStepSeconds) {
    for (let s = Math.floor(last); s < Math.floor(time); s++) {
      tracker.watched.add(s);
    }
    tracker.watched.add(Math.floor(time));
  }
  tracker.lastTime = time;
};

/** Percentage (0-100, rounded) of unique watched seconds vs duration. */
export const watchedPctFromSeconds = (uniqueSeconds: number, durationSeconds: number): number => {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((uniqueSeconds / Math.floor(durationSeconds)) * 100)),
  );
};

/**
 * Should a new percentage be reported now? True when the pct delta since the
 * last report is >= REPORT_PCT_DELTA, or the report interval elapsed with
 * any forward movement.
 */
export const shouldReport = (
  lastReportedPct: number,
  currentPct: number,
  lastReportAtMs: number,
  nowMs: number,
  intervalMs: number = REPORT_INTERVAL_MS,
  pctDelta: number = REPORT_PCT_DELTA,
): boolean => {
  if (currentPct <= lastReportedPct) return false;
  if (currentPct - lastReportedPct >= pctDelta) return true;
  return nowMs - lastReportAtMs >= intervalMs;
};

interface UseVideoWatchProgressOptions {
  durationSeconds: number;
  /** Server-side monotonic max already recorded for this item. */
  initialMaxWatchedPct?: number;
  /** Called (throttled) with the new max watched percentage. */
  onReport: (watchedPct: number) => void;
  /** Skip tracking entirely (e.g. item already completed). */
  disabled?: boolean;
}

interface UseVideoWatchProgressReturn {
  /** Feed playhead samples (timeupdate events / 1s polls) here. */
  recordTime: (timeSeconds: number) => void;
  /** Feed an externally computed percentage (ProgressVideoPlayer path). */
  recordPct: (watchedPct: number) => void;
  /** Force-send the current max immediately (pause/unmount). */
  flush: () => void;
  /** Current max watched pct (local ∪ server). */
  watchedPct: number;
}

/**
 * Accumulates unique watched seconds (or externally supplied percentages),
 * and reports the monotonic max — throttled to every 10s or a +10% jump,
 * with a flush on unmount.
 */
export const useVideoWatchProgress = ({
  durationSeconds,
  initialMaxWatchedPct = 0,
  onReport,
  disabled = false,
}: UseVideoWatchProgressOptions): UseVideoWatchProgressReturn => {
  const trackerRef = useRef<WatchTrackerState>(createWatchTracker());
  const [watchedPct, setWatchedPct] = useState(initialMaxWatchedPct);
  const watchedPctRef = useRef(initialMaxWatchedPct);
  const lastReportedPctRef = useRef(initialMaxWatchedPct);
  const lastReportAtRef = useRef(0);
  const onReportRef = useRef(onReport);
  onReportRef.current = onReport;

  const maybeReport = useCallback(
    (force = false) => {
      if (disabled) return;
      const pct = watchedPctRef.current;
      const now = Date.now();
      const due = force
        ? pct > lastReportedPctRef.current
        : shouldReport(lastReportedPctRef.current, pct, lastReportAtRef.current, now);
      if (due) {
        lastReportedPctRef.current = pct;
        lastReportAtRef.current = now;
        onReportRef.current(pct);
      }
    },
    [disabled],
  );

  const updatePct = useCallback(
    (pct: number) => {
      const next = Math.max(watchedPctRef.current, Math.min(100, pct));
      if (next !== watchedPctRef.current) {
        watchedPctRef.current = next;
        setWatchedPct(next);
      }
      maybeReport();
    },
    [maybeReport],
  );

  const recordTime = useCallback(
    (timeSeconds: number) => {
      if (disabled) return;
      recordWatchSample(trackerRef.current, timeSeconds);
      updatePct(watchedPctFromSeconds(trackerRef.current.watched.size, durationSeconds));
    },
    [disabled, durationSeconds, updatePct],
  );

  const recordPct = useCallback(
    (pct: number) => {
      if (disabled) return;
      updatePct(pct);
    },
    [disabled, updatePct],
  );

  const flush = useCallback(() => {
    maybeReport(true);
  }, [maybeReport]);

  // Flush any unreported progress on unmount.
  useEffect(() => {
    return () => {
      if (!disabled && watchedPctRef.current > lastReportedPctRef.current) {
        lastReportedPctRef.current = watchedPctRef.current;
        onReportRef.current(watchedPctRef.current);
      }
    };
  }, [disabled]);

  return { recordTime, recordPct, flush, watchedPct };
};
