import { AnalyticsBucket, AnalyticsRange, AnalyticsScoping, AnalyticsWindow } from "@types";

import { single } from "./chartKit";
import { ColorScale, PALETTE } from "./chartScales";

/**
 * Pure transforms + wire types for the Goals -> "Active learners (XP)" card.
 *
 * The response/query shapes are declared here rather than in `@types`
 * (types/auth.ts): that file is mid-edit by a concurrent session during this
 * groundwork pass, so the new analytics wire types live beside the transforms
 * that consume them instead of adding to it. Mirrors ally-be's
 * `ActiveUsersXpResponseDto` (src/analytics/dto/active-users-xp-analytics.dto.ts).
 */

/**
 * Distinct learners whose XP earned WITHIN a bucket must clear this bar to
 * count as "active" for this chart. Mirrors ally-be's
 * `ACTIVE_USER_XP_THRESHOLD` (active-users-xp-analytics.repository.ts) — the
 * two constants are not wired together (separate repos), so keep them in sync
 * by hand if the product bar ever moves.
 */
export const ACTIVE_USER_XP_THRESHOLD = 100;

/** One bucket of the active-users series. */
export interface ActiveUsersXpPoint {
  /** Bucket start (yyyy-mm-dd). */
  bucket: string;
  /** Distinct learners clearing the threshold WITHIN this bucket — never a
   *  lifetime/cumulative count. A bucket where nobody cleared it is a real
   *  zero, not a gap: the endpoint gap-fills the axis. */
  activeUsers: number;
}

export interface ActiveUsersXpResponse {
  window: AnalyticsWindow;
  points: ActiveUsersXpPoint[];
  /** Always platform-wide — this chart has no tenant filter. */
  scoping: AnalyticsScoping;
  computedAt: string;
}

/** No `tenantId`: the DTO's validator whitelist drops it rather than honouring
 *  it (see the backend query DTO's own doc comment). */
export interface ActiveUsersXpQuery {
  range?: AnalyticsRange;
  bucket?: AnalyticsBucket;
  from?: string;
  to?: string;
}

const GROUP = "Active learners";

export const ACTIVE_USERS_XP_SCALE: ColorScale = single(GROUP, PALETTE.blue);

export interface ActiveUsersXpDatum {
  group: string;
  key: string;
  value: number;
}

/**
 * One datum per bucket. Callers pass the already-plottable points (the
 * still-accruing bucket dropped via `withoutInProgress` against
 * `window.inProgressBucket`, matching every other per-bucket chart on this
 * tab) — that honesty rule lives at the call site rather than being baked in
 * here, so this stays a pure 1:1 mapping.
 */
export const buildActiveUsersXpSeries = (points: ActiveUsersXpPoint[]): ActiveUsersXpDatum[] =>
  points.map(p => ({ group: GROUP, key: p.bucket, value: p.activeUsers }));

/** The full, unfiltered axis — including the in-progress bucket, flagged —
 *  for the detail table and the export, which are where a provisional number
 *  belongs. */
export const buildActiveUsersXpTable = (
  points: ActiveUsersXpPoint[],
  inProgressBucket?: string | null,
): { columns: string[]; rows: (string | number)[][] } => ({
  columns: ["Period", "Active learners"],
  rows: points.map(p => [
    p.bucket === inProgressBucket ? `${p.bucket} (in progress)` : p.bucket,
    p.activeUsers,
  ]),
});

/**
 * True only when nobody cleared the bar anywhere on the axis — a data gap,
 * not a fact about one sparse bucket. Judged over the plottable points, so an
 * axis of only-just-started periods isn't misreported by a bucket that hasn't
 * had time to accrue anyone yet.
 */
export const activeUsersXpEmptyText = (points: ActiveUsersXpPoint[]): string | undefined =>
  points.length === 0 || points.every(p => p.activeUsers === 0)
    ? `No learner has earned ${ACTIVE_USER_XP_THRESHOLD}+ XP within any period on this axis yet.`
    : undefined;

/**
 * The one-sentence finding: the latest COMPLETE bucket's count. Never the
 * in-progress one — its figure can still rise, so quoting it now would
 * understate it by however much of the period is left to run.
 */
export const activeUsersXpTakeaway = (
  points: ActiveUsersXpPoint[],
  inProgressBucket: string | null | undefined,
  grainNoun: string,
): string | undefined => {
  const complete = points.filter(p => p.bucket !== inProgressBucket);
  const latest = complete.at(-1);
  if (!latest) return undefined;
  return (
    `${latest.activeUsers.toLocaleString()} active learners (${ACTIVE_USER_XP_THRESHOLD}+ XP) ` +
    `in the latest complete ${grainNoun}`
  );
};
