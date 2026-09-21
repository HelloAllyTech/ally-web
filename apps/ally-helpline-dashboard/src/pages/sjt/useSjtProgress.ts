import { useEffect, useRef, useState } from "react";

import { RANKING_LENGTH, isComplete } from "./scoring";
import { ITEMS, OPTION_IDS, OptionId } from "./sjtData";

export type SjtStage = "intro" | "quiz" | "results";

export interface SjtProgress {
  stage: SjtStage;
  /** Index into ITEMS of the scenario on screen. */
  index: number;
  /** Item id → option ids in the learner's rank order, best first. */
  answers: Record<number, OptionId[]>;
}

export const EMPTY_PROGRESS: SjtProgress = { stage: "intro", index: 0, answers: {} };

/**
 * Bumped whenever a change to ITEMS would make a stored ranking mean something
 * different (reworded options, a reordered `key`). An older payload is dropped
 * rather than migrated — a half-finished self-check is not worth rescuing at
 * the cost of scoring answers against options the learner never saw.
 */
export const STORAGE_KEY = "ally.sjt1.progress.v1";

const STAGES: SjtStage[] = ["intro", "quiz", "results"];

const isRanking = (value: unknown): value is OptionId[] =>
  Array.isArray(value) &&
  value.length <= RANKING_LENGTH &&
  new Set(value).size === value.length &&
  value.every(id => OPTION_IDS.includes(id as OptionId));

/**
 * Rebuilds progress from an untrusted payload, keeping only what still makes
 * sense. Anything unrecognised is discarded silently: the worst case is that
 * the learner starts over, which is exactly what they'd get with no storage.
 */
export const parseProgress = (raw: string | null): SjtProgress => {
  if (!raw) return EMPTY_PROGRESS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_PROGRESS;
  }
  if (!parsed || typeof parsed !== "object") return EMPTY_PROGRESS;

  const { stage, index, answers } = parsed as Partial<SjtProgress>;
  if (!STAGES.includes(stage as SjtStage)) return EMPTY_PROGRESS;

  const restored: Record<number, OptionId[]> = {};
  if (answers && typeof answers === "object") {
    ITEMS.forEach(item => {
      const order = (answers as Record<string, unknown>)[String(item.id)];
      if (isRanking(order)) restored[item.id] = order;
    });
  }

  const firstIncomplete = ITEMS.findIndex(item => !isComplete(restored[item.id]));

  // Results are only reachable with all ten scenarios ranked; a payload that
  // claims otherwise (hand-edited, or written by an older build) would crash
  // the scoring, so it resumes at the first gap instead.
  if (stage === "results") {
    return firstIncomplete === -1
      ? { stage: "results", index: ITEMS.length - 1, answers: restored }
      : { stage: "quiz", index: firstIncomplete, answers: restored };
  }

  const safeIndex =
    typeof index === "number" && Number.isInteger(index) && index >= 0 && index < ITEMS.length
      ? index
      : 0;

  return { stage: stage as SjtStage, index: safeIndex, answers: restored };
};

const read = (): SjtProgress => {
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private browsing and blocked-storage settings throw on access.
    return EMPTY_PROGRESS;
  }
};

/**
 * Holds the run's state and mirrors it to this browser, so an interrupted
 * self-check — a phone call, a bell, an accidental reload — resumes on the
 * scenario it left off at instead of starting from scratch twelve minutes in.
 *
 * Nothing leaves the device: there is no request behind this, and the intro
 * copy says as much.
 */
export const useSjtProgress = () => {
  const [progress, setProgress] = useState<SjtProgress>(read);

  // The first effect run would otherwise write back the value we just read,
  // which is harmless but makes the storage writes hard to reason about.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      const untouched = progress.stage === "intro" && Object.keys(progress.answers).length === 0;
      if (untouched) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Storage being unavailable costs the resume, nothing else.
    }
  }, [progress]);

  return [progress, setProgress] as const;
};
