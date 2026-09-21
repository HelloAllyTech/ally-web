import { RoadmapDeliveryResponse, RoadmapDeliveryTotals } from "@types";

import { CONTEXT, ColorScale, contextScale, stableScale } from "./chartScales";
import { monthLabel } from "./cohortChart";

/**
 * Pure transforms for the roadmap-delivery card. Kept out of the component so the
 * honesty rules they encode — which releases can be placed on a month axis at
 * all, which month is too unfinished to compare, and which bands are context
 * rather than people — are unit-testable without a DOM.
 */

/**
 * The three readings of "what did we ship". All three come from one response, so
 * switching is instant and the parts can never end up disagreeing with the total.
 *
 * They answer different questions, which is why the reader picks rather than
 * being handed one silently: shipping a quarter of bug fixes and shipping a
 * quarter of new ideas are the same bar height and very different news.
 */
export type RoadmapTypeFilter = "all" | "idea" | "bug";

export const ROADMAP_TYPE_FILTERS: {
  key: RoadmapTypeFilter;
  /** Switcher label. */
  label: string;
  /** What is counted, spelled out for the caption. */
  description: string;
  /** Singular noun for the empty state, which is a sentence and not a fragment. */
  noun: string;
}[] = [
  {
    key: "all",
    label: "Ideas and bugs",
    description: "every released opportunity",
    noun: "opportunity",
  },
  {
    key: "idea",
    label: "Ideas only",
    description: "released opportunities of type idea",
    noun: "idea",
  },
  {
    key: "bug",
    label: "Bugs only",
    description: "released opportunities of type bug",
    noun: "bug",
  },
];

export const typeFilterMeta = (key: RoadmapTypeFilter) =>
  ROADMAP_TYPE_FILTERS.find(f => f.key === key) ?? ROADMAP_TYPE_FILTERS[0];

/** Votes and item count under one type filter — the pair every view needs. */
export interface RoadmapMeasure {
  votes: number;
  opportunities: number;
}

/** Resolve a server totals block against the type filter. */
export const measureOf = (
  totals: RoadmapDeliveryTotals,
  filter: RoadmapTypeFilter,
): RoadmapMeasure => {
  if (filter === "idea") {
    return { votes: totals.ideaVotes, opportunities: totals.ideaOpportunities };
  }
  if (filter === "bug") {
    return { votes: totals.bugVotes, opportunities: totals.bugOpportunities };
  }
  return { votes: totals.votes, opportunities: totals.opportunities };
};

/** One month as the chart and table render it. */
export interface RoadmapDeliveryMonthView extends RoadmapMeasure {
  /** yyyy-mm-01. */
  month: string;
  /** Axis label — "Aug 2026", or "Aug 2026 *" for the current month. */
  label: string;
  /** "Aug 2026" — never marked. For the table and the footnote, which have room. */
  plainLabel: string;
  /** Votes per owner band, keyed on the band name. Omitted bands are zero. */
  votesByOwner: Record<string, number>;
  /** Released items per owner band, for the table behind the chart. */
  releasesByOwner: Record<string, number>;
  /** True for the current, unfinished month. */
  partial: boolean;
}

/**
 * The current month is KEPT on the chart, unlike the usage-levels mix, and
 * marked on its own axis label instead.
 *
 * The reasoning differs because the quantity does. A distribution's unfinished
 * month is actively misleading — every learner in it is banded lower than they
 * will finish, so the shape is wrong, not just short. A month's release total is
 * simply incomplete: the bar is honest about what has shipped, it just cannot be
 * compared with the closed months beside it. On a delivery chart "what have we
 * shipped so far this month" is the reading most worth having, so the marker goes
 * where the reader is already looking rather than into a tooltip.
 *
 * An asterisk rather than words, because CARBON TRUNCATES A TICK LABEL PAST 14
 * CHARACTERS: "Aug 2026 (so far)" renders as "Aug 2026 (so f...", which is a flag
 * that says nothing. "Aug 2026 *" fits, and the asterisk is a pointer to
 * {@link PARTIAL_FOOTNOTE} directly under the plot — so the meaning is carried by
 * prose, not by a symbol the reader has to guess at.
 */
const PARTIAL_SUFFIX = " *";

/** Spells out the asterisk. Rendered under the plot, never in a tooltip. */
export const partialFootnote = (month: RoadmapDeliveryMonthView): string =>
  `* ${month.plainLabel} is still open — more can ship into it, so that bar can only grow. ` +
  `It is not comparable with the closed months beside it.`;

