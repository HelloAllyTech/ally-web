import { BugHuntRun, BugHuntRunStatus } from "@types";

/**
 * What Bug Hunter has actually cost, shipped and got wrong — the numbers a
 * *governor* needs, as opposed to the queue a reviewer works.
 *
 * ## Why this module exists at all
 *
 * The tab was complete for one role and empty for another. Everything on it
 * answered "what should I do next?": the status line, the needs-you queue, the
 * bucket chips, the drawer. Nothing answered "should this thing still be
 * merging its own code?" — which is the question you ask about an agent that
 * runs unattended overnight with a company credit card's worth of tokens and
 * write access to five repositories.
 *
 * Stacks' *Interface patterns for evolving human roles in agent systems* names
 * the split directly: reviewers need exception dashboards and audit visibility,
 * governors need *system-wide observability* and policy configuration. The
 * policy control was already here (the working-style switcher is the autonomy
 * slider from Stacks' *The Autonomy Slider in Agent Design*). The observability
 * was not — spend existed only as a per-row column in the shift log, four
 * significant figures at a time, with no total anywhere on the page.
 *
 * ## Every number here is derived, and none of it is new on the wire
 *
 * `GET /runs` already returns cost, token counts and the found/auto-merged/
 * PR-opened/dismissed tallies per run. So this is arithmetic over a response
 * the page already fetches — no new endpoint, no migration, and no second cache
 * entry, because the caller passes the same query args the profile card and the
 * shift log pass.
 *
 * Deliberately reads **runs only, never findings**. A "of N found, M shipped"
 * funnel was the obvious thing to put here and it would have been dishonest:
 * `found` is tallied across the loaded runs while a finding's status comes from
 * the newest hundred findings, so the two halves have different denominators
 * and dividing one by the other produces a rate of nothing. The bucket chips
 * already own where findings stand, and they own it alone — one number, one
 * place.
 *
 * ## Honesty about the denominator is the whole design constraint
 *
 * The run window is capped server-side at the newest 50 — `listRuns`' default,
 * and what the page requests. A "30-day spend" computed
 * from a truncated window is a number that is wrong in the direction that
 * matters — it *under*-reports, so it reads as reassuring precisely when the
 * agent has been busiest.
 *
 * So every window reports whether it is complete (`SpendWindow.complete`), and
 * a window that isn't says so in the UI rather than printing a confident total.
 * This is the same discipline `findingsView.ts` applies to filters, and for the
 * same reason the old workload strip was deleted: a footnote apologising for a
 * denominator is worse than a denominator you can trust.
 */

/**
 * The newest-N caps this module is reasoning about, mirroring the server.
 *
 * `RUNS_WINDOW` is `listRuns`' default `limit = 50` in ally-be's
 * `BugHunterService`. It is duplicated here rather than imported because
 * nothing crosses that boundary — but it is the number `complete` is decided
 * against, so it has to move if the server's default does.
 */
export const RUNS_WINDOW = 50;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days of history the sparkline draws. Two weeks reads as "lately" without becoming a chart. */
export const SERIES_DAYS = 14;

/** The two spend windows, plus the whole loaded window. */
export const SPEND_WINDOW_DAYS = [7, 30] as const;
export type SpendWindowDays = (typeof SPEND_WINDOW_DAYS)[number];

/**
 * What one run cost, in USD.
 *
 * Prefers the CLI's own `total_cost_usd` over the token-count estimate for the
 * reason `RunHistoryTable.formatCost` already prefers it: the estimate prices
 * prompt-cache reads at full rate and so overstates a cache-heavy run, often by
 * a lot. `totalTokenCostUsd` arrives as a string (Postgres `numeric`), and a
 * `numeric` that fails to parse must not poison a sum — an unparseable cost
 * contributes zero rather than turning the page's total into `NaN`.
 */
