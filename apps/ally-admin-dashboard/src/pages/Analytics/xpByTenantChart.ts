import { AnalyticsGrain } from "@types";

import { GROUPING_LABEL, withoutInProgress } from "./analyticsGrouping";
import { CATEGORICAL, ColorScale, contextScale } from "./chartScales";

/**
 * Pure transforms + wire types for the Goals -> "XP by tenant" card.
 *
 * The response/query shapes are declared here rather than in `@types`
 * (types/auth.ts): that file is mid-edit by a concurrent session during this
 * groundwork pass, so the new analytics wire types live beside the transforms
 * that consume them instead of adding to it. Mirrors ally-be's
 * `XpByTenantResponseDto` (src/analytics/dto/xp-by-tenant-analytics.dto.ts).
 */

/** Trailing windows the endpoint accepts. Mirrors ally-be's
 *  `XP_BY_TENANT_WINDOWS`. The card itself is pinned to all time. */
export const XP_BY_TENANT_WINDOWS = ["30d", "90d", "365d", "all"] as const;
export type XpByTenantWindow = (typeof XP_BY_TENANT_WINDOWS)[number];

export const XP_BY_TENANT_WINDOW_LABEL: Record<XpByTenantWindow, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last 365 days",
  all: "All time",
};

export const DEFAULT_XP_BY_TENANT_WINDOW: XpByTenantWindow = "90d";

/**
 * Wire grain — the shared grouping vocabulary, with all-time spelled `all`
 * (matching goals-xp). Mirrors ally-be's `XP_BY_TENANT_GRAINS`.
 */
export type XpByTenantGrain = "day" | "week" | "month" | "quarter" | "year" | "all";

export const toXpByTenantGrain = (grain: AnalyticsGrain): XpByTenantGrain =>
  grain === "allTime" ? "all" : grain;

/** Every grain the picker offers — the full shared vocabulary. */
export const XP_BY_TENANT_GROUPINGS: AnalyticsGrain[] = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "allTime",
];

/** All time — the card's original single "who carried the XP" bar. */
export const DEFAULT_XP_BY_TENANT_GROUPING: AnalyticsGrain = "allTime";

/** The resolved trailing window, echoed back for on-surface labelling. */
export interface XpByTenantWindowInfo {
  window: XpByTenantWindow;
  from: string;
  to: string;
  label: string;
  allTime: boolean;
}

/** One tenant's slice of the bar. */
export interface XpByTenantSegment {
  tenantId: string;
  tenantName: string;
  xp: number;
}

/** One period's stacked bar. */
export interface XpByTenantPoint {
  periodStart: string;
  /** "2026-03-02", "Mar 2026", "Q1 2026", "2026", or "All time". */
  periodLabel: string;
  /** Named tenants only (the top-level `segments` set), zero XP omitted. */
  segments: XpByTenantSegment[];
  /** This period's XP from every tenant not named at the top level. */
  otherXp: number;
  totalXp: number;
  /** The period containing today — still accruing. */
  inProgress: boolean;
}

export interface XpByTenantResponse {
  window: XpByTenantWindowInfo;
  /** Absent from a backend that predates grouping — read as `"all"`. */
  grain?: XpByTenantGrain;
  /** Oldest first, zero-filled; one point for `grain=all`. Absent from a
   *  backend that predates grouping. */
  points?: XpByTenantPoint[];
  /** Top 8 tenants by XP over the WHOLE window, highest first — the named set
   *  for every period too. Test tenants excluded entirely. */
  segments: XpByTenantSegment[];
  /** XP from every tenant past the top 8, rolled up. 0 when the tail has at
   *  most one tenant — that one is named directly in `segments` instead. */
  otherXp: number;
  /** `segments` XP plus `otherXp`, sent rather than left for the client to
   *  sum. */
  totalXp: number;
  computedAt: string;
}

export interface XpByTenantQuery {
  window?: XpByTenantWindow;
  grain?: XpByTenantGrain;
}

export const OTHER_TENANTS_LABEL = "Other tenants";

export interface XpByTenantDatum {
  group: string;
  key: string;
  value: number;
}

/**
 * Whether the response is a per-period reading. Read off the RESPONSE, not the
 * picker: a backend that predates grouping answers every grain with the single
 * window bar, and the card must then label it as that one bar.
 */
export const isGrouped = (data: XpByTenantResponse): boolean =>
  Boolean(data.grain && data.grain !== "all" && data.points);

/**
 * The still-accruing period to leave OFF the plot, when there is one.
 *
 * Only when a completed period remains beside it: with the whole history
 * inside the current year (or quarter), dropping it would leave a blank chart
 * that looks like missing data. Then it stays on, and the table flags it.
 */
export const xpByTenantInProgress = (
  data: XpByTenantResponse | undefined,
): XpByTenantPoint | undefined => {
  if (!data || !isGrouped(data)) return undefined;
  const points = data.points ?? [];
  return points.length > 1 ? points.find(p => p.inProgress) : undefined;
};

/**
 * The stacked bars to plot. Ungrouped (all time): ONE bar keyed on the
 * window's label. Grouped: one bar per period, minus the still-accruing one
 * ({@link withoutInProgress} — it can only rise, so it would read as a fall; it
 * stays in the detail table).
 *
 * Every named tenant gets a datum in every period, zero included, like the
 * ship-volume chart: a zero-filled axis keeps a quiet period visible as a gap
 * instead of silently dropping its tick. "Other tenants" gets one only when
 * the whole window has a tail (`otherXp > 0`) — a single-org tail is folded
 * into `segments` by the server, so this never draws an always-zero band.
 */