/** The in-progress month, when one is on the axis. */
export const partialMonth = (
  months: RoadmapDeliveryMonthView[],
): RoadmapDeliveryMonthView | undefined => months.find(m => m.partial);

/**
 * The months, resolved against one type filter.
 *
 * Gap months arrive from the server as real zeros and are KEPT: "we shipped
 * nothing in March" is a fact about March, and dropping the month would put two
 * bars a quarter apart side by side.
 */
export const buildRoadmapDeliveryMonths = (
  data: RoadmapDeliveryResponse | undefined,
  filter: RoadmapTypeFilter,
): RoadmapDeliveryMonthView[] => {
  if (!data) return [];

  return data.months.map(m => {
    const votesByOwner: Record<string, number> = {};
    const releasesByOwner: Record<string, number> = {};
    for (const owner of m.owners) {
      const measure = measureOf(owner, filter);
      votesByOwner[owner.owner] = measure.votes;
      releasesByOwner[owner.owner] = measure.opportunities;
    }

    const plainLabel = monthLabel(m.month);

    return {
      month: m.month,
      label: m.partial ? `${plainLabel}${PARTIAL_SUFFIX}` : plainLabel,
      plainLabel,
      ...measureOf(m, filter),
      votesByOwner,
      releasesByOwner,
      partial: m.partial,
    };
  });
};

/**
 * Owner bands that have any votes under the current filter.
 *
 * Filtering to bugs can empty an owner entirely, and a legend entry for a band
 * with nothing in it is a colour the reader hunts for and never finds. The ORDER
 * still comes from the server's all-time ranking, so a band never moves as the
 * filter changes — it either appears in its usual place or it does not appear.
 */
export const visibleOwners = (
  data: RoadmapDeliveryResponse | undefined,
  months: RoadmapDeliveryMonthView[],
): string[] => {
  if (!data) return [];
  return data.owners.filter(owner => months.some(m => (m.votesByOwner[owner] ?? 0) > 0));
};

/**
 * Stacked series: one segment per owner per month.
 *
 * Emitted owner-by-owner in the server's rank order, because Carbon assigns
 * stack order from the order the groups first appear in the data. That puts the
 * biggest owner on the baseline and the context bands on top, so the owners below
 * keep a fixed floor all the way across the chart rather than shifting with a
 * grey band that grew.
 *
 * Every month gets a datum for every visible owner, zero included: an absent
 * (group, key) pair and a zero one draw the same, but the zero is what makes a
 * tooltip and the CSV say "0" instead of nothing at all.
 */
export const buildRoadmapDeliverySeries = (
  months: RoadmapDeliveryMonthView[],
  owners: string[],
): { group: string; key: string; value: number }[] =>
  owners.flatMap(owner =>
    months.map(m => ({ group: owner, key: m.label, value: m.votesByOwner[owner] ?? 0 })),
  );

/**
 * Colours for the stack: real owners on the stable categorical palette, the two
 * reserved bands in context grey.
 *
 * Owners are a genuinely UNORDERED category with a value set that grows, so they
 * get hash-keyed colours rather than positions in the current result — an owner
 * keeps their colour when a new owner appears or a filter changes the set. The
 * reserved bands are deliberately outside that palette: "Unassigned" is the
 * absence of an owner and "Other owners" is a presentational roll-up, and
 * neither should compete with a person for a hue. Meaning is never carried by
 * colour alone here — every band is named in the legend and in the table.
 */
export const buildRoadmapDeliveryScale = (
  data: RoadmapDeliveryResponse | undefined,
  owners: string[],
): ColorScale => {
  if (!data) return {};
  const reserved = [data.unassignedOwnerLabel, data.otherOwnerLabel];
  const people = owners.filter(o => !reserved.includes(o));
  return {
    ...stableScale(people),
    ...contextScale(reserved.filter(r => owners.includes(r))),
    // The roll-up is the fainter of the two: it is a drawing decision, where an
    // unowned release is a real gap in the data.
    ...(owners.includes(data.otherOwnerLabel) ? { [data.otherOwnerLabel]: CONTEXT.faint } : {}),
  };
};

/** Months with anything on them — what the chart can actually draw. */
export const plottedMonths = (months: RoadmapDeliveryMonthView[]): RoadmapDeliveryMonthView[] =>
  months.filter(m => m.votes > 0);