export const runCostUsd = (run: BugHuntRun): number => {
  if (run.cliReportedCostUsd != null && Number.isFinite(run.cliReportedCostUsd)) {
    return run.cliReportedCostUsd;
  }
  const parsed = Number(run.totalTokenCostUsd);
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface SpendWindow {
  /** How many days back this window looks. `null` for "everything loaded". */
  days: SpendWindowDays | null;
  costUsd: number;
  /** Runs inside the window. */
  runs: number;
  /**
   * Whether the loaded run window is known to cover this whole period.
   *
   * False when the server capped us at `RUNS_WINDOW` *and* the oldest run we
   * hold starts inside the period — which proves there are older runs in the
   * period that we never received, so the total is a floor and not a total.
   */
  complete: boolean;
}

export interface TokenTotals {
  input: number;
  output: number;
  /** Runs that reported token counts. Runs closed before 1912000000000 have a cost but no breakdown. */
  reported: number;
  /** Runs in the window that reported nothing, so the counts above are a floor. */
  missing: number;
}

export interface RunOutcomes {
  completed: number;
  failed: number;
  running: number;
  /** Triggered while the kill switch was off — a run row that did no work. */
  skipped: number;
  /**
   * Completed / (completed + failed), ignoring running and skipped runs.
   * `null` when nothing has finished yet, because 0/0 is not "0% reliable".
   */
  successRate: number | null;
}

/** The found -> shipped funnel, as the runs themselves tallied it. */
export interface PipelineTotals {
  found: number;
  autoMerged: number;
  prOpened: number;
  dismissed: number;
  /**
   * `autoMerged / found`. `null` when nothing has been found, and deliberately
   * *not* clamped: if it ever exceeds 1 that is a real backend accounting bug
   * and the UI showing 120% is how anyone would find out.
   */
  autoMergeRate: number | null;
}

/** One day on the sparkline. */
export interface SeriesPoint {
  /** `YYYY-MM-DD`, in local time — the day a reader would call it. */
  date: string;
  costUsd: number;
  /** Findings the runs that started that day reported. */
  found: number;
  runs: number;
}

export interface AgentScorecard {
  spend: SpendWindow[];
  tokens: TokenTotals;
  runs: RunOutcomes;
  pipeline: PipelineTotals;
  series: SeriesPoint[];
  /** True when the run list came back at the server cap, so all run-derived figures are floors. */
  runWindowTruncated: boolean;
  /** Newest-first, so `[0]` is the most recent run — used for "last swept" without re-sorting. */
  latestRunAt: string | null;
  oldestRunAt: string | null;
}

/** Local-time `YYYY-MM-DD`, so a run at 23:00 lands on the day the reader saw it, not the UTC day. */
const dayKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Runs carrying an unparseable `createdAt` are dropped rather than dated to the
 * epoch — a 1970 run would silently stretch every window to "complete".
 */
const runTime = (run: BugHuntRun): number | null => {
  const time = new Date(run.createdAt).getTime();
  return Number.isFinite(time) ? time : null;
};

const spendWindow = (
  runs: BugHuntRun[],
  days: SpendWindowDays | null,
  now: number,
  windowTruncated: boolean,
  oldestRunTime: number | null,
): SpendWindow => {
  const cutoff = days == null ? -Infinity : now - days * MS_PER_DAY;
  let costUsd = 0;
  let count = 0;

  runs.forEach(run => {
    const time = runTime(run);
    if (time == null || time < cutoff) return;
    costUsd += runCostUsd(run);
    count += 1;
  });

  // Complete unless the server truncated us AND the oldest run we hold begins
  // inside the period — that is the only case where we can prove data is
  // missing from it. "Everything loaded" (days == null) describes exactly what
  // we hold, so it is complete by construction.
  const complete =
    days == null || !windowTruncated || oldestRunTime == null || oldestRunTime <= cutoff;

  return { days, costUsd, runs: count, complete };
};

const tokenTotals = (runs: BugHuntRun[]): TokenTotals => {
  let input = 0;
  let output = 0;
  let reported = 0;
  let missing = 0;

  runs.forEach(run => {
    if (run.totalInputTokens == null || run.totalOutputTokens == null) {
      missing += 1;
      return;
    }
    input += run.totalInputTokens;
    output += run.totalOutputTokens;
    reported += 1;
  });

  return { input, output, reported, missing };
};

/**
 * Run statuses, tallied. An exhaustive switch for the same reason
 * `bucketOfStatus` is one: a fifth run status should be a compile error here.
 */
const runOutcomes = (runs: BugHuntRun[]): RunOutcomes => {
  let completed = 0;
  let failed = 0;
  let running = 0;
  let skipped = 0;

  runs.forEach(run => {
    switch (run.status) {
      case BugHuntRunStatus.COMPLETED:
        completed += 1;
        break;
      case BugHuntRunStatus.FAILED:
        failed += 1;
        break;
      case BugHuntRunStatus.RUNNING:
        running += 1;
        break;
      case BugHuntRunStatus.SKIPPED_DISABLED:
        skipped += 1;
        break;
    }
  });

  const finished = completed + failed;
  return {
    completed,
    failed,
    running,
    skipped,
    successRate: finished === 0 ? null : completed / finished,
  };
};

const pipelineTotals = (runs: BugHuntRun[]): PipelineTotals => {
  const totals = runs.reduce(
    (acc, run) => ({
      found: acc.found + run.foundCount,
      autoMerged: acc.autoMerged + run.autoMergedCount,
      prOpened: acc.prOpened + run.prOpenedCount,
      dismissed: acc.dismissed + run.dismissedCount,
    }),
    { found: 0, autoMerged: 0, prOpened: 0, dismissed: 0 },
  );

  return {
    ...totals,
    autoMergeRate: totals.found === 0 ? null : totals.autoMerged / totals.found,
  };
};

/**
 * A dense day-by-day series for the last `SERIES_DAYS` days.
 *
 * Dense on purpose: a day Bug Hunter did nothing is a real zero, and a
 * sparkline that simply omits it would draw four busy days as a straight line
 * and lie about the shape. The bars a reader sees are therefore always
 * `SERIES_DAYS` wide regardless of how many runs exist.
 */
const buildSeries = (runs: BugHuntRun[], now: number): SeriesPoint[] => {
  const today = startOfDay(new Date(now));
  const points = new Map<string, SeriesPoint>();

  for (let offset = SERIES_DAYS - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * MS_PER_DAY);
    const key = dayKey(date);
    points.set(key, { date: key, costUsd: 0, found: 0, runs: 0 });
  }

  runs.forEach(run => {
    const time = runTime(run);
    if (time == null) return;
    const point = points.get(dayKey(new Date(time)));
    // Older than the series, or (clock skew) in the future — either way not a
    // day this sparkline draws.
    if (!point) return;
    point.costUsd += runCostUsd(run);
    point.found += run.foundCount;
    point.runs += 1;
  });

  return Array.from(points.values());
};

