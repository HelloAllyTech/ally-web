import { AnalyticsBucket, AnalyticsRange, AnalyticsScoping, AnalyticsWindow } from "@types";

import { ColorScale, PALETTE } from "./chartScales";

/**
 * Pure transforms + wire types for the Goals -> "Bug Hunter find vs. fix
 * volume" card.
 *
 * The response/query shapes are declared here rather than in `@types`
 * (types/auth.ts): that file is mid-edit by a concurrent session during this
 * groundwork pass, so the new analytics wire types live beside the transforms
 * that consume them instead of adding to it. Mirrors ally-be's
 * `BugHunterVolumeResponseDto` (src/analytics/dto/bug-hunter-volume-analytics.dto.ts).
 */

/** One bucket of the found-vs-fixed series. */
export interface BugHunterVolumePoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  /** Findings AUTONOMOUSLY discovered this bucket — a human "Report a bug"
   *  filing is never counted as found. */
  found: number;
  /** Findings that reached merged (or later), counted this bucket regardless
   *  of source — a human-reported bug Bug Hunter fixed still counts. */
  fixed: number;
}

export interface BugHunterVolumeResponse {
  window: AnalyticsWindow;
  points: BugHunterVolumePoint[];
  /** Always platform-internal (`bug_findings` carries no tenant column). */
  scoping: AnalyticsScoping;
  computedAt: string;
}

/** Standard window params; `tenantId` is a deliberate omission here (it would
 *  be a no-op server-side — see the backend query DTO's own doc comment). */
export interface BugHunterVolumeQuery {
  range?: AnalyticsRange;
  bucket?: AnalyticsBucket;
  from?: string;
  to?: string;
}

export const FOUND_GROUP = "Found";
export const FIXED_GROUP = "Fixed";

/**
 * Found is the input side (the subject — how much is surfacing); fixed is
 * the resolving half. Green-for-a-good-outcome matches
 * `THROUGHPUT_SCALE`'s "approved -> merged" hue on the sibling Bug Agent
 * Performance tab, so "fixed" reads as the same kind of good news there and
 * here.
 */
export const BUG_HUNTER_VOLUME_SCALE: ColorScale = {
  [FOUND_GROUP]: PALETTE.blue,
  [FIXED_GROUP]: PALETTE.green,
};

export interface BugHunterVolumeDatum {
  group: string;
  key: string;
  value: number;
}

/**
 * Grouped, never stacked: found and fixed are two independent counts, not
 * parts of one whole — a bug fixed in a bucket was not necessarily found in
 * that same bucket, so summing them into one bar height would not mean
 * anything.
 */
export const buildBugHunterVolumeSeries = (
  points: BugHunterVolumePoint[],
): BugHunterVolumeDatum[] => [
  ...points.map(p => ({ group: FOUND_GROUP, key: p.bucket, value: p.found })),
  ...points.map(p => ({ group: FIXED_GROUP, key: p.bucket, value: p.fixed })),
];

/** The full, unfiltered axis — including the in-progress bucket, flagged —
 *  for the detail table and the export. */
export const buildBugHunterVolumeTable = (
  points: BugHunterVolumePoint[],
  inProgressBucket?: string | null,
): { columns: string[]; rows: (string | number)[][] } => ({
  columns: ["Period", "Found", "Fixed"],
  rows: points.map(p => [
    p.bucket === inProgressBucket ? `${p.bucket} (in progress)` : p.bucket,
    p.found,
    p.fixed,
  ]),
});

export const bugHunterVolumeEmptyText = (points: BugHunterVolumePoint[]): string | undefined =>
  points.length === 0 || points.every(p => p.found === 0 && p.fixed === 0)
    ? "No Bug Hunter finding or fix activity recorded in this window yet."
    : undefined;

/**
 * The one-sentence finding: total found vs. fixed over the COMPLETE buckets
 * on the axis, and whether fixing is keeping pace with finding. A
 * whole-window ratio rather than a single-bucket delta — found and fixed
 * drift out of lockstep naturally (a fix can land weeks after the bug that
 * produced it was filed), so one bucket's numbers alone would read as noise.
 */
export const bugHunterVolumeTakeaway = (
  points: BugHunterVolumePoint[],
  inProgressBucket: string | null | undefined,
): string | undefined => {
  const complete = points.filter(p => p.bucket !== inProgressBucket);
  if (complete.length === 0) return undefined;

  const found = complete.reduce((s, p) => s + p.found, 0);
  const fixed = complete.reduce((s, p) => s + p.fixed, 0);
  if (found === 0 && fixed === 0) return undefined;

  const head = `${found.toLocaleString()} found vs ${fixed.toLocaleString()} fixed over the window`;
  if (found === 0) return `${head} — nothing found to compare against`;

  const pct = Math.round((fixed / found) * 100);
  if (pct >= 90 && pct <= 110) return `${head} — fixing is keeping pace with finding`;
  return pct < 90
    ? `${head} — fixing is trailing finding by ${100 - pct}%`
    : `${head} — fixing is ahead of finding by ${pct - 100}%`;
};
