import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Pending edits, grouped by channel. A channel is just a caller-chosen name for
 * one destination — the scribe form uses "summary" for built-in fields and
 * "custom" for custom-field values, because those are two different endpoints.
 */
export type PendingEdits = Record<string, Record<string, unknown>>;

/**
 * The two channels the scribe forms use. Shared so the post-call summary and the
 * Create Note drawer can't drift apart on naming — they write to the same pair
 * of endpoints and are both consumed by the same persist shape.
 */
export const SUMMARY_CHANNEL = "summary";
export const CUSTOM_CHANNEL = "custom";

interface UseFieldAutosaveOptions {
  /**
   * Write the given edits. Resolve on success, throw to mark the save failed.
   * Only the channels/keys that are actually dirty are passed, so this receives
   * a patch — never the whole form.
   */
  onPersist: (pending: PendingEdits) => Promise<void>;
  /** How long to wait after the last keystroke before writing. */
  delayMs?: number;
  /** When false, edits are still tracked but never written automatically. */
  enabled?: boolean;
}

export interface FieldAutosave {
  /** Record an edit and schedule a debounced write. */
  edit: (channel: string, key: string, value: unknown) => void;
  /** Write immediately (Save button, drawer close, tab switch). */
  flush: () => Promise<void>;
  /** Discard pending edits without writing (e.g. switching to another session). */
  reset: () => void;
  saveState: SaveState;
  /** True while any edit is unwritten. Drives button enablement, so it's state. */
  isDirty: boolean;
  /** Same information without waiting for a re-render, for use inside handlers. */
  hasPendingEdits: () => boolean;
  /**
   * The edits not yet written. Callers that re-seed a form from the server need
   * this to know which fields to leave alone — a value that hasn't reached the
   * server yet must survive an incoming refresh.
   */
  getPending: () => PendingEdits;
}

const DEFAULT_DELAY_MS = 800;

// Ceiling for the retry backoff. Retries never stop — the status label promises
// they won't — but a form left open through an outage must not sit there making
// a request every delayMs for as long as the tab is up. Backing off to a request
// every 30s keeps the promise honest while taking the load off a service that is
// already failing.
const MAX_RETRY_DELAY_MS = 30_000;

const isEmpty = (pending: PendingEdits) =>
  Object.values(pending).every(channel => Object.keys(channel).length === 0);

const clone = (pending: PendingEdits): PendingEdits =>
  Object.fromEntries(Object.entries(pending).map(([channel, keys]) => [channel, { ...keys }]));

/**
 * Debounced autosave for form fields.
 *
 * The counsellor-facing problem this solves: scribe used to hold every edit in
 * component state until an explicit Save, so anything that unmounted the form
 * first — a tab switch, closing the sidebar, navigating away — silently threw
 * the work away. Create Note never had that failure mode because it wrote as
 * you typed. This is that machinery, shared, so both paths behave the same.
 *
 * Two design points matter for correctness:
 *
 * - **Pending edits live in a ref, not state.** The value read at write time is
 *   the latest one regardless of render timing, and a re-render mid-debounce
 *   can't resurrect a stale value.
 * - **Dirty state clears only on a confirmed write**, and only for the exact
 *   values that were sent. An edit made while a write is in flight survives it,
 *   so a fast typist can't lose the keystrokes that landed during the request.
 */