export interface BuildScorecardInput {
  runs: BugHuntRun[];
  /** Injected so the windows and the series are testable without freezing the clock. */
  now?: number;
}

export const buildAgentScorecard = ({
  runs,
  now = Date.now(),
}: BuildScorecardInput): AgentScorecard => {
  const times = runs.map(runTime).filter((time): time is number => time != null);
  const oldestRunTime = times.length ? Math.min(...times) : null;
  const latestRunTime = times.length ? Math.max(...times) : null;
  const runWindowTruncated = runs.length >= RUNS_WINDOW;

  return {
    spend: [
      ...SPEND_WINDOW_DAYS.map(days =>
        spendWindow(runs, days, now, runWindowTruncated, oldestRunTime),
      ),
      spendWindow(runs, null, now, runWindowTruncated, oldestRunTime),
    ],
    tokens: tokenTotals(runs),
    runs: runOutcomes(runs),
    pipeline: pipelineTotals(runs),
    series: buildSeries(runs, now),
    runWindowTruncated,
    latestRunAt: latestRunTime == null ? null : new Date(latestRunTime).toISOString(),
    oldestRunAt: oldestRunTime == null ? null : new Date(oldestRunTime).toISOString(),
  };
};

/**
 * Money, at a precision that matches the magnitude.
 *
 * A sweep costs cents and a month costs tens of dollars, and one format cannot
 * serve both: `$0.03` printed as `$0` says the run was free, while `$41.9847`
 * is four digits of noise on a figure nobody will reconcile to the cent. So
 * sub-dollar totals keep two decimals and everything else rounds to whole
 * dollars — the shift log keeps its own four-decimal per-run format, which is
 * the one place that precision is the point.
 */
export const formatUsd = (amount: number): string => {
  if (!Number.isFinite(amount)) return "—";
  if (amount === 0) return "$0";
  if (amount < 1) return `$${amount.toFixed(2)}`;
  return `$${Math.round(amount).toLocaleString()}`;
};

/** A rate as whole-percent, or "—" when there is no denominator to divide by. */
export const formatRate = (rate: number | null): string =>
  rate == null ? "—" : `${Math.round(rate * 100)}%`;

/** Token counts, abbreviated — 1.2M reads faster than 1,238,004 and no decision turns on the digits. */
export const formatTokens = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return String(count);
};