export const buildXpByTenantSeries = (data: XpByTenantResponse | undefined): XpByTenantDatum[] => {
  if (!data) return [];

  if (!isGrouped(data)) {
    const key = data.window.label;
    const segments = data.segments.map(s => ({ group: s.tenantName, key, value: s.xp }));
    return data.otherXp > 0
      ? [...segments, { group: OTHER_TENANTS_LABEL, key, value: data.otherXp }]
      : segments;
  }

  const inProgress = xpByTenantInProgress(data)?.periodStart;
  const points = withoutInProgress(data.points ?? [], p => p.periodStart, inProgress);
  return points.flatMap(p => {
    const xpOf = new Map(p.segments.map(s => [s.tenantId, s.xp]));
    const named = data.segments.map(s => ({
      group: s.tenantName,
      key: p.periodLabel,
      value: xpOf.get(s.tenantId) ?? 0,
    }));
    return data.otherXp > 0
      ? [...named, { group: OTHER_TENANTS_LABEL, key: p.periodLabel, value: p.otherXp }]
      : named;
  });
};

/**
 * One distinct hue per named tenant, assigned by whole-window XP rank rather
 * than by hashing the name.
 *
 * `stableScale`'s hash was fine while this was one bar, but a grouped reading
 * draws the same bands side by side across every period, and a hash collision
 * on a STACKED bar puts two same-coloured bands flush against each other (see
 * ship-volume's colour doc). The named set is capped at 8 — the size of the
 * categorical palette — so rank order gives every tenant its own hue; the rare
 * 9th (a single-org tail the server names instead of rolling up) wraps to the
 * first hue, at the opposite end of the stack. The named set is fixed per
 * window, so a tenant keeps its colour whichever grouping is chosen.
 *
 * "Other tenants" is a FIXED neutral grey, kept OUTSIDE the ramp — the same
 * zero-band treatment `UsageLevelCard`/`roadmapDeliveryChart` give their own
 * roll-up bands: it is a presentational aggregate, not a tenant, and must never
 * collide with (or compete with) a real org's hue.
 */
export const buildXpByTenantScale = (data: XpByTenantResponse | undefined): ColorScale => {
  if (!data) return {};
  const scale: ColorScale = {};
  data.segments.forEach((s, i) => {
    scale[s.tenantName] = CATEGORICAL[i % CATEGORICAL.length];
  });
  return {
    ...scale,
    ...(data.otherXp > 0 ? contextScale([OTHER_TENANTS_LABEL]) : {}),
  };
};

/** Axis title for the grouped reading; the ungrouped bar needs none. */
export const xpByTenantAxisTitle = (grain: AnalyticsGrain): string =>
  grain === "allTime" ? "" : grain === "week" ? "Week beginning" : GROUPING_LABEL[grain];

/**
 * Ungrouped: one row per tenant with its share of the window. Grouped: one row
 * per period — including the in-progress one the plot leaves off, labelled as
 * such — with a column per named tenant, Other, and the period total.
 */
export const buildXpByTenantTable = (
  data: XpByTenantResponse | undefined,
): { columns: string[]; rows: (string | number)[][] } => {
  if (!data) return { columns: ["Tenant", "XP", "Share"], rows: [] };

  if (isGrouped(data)) {
    const hasOther = data.otherXp > 0;
    const columns = [
      "Period",
      ...data.segments.map(s => s.tenantName),
      ...(hasOther ? [OTHER_TENANTS_LABEL] : []),
      "Total",
    ];
    const rows = (data.points ?? []).map(p => {
      const xpOf = new Map(p.segments.map(s => [s.tenantId, s.xp]));
      return [
        p.inProgress ? `${p.periodLabel} (in progress)` : p.periodLabel,
        ...data.segments.map(s => xpOf.get(s.tenantId) ?? 0),
        ...(hasOther ? [p.otherXp] : []),
        p.totalXp,
      ];
    });
    return { columns, rows };
  }

  const share = (xp: number) =>
    data.totalXp > 0 ? `${Math.round((xp / data.totalXp) * 100)}%` : "0%";
  const rows: (string | number)[][] = data.segments.map(s => [s.tenantName, s.xp, share(s.xp)]);
  if (data.otherXp > 0) rows.push([OTHER_TENANTS_LABEL, data.otherXp, share(data.otherXp)]);

  return { columns: ["Tenant", "XP", "Share"], rows };
};

export const xpByTenantEmptyText = (data: XpByTenantResponse | undefined): string | undefined =>
  !data || data.totalXp === 0 ? "No tenant earned any XP in this window." : undefined;

/**
 * The one-sentence finding: the top tenant's share of the window's XP — a
 * whole-window figure, so it holds whichever grouping is on screen.
 * Returns undefined (never a manufactured finding) when there is nothing to
 * plot, or when the bar is a single named tenant with no "Other" tail — a
 * share of the only segment on the bar is not a finding.
 */
export const xpByTenantTakeaway = (data: XpByTenantResponse | undefined): string | undefined => {
  if (!data || data.totalXp === 0 || data.segments.length === 0) return undefined;
  if (data.segments.length === 1 && data.otherXp === 0) return undefined;

  const top = [...data.segments].sort((a, b) => b.xp - a.xp)[0];
  const share = Math.round((top.xp / data.totalXp) * 100);
  return (
    `${top.tenantName} carried ${share}% of platform XP (${top.xp.toLocaleString()} of ` +
    `${data.totalXp.toLocaleString()}) in ${data.window.label.toLowerCase()}`
  );
};