export function useFieldAutosave({
  onPersist,
  delayMs = DEFAULT_DELAY_MS,
  enabled = true,
}: UseFieldAutosaveOptions): FieldAutosave {
  const pendingRef = useRef<PendingEdits>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  // Set when edits arrive during an in-flight write, so we write again rather
  // than leaving them to sit until the next keystroke.
  const rerunRef = useRef(false);
  // Consecutive failed writes, for the retry backoff. Cleared the moment one
  // lands, so a single blip doesn't slow down the writes that follow it.
  const retriesRef = useRef(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isDirty, setIsDirty] = useState(false);

  // Keep the latest callback/flags without making flush's identity churn: the
  // debounce timer would otherwise capture whichever closure happened to be
  // current when the timer was set.
  const onPersistRef = useRef(onPersist);
  onPersistRef.current = onPersist;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const delayMsRef = useRef(delayMs);
  delayMsRef.current = delayMs;

  const hasPendingEdits = useCallback(() => !isEmpty(pendingRef.current), []);
  const getPending = useCallback(() => clone(pendingRef.current), []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // write() is declared below and never changes identity; the ref is only here
  // so the shared scheduler can reach it.
  const writeRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Touches only refs, so [] keeps it stable and write()/edit() can depend on it
  // without churning their own identities.
  const scheduleWrite = useCallback((waitMs: number) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // Swallow here: the rejection is reflected in saveState, and an unhandled
      // rejection from a timer would surface as a console error.
      void writeRef.current().catch(() => {});
    }, waitMs);
  }, []);

  const write = useCallback(async (): Promise<void> => {
    if (isEmpty(pendingRef.current)) return;

    // One write at a time. Overlapping requests to the same record can commit
    // out of order, so queue instead and re-run when this one settles.
    if (inFlightRef.current) {
      rerunRef.current = true;
      return inFlightRef.current;
    }

    const sent = clone(pendingRef.current);
    setSaveState("saving");
    let succeeded = false;

    const request = (async () => {
      try {
        await onPersistRef.current(sent);
        succeeded = true;
        // Drop only what was actually written, and only if it hasn't been
        // re-edited since — otherwise a keystroke that landed mid-request would
        // be marked saved without ever having been sent.
        for (const [channel, keys] of Object.entries(sent)) {
          const current = pendingRef.current[channel];
          if (!current) continue;
          for (const [key, value] of Object.entries(keys)) {
            if (key in current && current[key] === value) delete current[key];
          }
          if (Object.keys(current).length === 0) delete pendingRef.current[channel];
        }
        retriesRef.current = 0;
        setIsDirty(!isEmpty(pendingRef.current));
        setSaveState(isEmpty(pendingRef.current) ? "saved" : "saving");
      } catch {
        // Keep the edits pending so the next flush retries them, and let the
        // caller surface the failure rather than pretending it saved. The
        // status label promises "we'll keep trying", so that has to be true
        // even when nothing edits the form again afterwards — dictated fields
        // are filled and flushed once, with no further keystrokes to trigger
        // a retry naturally.
        setSaveState("error");
        if (enabledRef.current) {
          // Exponential backoff, capped. The first retry still comes after the
          // normal delay so a one-off failure recovers as quickly as it used to;
          // it's only a sustained outage that slows down.
          scheduleWrite(Math.min(delayMsRef.current * 2 ** retriesRef.current, MAX_RETRY_DELAY_MS));
          retriesRef.current += 1;
        }
        throw new Error("autosave failed");
      }
    })();

    inFlightRef.current = request.finally(() => {
      inFlightRef.current = null;
    });

    try {
      await inFlightRef.current;
    } finally {
      if (rerunRef.current) {
        rerunRef.current = false;
        // Only chase the queued edits straight away if this write landed. After
        // a failure the backoff timer already owns the retry, and re-running
        // here would step around it and hammer the endpoint at full speed.
        if (succeeded && !isEmpty(pendingRef.current)) void write().catch(() => {});
      }
    }
  }, [scheduleWrite]);

  writeRef.current = write;

  const flush = useCallback(async () => {
    // An explicit Save is the counsellor's escape hatch from a long backoff:
    // it drops the pending timer and tries right now.
    clearTimer();
    await write();
  }, [write]);

  const edit = useCallback(
    (channel: string, key: string, value: unknown) => {
      const channelEdits = pendingRef.current[channel] ?? {};
      channelEdits[key] = value;
      pendingRef.current[channel] = channelEdits;
      setIsDirty(true);
      // Back to "saving"/"idle" from a previous "saved" so the indicator doesn't
      // claim the newest keystroke is already persisted.
      setSaveState(prev => (prev === "saved" ? "idle" : prev));

      if (!enabledRef.current) return;
      // Mid-backoff, the scheduled retry already covers this edit — it sends
      // whatever is pending when it fires. Rescheduling it at the base delay on
      // every keystroke would undo the backoff entirely, which is the one case
      // where a user typing through an outage hammers hardest.
      if (retriesRef.current > 0 && timerRef.current) return;
      scheduleWrite(delayMs);
    },
    [delayMs, scheduleWrite],
  );

  const reset = useCallback(() => {
    clearTimer();
    pendingRef.current = {};
    rerunRef.current = false;
    retriesRef.current = 0;
    setIsDirty(false);
    setSaveState("idle");
  }, []);

  // Last-chance write when the form goes away. Effect cleanup can't await, so
  // this fires the request and lets it finish on its own — the alternative is
  // dropping the final keystroke, which is the bug this hook exists to fix.
  useEffect(
    () => () => {
      clearTimer();
      if (isEmpty(pendingRef.current) || !enabledRef.current) return;

      if (inFlightRef.current) {
        // A save from an earlier keystroke is already in flight. Firing a
        // second one here would overlap it, and the two could land out of
        // order and clobber this newer edit. Mark it for rerun instead —
        // write()'s own completion handler resends whatever's still pending
        // once the in-flight request settles.
        rerunRef.current = true;
        return;
      }

      void onPersistRef.current(clone(pendingRef.current)).catch(() => {});
    },
    [],
  );

  // A full page unload can't be awaited either, so warn instead of silently
  // losing the edit. Browsers show their own generic prompt.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isEmpty(pendingRef.current)) return;
      void onPersistRef.current(clone(pendingRef.current)).catch(() => {});
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return { edit, flush, reset, saveState, isDirty, hasPendingEdits, getPending };
}
