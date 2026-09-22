import { ColorScale, contextScale, stableScale } from "./chartScales";

/**
 * Pure transforms + wire types for the Goals -> "XP by tenant" card.
 *
 * The response/query shapes are declared here rather than in `@types`
 * (types/auth.ts): that file is mid-edit by a concurrent session during this
 * groundwork pass, so the new analytics wire types live beside the transforms
 * that consume them instead of adding to it. Mirrors ally-be's
 * `XpByTenantResponseDto` (src/analytics/dto/xp-by-tenant-analytics.dto.ts).
 */

/** Trailing windows this chart offers — its OWN control, not the shared
 *  day/week/month/... grain vocabulary, because this is a single bar rather
 *  than a bucketed trend. Mirrors ally-be's `XP_BY_TENANT_WINDOWS`. */
export const XP_BY_TENANT_WINDOWS = ["30d", "90d", "365d", "all"] as const;
export type XpByTenantWindow = (typeof XP_BY_TENANT_WINDOWS)[number];

export const XP_BY_TENANT_WINDOW_LABEL: Record<XpByTenantWindow, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last 365 days",
  all: "All time",
};

export const DEFAULT_XP_BY_TENANT_WINDOW: XpByTenantWindow = "90d";

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

export interface XpByTenantResponse {
  window: XpByTenantWindowInfo;
  /** Top 8 tenants by XP in the window, highest first. Test tenants excluded
   *  entirely. */
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
}

export const OTHER_TENANTS_LABEL = "Other tenants";

export interface XpByTenantDatum {
  group: string;
  key: string;
  value: number;
}

/**
 * One stacked bar: a datum per named tenant plus, when there is a tail, one
 * more for "Other tenants". The x-axis carries a single category — the
 * window's own label — since this is one total, not a per-bucket trend.
 *
 * The "Other tenants" datum is only added when `otherXp > 0`: a single-org
 * tail is folded into `segments` by the server instead (see the backend DTO
 * doc), so this never draws a zero-height "Other" band.
 */
export const buildXpByTenantSeries = (data: XpByTenantResponse | undefined): XpByTenantDatum[] => {
  if (!data) return [];
  const key = data.window.label;
  const segments = data.segments.map(s => ({ group: s.tenantName, key, value: s.xp }));
  return data.otherXp > 0
    ? [...segments, { group: OTHER_TENANTS_LABEL, key, value: data.otherXp }]
    : segments;
};

/**
 * Real tenant names on the stable hash palette. The tenant set is open and
 * dynamic — not a small closed list like ship-volume's seven repos — so a
 * pinned per-tenant assignment is not worth maintaining here; a rare hash
 * collision is a legibility cost, not the "two flush same-coloured bands"
 * correctness bug pinning exists to prevent, because this chart draws only
 * one bar (see ship-volume's own colour doc for the contrast).
 *
 * "Other tenants" is a FIXED neutral grey, kept OUTSIDE the hashed ramp —
 * the same zero-band treatment `UsageLevelCard`/`roadmapDeliveryChart` give
 * their own roll-up bands: it is a presentational aggregate, not a tenant,
 * and must never collide with (or compete with) a real org's hue.
 */
export const buildXpByTenantScale = (data: XpByTenantResponse | undefined): ColorScale => {
  if (!data) return {};
  const names = data.segments.map(s => s.tenantName);
  return {
    ...stableScale(names),
    ...(data.otherXp > 0 ? contextScale([OTHER_TENANTS_LABEL]) : {}),
  };
};

export const buildXpByTenantTable = (
  data: XpByTenantResponse | undefined,
): { columns: string[]; rows: (string | number)[][] } => {
  if (!data) return { columns: ["Tenant", "XP", "Share"], rows: [] };

  const share = (xp: number) =>
    data.totalXp > 0 ? `${Math.round((xp / data.totalXp) * 100)}%` : "0%";
  const rows: (string | number)[][] = data.segments.map(s => [s.tenantName, s.xp, share(s.xp)]);
  if (data.otherXp > 0) rows.push([OTHER_TENANTS_LABEL, data.otherXp, share(data.otherXp)]);

  return { columns: ["Tenant", "XP", "Share"], rows };
};

export const xpByTenantEmptyText = (data: XpByTenantResponse | undefined): string | undefined =>
  !data || data.totalXp === 0 ? "No tenant earned any XP in this window." : undefined;

/**
 * The one-sentence finding: the top tenant's share of the window's XP.
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
