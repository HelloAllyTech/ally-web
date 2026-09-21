import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COPY_PATHS, DEFAULT_COPY, SjtCopy, isCopyPath, mergeCopy, readCopy } from "./sjtCopy";

/** path → replacement text. Only paths that exist in DEFAULT_COPY are kept. */
export type CopyOverrides = Record<string, string>;

/**
 * Bumped only if the *shape* of a path changes (a renamed section, a field
 * that stops existing). A reworded default doesn't need it: an override is
 * keyed by path, so it simply keeps overriding that line.
 */
export const COPY_STORAGE_KEY = "ally.sjt1.copy.v1";

/** Long enough for the longest paragraph on the page several times over; short
 * enough that a pasted document can't fill this browser's storage quota. */
const MAX_FIELD_LENGTH = 4000;

export const EXPORT_VERSION = 1;

export interface CopyExport {
  version: number;
  generatedAt: string;
  /** How many of the page's lines this file rewords, for a human reading it. */
  changeCount: number;
  changes: CopyOverrides;
}

/**
 * Rebuilds overrides from an untrusted payload — localStorage, or a file a
 * reviewer pasted in. Anything unrecognised is dropped silently rather than
 * failing the page: the worst case is the default wording, which is what a
 * reader would have seen anyway.
 */
export const parseOverrides = (raw: string | null): CopyOverrides => {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  return coerceOverrides(parsed);
};

/** Accepts either an export file (`{ changes }`) or a bare path → text map. */
export const coerceOverrides = (parsed: unknown): CopyOverrides => {
  if (!parsed || typeof parsed !== "object") return {};

  const source =
    "changes" in (parsed as Record<string, unknown>)
      ? (parsed as Record<string, unknown>).changes
      : parsed;
  if (!source || typeof source !== "object") return {};

  const kept: CopyOverrides = {};
  Object.entries(source as Record<string, unknown>).forEach(([path, value]) => {
    if (!isCopyPath(path)) return;
    if (typeof value !== "string" || value.length > MAX_FIELD_LENGTH) return;
    // A field edited back to its default isn't a change; storing it would
    // inflate the change count and survive a later reword of that default.
    if (value === readCopy(DEFAULT_COPY, path)) return;
    kept[path] = value;
  });
  return kept;
};

const sameOverrides = (left: CopyOverrides, right: CopyOverrides): boolean => {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
};

const read = (): CopyOverrides => {
  try {
    return parseOverrides(window.localStorage.getItem(COPY_STORAGE_KEY));
  } catch {
    // Private browsing and blocked-storage settings throw on access.
    return {};
  }
};

/** What was last written, so an echo of this hook's own write can be ignored.
 * `null` means the key was removed. */
const write = (overrides: CopyOverrides): string | null => {
  const payload = Object.keys(overrides).length === 0 ? null : JSON.stringify(overrides);
  try {
    if (payload === null) window.localStorage.removeItem(COPY_STORAGE_KEY);
    else window.localStorage.setItem(COPY_STORAGE_KEY, payload);
  } catch {
    // Storage being unavailable costs the edit's persistence, nothing else.
  }
  return payload;
};

export const buildExport = (overrides: CopyOverrides): CopyExport => ({
  version: EXPORT_VERSION,
  generatedAt: new Date().toISOString(),
  changeCount: Object.keys(overrides).length,
  // Emitted in the model's own order, so a diff of two exports reads top-to-
  // bottom down the page rather than in whatever order the edits happened.
  changes: Object.fromEntries(
    COPY_PATHS.filter(path => path in overrides).map(path => [path, overrides[path]]),
  ),
});

export interface SjtCopyStore {
  /** Defaults with the reviewer's edits applied. */
  copy: SjtCopy;
  overrides: CopyOverrides;
  changedPaths: string[];
  isChanged: (path: string) => boolean;
  /** Setting a field back to its default removes the override instead. */
  setField: (path: string, value: string) => void;
  resetField: (path: string) => void;
  resetAll: () => void;
  replaceAll: (overrides: CopyOverrides) => void;
}

/**
 * Holds the page's copy: the committed defaults, plus whatever this browser
 * has rewritten at /SJT1/edit.
 *
 * Edits live in localStorage and nowhere else — there is no request behind
 * this, so a reviewer's rewording changes the page for them and no one else,
 * and reaches the shared page only by being exported and committed. Both
 * screens say so.
 *
 * Storage is watched, so /SJT1 open in a second tab re-renders as the editor
 * saves: the natural way to work is edit in one tab, watch the real page in
 * the other.
 */
export const useSjtCopy = (): SjtCopyStore => {
  const [overrides, setOverrides] = useState<CopyOverrides>(read);

  // Read by the storage listener, which is registered once and would otherwise
  // close over the first render's overrides.
  const latest = useRef(overrides);
  latest.current = overrides;

  /** The payload this hook last wrote, so its own echo can be ignored. */
  const written = useRef<string | null>(null);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // A null key means the whole store was cleared, which counts.
      if (event.key !== null && event.key !== COPY_STORAGE_KEY) return;
      // This hook's own write, echoed back. Browsers only notify *other* tabs,
      // but some environments notify the writer too, and re-rendering every
      // word on the page to arrive at the state it is already in is waste.
      if (event.newValue === written.current) return;

      const next = read();
      if (!sameOverrides(latest.current, next)) setOverrides(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: CopyOverrides) => {
    setOverrides(next);
    written.current = write(next);
  }, []);

  // Both of these read the current overrides from the ref and hand `commit` a
  // finished object: storage is written beside the state, never inside a state
  // updater, which React is free to call more than once.
  const setField = useCallback(
    (path: string, value: string) => {
      if (!isCopyPath(path) || value.length > MAX_FIELD_LENGTH) return;

      const next = { ...latest.current };
      // A line edited back to its committed wording stops being a change.
      if (value === readCopy(DEFAULT_COPY, path)) delete next[path];
      else next[path] = value;

      if (!sameOverrides(latest.current, next)) commit(next);
    },
    [commit],
  );

  const resetField = useCallback(
    (path: string) => {
      if (!(path in latest.current)) return;
      const next = { ...latest.current };
      delete next[path];
      commit(next);
    },
    [commit],
  );

  const resetAll = useCallback(() => commit({}), [commit]);

  const replaceAll = useCallback(
    (incoming: CopyOverrides) => commit(coerceOverrides(incoming)),
    [commit],
  );

  const copy = useMemo(() => mergeCopy(overrides), [overrides]);
  const changedPaths = useMemo(() => COPY_PATHS.filter(path => path in overrides), [overrides]);
  const isChanged = useCallback((path: string) => path in overrides, [overrides]);

  return { copy, overrides, changedPaths, isChanged, setField, resetField, resetAll, replaceAll };
};
