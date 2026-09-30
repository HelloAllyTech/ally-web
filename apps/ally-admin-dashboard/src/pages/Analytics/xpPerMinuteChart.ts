import { XpPerMinutePoint, XpPerMinuteTotals, XpSourceGroup, XpSourceGroupDef } from "@types";

import { CATEGORICAL, CONTEXT, ColorScale } from "./chartScales";
import { ChartDatum } from "./engagementChart";

/**
 * Pure transforms for the Priority tab's "XP per Roleplay Minute" card
 * (AAQ-165).
 *
 * The headline divides ALL XP by roleplay minutes only, so it is a portfolio
 * ratio, not roleplay's own pay rate. The stack splits the numerator by XP
 * source over the one shared denominator: the roleplay band is what roleplay
 * itself pays per minute, and everything above it is the rest of the learning
 * portfolio. That band growing or shrinking is the shift this chart is for.
 */

/**
 * Colour per source, by its fixed position in the server's list — never by
 * rank, so a source with no XP this period does not repaint the rest. Retired
 * rules are grey: they are history, not a live part of the portfolio.
 */
export const sourceScale = (sources: readonly XpSourceGroupDef[]): ColorScale =>
  Object.fromEntries(
    sources.map((s, i) => [
      s.label,
      s.key === "other" ? CONTEXT.faint : CATEGORICAL[i % CATEGORICAL.length],
    ]),
  );

/**
 * The sources worth a legend entry: any with XP somewhere in the given points,
 * plus roleplay always (it is the baseline the rest is read against). A source
 * that paid nothing anywhere on screen — typically the retired rules — would
 * only add a legend swatch with no bar behind it.
 */
export const visibleSources = (
  points: readonly Pick<XpPerMinuteTotals, "xpBySource">[],
  sources: readonly XpSourceGroupDef[],
): XpSourceGroupDef[] =>
  sources.filter(s => s.key === "roleplay" || points.some(p => (p.xpBySource[s.key] ?? 0) > 0));

/**
 * The stack: each source's XP per roleplay minute, per period.
 *
 * A period with no roleplay minutes has no ratio, so it gets ONE null
 * placeholder rather than zeros: nothing is drawn (a zero-height bar would read
 * as "no XP"), but the period keeps its slot on the axis.
 */
export const buildXpPerMinuteStack = (
  points: readonly XpPerMinutePoint[],
  sources: readonly XpSourceGroupDef[],
): ChartDatum[] =>
  points.flatMap(p => {
    const data = sources.flatMap(s => {
      const value = p.perMinuteBySource[s.key];
      return value === null ? [] : [{ group: s.label, key: p.bucket, value }];
    });
    if (data.length > 0 || sources.length === 0) return data;
    return [{ group: sources[0].label, key: p.bucket, value: null }];
  });

/** XP per minute for the axis, tooltip, KPI and table: two decimals, "—" for none. */
export const formatXpPerMinute = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : value.toFixed(2);

/** A share as "62%"; "—" when there was no XP to share. */
export const formatShare = (pct: number | null | undefined): string =>
  pct === null || pct === undefined ? "—" : `${Math.round(pct)}%`;

/** XP per minute from everything that is not roleplay. Null over zero minutes. */
export const nonRoleplayPerMinute = (t: XpPerMinuteTotals): number | null =>
  t.xpPerMinute === null ? null : Math.max(0, t.xpPerMinute - (t.perMinuteBySource.roleplay ?? 0));

/**
 * The All-time tile's sentence: the split of the headline into what roleplay
 * pays and what the rest of the portfolio adds, so the one number on screen
 * still answers the chart's question.
 */
export const allTimeDescription = (t: XpPerMinuteTotals | undefined): string => {
  if (!t || t.xpPerMinute === null) {
    return "No roleplay minutes recorded yet, so there is no per-minute figure.";
  }
  return (
    `${t.xp.toLocaleString()} XP across ${Math.round(t.minutes).toLocaleString()} roleplay minutes. ` +
    `Roleplay itself pays ${formatXpPerMinute(t.perMinuteBySource.roleplay)} XP/min; ` +
    `other learning adds ${formatXpPerMinute(nonRoleplayPerMinute(t))} ` +
    `(${formatShare(t.roleplaySharePct === null ? null : 100 - t.roleplaySharePct)} of all XP).`
  );
};

/** Minutes for the table — a few seconds must not print as "0" beside a ratio. */
export const formatMinutes = (minutes: number): string | number => {
  if (minutes === 0) return 0;
  if (minutes < 0.1) return "<0.1";
  return Math.round(minutes * 10) / 10;
};

/** Table columns for the expanded view, in display order. */
export const tableColumns = (
  periodTitle: string,
  sources: readonly XpSourceGroupDef[],
): string[] => [
  periodTitle,
  "Roleplay minutes",
  "XP",
  "XP / min",
  "Roleplay share of XP",
  ...sources.map(s => `${s.label} XP / min`),
];

/** One table row per period. */
export const tableRow = (
  p: XpPerMinutePoint,
  sources: readonly XpSourceGroupDef[],
  inProgress: boolean,
): (string | number)[] => [
  inProgress ? `${p.bucket} (in progress)` : p.bucket,
  formatMinutes(p.minutes),
  p.xp,
  formatXpPerMinute(p.xpPerMinute),
  formatShare(p.roleplaySharePct),
  ...sources.map(s => formatXpPerMinute(p.perMinuteBySource[s.key as XpSourceGroup])),
];