/**
 * The one-sentence finding: who carried the votes that shipped.
 *
 * Deliberately NOT a month-on-month delta. A release log is lumpy — one 90-vote
 * item landing in April and not in March is a scheduling fact, not a trend — so a
 * "↓ 62% vs last month" would be a comparison the data cannot support. The
 * concentration across owners is the thing the chart is built to show and needs no
 * invented basis. Returns null when there is nothing to say rather than
 * manufacturing a finding out of one owner.
 */
export const roadmapDeliveryTakeaway = (
  months: RoadmapDeliveryMonthView[],
  owners: string[],
): string | null => {
  const total = months.reduce((sum, m) => sum + m.votes, 0);
  if (total === 0 || owners.length === 0) return null;

  const byOwner = owners
    .map(owner => ({
      owner,
      votes: months.reduce((sum, m) => sum + (m.votesByOwner[owner] ?? 0), 0),
    }))
    .sort((a, b) => b.votes - a.votes);

  const top = byOwner[0];
  const head = `${total.toLocaleString()} votes shipped across ${months.length} ${
    months.length === 1 ? "month" : "months"
  }`;
  if (byOwner.length < 2 || top.votes === 0) return head;

  const share = Math.round((top.votes / total) * 100);
  return `${head} — ${top.owner} carried ${share}% of them (${top.votes.toLocaleString()} votes)`;
};

/**
 * The line stating what the chart cannot show, or null when nothing is missing.
 *
 * This is the panel's most important sentence and it is not optional. `releasedAt`
 * is stamped only on the transition into `released`, so a large share of released
 * rows carry no date at all — without this line the plotted total reads as
 * everything the team has ever shipped, and a reader would draw conclusions about
 * a period from a fraction of it.
 */
export const undatedNote = (
  data: RoadmapDeliveryResponse | undefined,
  filter: RoadmapTypeFilter,
): string | null => {
  if (!data) return null;
  const undated = measureOf(data.undated, filter);
  if (undated.opportunities === 0) return null;

  const plotted = measureOf(data.plotted, filter);
  const total = plotted.opportunities + undated.opportunities;
  return (
    `${plotted.opportunities.toLocaleString()} of ${total.toLocaleString()} released ` +
    `items are plotted. The other ${undated.opportunities.toLocaleString()} ` +
    `(${undated.votes.toLocaleString()} votes) carry no release date — it is only ` +
    `stamped when an item moves into Released, so older work has none — and they are ` +
    `left off rather than given a stand-in month.`
  );
};

/**
 * The empty state, which is two genuinely different messages.
 *
 * "Nothing has shipped" and "everything that shipped is undated" look identical
 * on an empty axis and mean opposite things about the team. Returns undefined
 * when there IS something to draw.
 */
export const roadmapDeliveryEmptyText = (
  data: RoadmapDeliveryResponse | undefined,
  months: RoadmapDeliveryMonthView[],
  filter: RoadmapTypeFilter,
): string | undefined => {
  if (!data || plottedMonths(months).length > 0) return undefined;

  const undated = measureOf(data.undated, filter);
  if (undated.opportunities > 0) {
    return (
      `Nothing can be placed on a month axis: all ${undated.opportunities.toLocaleString()} ` +
      `released items (${undated.votes.toLocaleString()} votes) carry no release date. ` +
      `The date is stamped when an item moves into Released, so items released before ` +
      `that was tracked have none.`
    );
  }
  return `No ${typeFilterMeta(filter).noun} has been released yet.`;
};

/**
 * The table behind the chart: votes AND release counts, and every month the axis
 * carries.
 *
 * The count is what makes a vote total readable — "180 votes" is one blocker or
 * twelve small wins, and those are different months. The in-progress month is
 * here too, flagged, so it is somewhere the reader can see rather than being a
 * bar they misread as a fall.
 */
export const buildRoadmapDeliveryTable = (
  months: RoadmapDeliveryMonthView[],
  owners: string[],
): { columns: string[]; rows: (string | number | null)[][] } => ({
  columns: ["Month", "Votes", "Released", ...owners.map(o => `${o} (votes)`)],
  // Spelled out here rather than reusing the axis marker: a table cell and a CSV
  // have room for words, and "Aug 2026 *" in an exported file is an asterisk with
  // no footnote to point at.
  rows: months.map(m => [
    m.partial ? `${m.plainLabel} (in progress)` : m.plainLabel,
    m.votes,
    m.opportunities,
    ...owners.map(o => m.votesByOwner[o] ?? 0),
  ]),
});
