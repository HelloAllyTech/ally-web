import { FC, useState } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetBugHunterMetricsQuery } from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";
import { BugHunterFunnel, BugHunterStageLatency } from "@types";

import { BUG_FINDING_DECISION_REASON_LABELS } from "./bugFindingLabels";
import { formatUsd } from "./scorecard";

/** The windows offered. Two, because a third chip buys nothing a reader asked for. */
const WINDOWS = [30, 90] as const;
type Window = (typeof WINDOWS)[number];

/**
 * Findings somebody actually ruled on — the denominator of the accuracy rate.
 *
 * Derived here rather than sent, because it is defined by what it EXCLUDES and
 * that definition belongs next to the number it explains: declines whose
 * reason was never recorded carry no evidence either way, and open findings
 * are not evidence either. Counting either as correct would make accuracy rise
 * when nobody triages, which is the one way this figure could flatter the
 * agent for a human failing.
 */
const judgedCount = (funnel: BugHunterFunnel): number =>
  Math.max(0, funnel.dismissed + funnel.rejected - funnel.reasonNotRecorded) + funnel.approved;

/** A rate as whole-percent, or a dash when there is no denominator. */
const formatRate = (rate: number | null): string =>
  rate == null ? "—" : `${Math.round(rate * 100)}%`;

/**
 * Hours, at the granularity a reader would actually say out loud.
 *
 * Under a day reads in hours; past that, days — "37h" is a number you have to
 * divide, and nobody making a decision about this pipeline cares about the
 * remainder.
 */
const formatHours = (hours: number | null): string => {
  if (hours == null) return "—";
  if (hours < 24) {
    return en.bugHunter.accuracyHours.replace("{count}", String(Math.round(hours)));
  }
  return en.bugHunter.accuracyDays.replace("{count}", String(Math.round(hours / 24)));
};

const LatencyRow: FC<{ label: string; latency: BugHunterStageLatency }> = ({ label, latency }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-xs text-typography-700">{label}</span>
    {latency.sampled === 0 ? (
      // Not "0h". A stage nothing has passed through has no latency, and
      // printing zero would read as instant.
      <span className="text-xs text-typography-500">{en.bugHunter.accuracyLatencyNone}</span>
    ) : (
      <span className="text-xs text-typography-900 tabular-nums">
        {en.bugHunter.accuracyLatencyValue
          .replace("{median}", formatHours(latency.medianHours))
          .replace("{p90}", formatHours(latency.p90Hours))}{" "}
        <span className="text-typography-500">
          {en.bugHunter.accuracyLatencySample.replace("{count}", String(latency.sampled))}
        </span>
      </span>
    )}
  </div>
);

const Tile: FC<{
  label: string;
  tooltip: string;
  value: string;
  detail?: string;
  /** Rendered in place of `detail`, in amber, when the figure is thin rather than bad. */
  caveat?: string;
}> = ({ label, tooltip, value, detail, caveat }) => (
  <div className="flex-1 min-w-[10rem] border border-border-light rounded-lg bg-white px-4 py-3">
    <div className="flex items-center gap-1">
      <span className="text-xs text-typography-600">{label}</span>
      <Tooltip label={tooltip} align="top">
        <button type="button" className="cursor-pointer inline-flex items-center">
          <TooltipIcon />
        </button>
      </Tooltip>
    </div>
    <p className="text-2xl text-typography-900 font-secondary tabular-nums mt-0.5">{value}</p>
    {caveat ? (
      <p className="text-[11px] text-amber-700 mt-1 leading-snug">{caveat}</p>
    ) : (
      detail && <p className="text-[11px] text-typography-500 mt-1">{detail}</p>
    )}
  </div>
);

const FunnelTable: FC<{
  title: string;
  keyColumn: string;
  rows: BugHunterFunnel[];
}> = ({ title, keyColumn, rows }) => {
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-typography-700 mb-2">{title}</p>
      {/* Scrolls inside its own box. The page body must never scroll
          sideways, and five numeric columns plus a repo name is wider than a
          narrow window. */}
      <div className="overflow-x-auto border border-border-light rounded-lg bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-light text-typography-600">
              <th className="text-left font-medium px-3 py-2">{keyColumn}</th>
              <th className="text-right font-medium px-3 py-2">{en.bugHunter.accuracyColFiled}</th>
              <th className="text-right font-medium px-3 py-2">{en.bugHunter.accuracyColJudged}</th>
              <th className="text-right font-medium px-3 py-2">
                {en.bugHunter.accuracyColAccuracy}
              </th>
              <th className="text-right font-medium px-3 py-2">{en.bugHunter.accuracyColLanded}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const judged = judgedCount(row);
              return (
                <tr
                  key={row.key ?? "unassigned"}
                  className="border-b border-border-light last:border-0"
                >
                  <td className="px-3 py-2 text-typography-900">
                    {row.key ?? en.bugHunter.accuracyRepoUnassigned}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.filed}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{judged}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {/* A dash, never 0%, when nothing here has been ruled on —
                        the same rule the headline tile follows. */}
                    {row.accuracy == null ? (
                      <span className="text-typography-500">—</span>
                    ) : (
                      formatRate(row.accuracy)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.merged}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Whether Bug Hunter is any good — the half of the governor's question the run
 * scorecard cannot answer.
 *
 * ## Why this sits beside `AgentScorecard` rather than inside it
 *
 * The scorecard is run-shaped and deliberately so: `scorecard.ts` reads
 * `GET /runs` and refuses to compute a finding-level funnel, because run
 * totals and finding statuses have different denominators there and dividing
 * one by the other produces a rate of nothing. That refusal was correct. This
 * is the other half, computed server-side over every row in the window — so
 * it can state a rate honestly, and the two components stay separable rather
 * than one growing a second data source.
 *
 * ## Every figure names its own denominator
 *
 * The failure mode this panel is designed against is not being wrong; it is
 * being thin and reading as reassuring. A young install has findings and no
 * decisions, and an accuracy of "0%" there would be read as the agent being
 * wrong every time — so a null rate renders as "not enough decisions yet",
 * never as a number. Declines whose reason was never recorded are named
 * rather than folded in. A stage nothing has passed through says "nothing
 * yet" instead of zero hours.
 *
 * Stacks' *Align metrics to agent system goals and requirements* is the
 * reason this exists at all: without a measured precision and cycle time,
 * there is no way to tell whether a change to the agent was an improvement,
 * and no basis on which to widen what it is allowed to do unattended.
 */
export const AccuracyPanel: FC = () => {
  const [windowDays, setWindowDays] = useState<Window>(30);
  const { data, isLoading, isError, refetch } = useGetBugHunterMetricsQuery({
    days: windowDays,
  });

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex-1 min-w-[10rem] h-[5.5rem] rounded-lg bg-neutral-100 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-destructive-600 text-sm">{en.bugHunter.accuracyLoadFailed}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm text-primary-600 underline"
        >
          {en.bugHunter.retry}
        </button>
      </div>
    );
  }

  const { overall } = data;
  const judged = judgedCount(overall);

  return (
    <section aria-labelledby="bug-hunter-accuracy-heading">
      <div className="mb-3">
        <h2 id="bug-hunter-accuracy-heading" className="text-sm font-semibold text-typography-900">
          {en.bugHunter.accuracyTitle}
        </h2>
        <p className="text-xs text-typography-600">{en.bugHunter.accuracySubtitle}</p>
      </div>

      {/* Chips rather than a Carbon ContentSwitcher, for the reason recorded
          on the working-style switcher: Carbon divides a switcher's width
          evenly and clips every label that does not fit the narrowest. */}
      <div
        className="flex flex-wrap items-center gap-2 mb-3"
        role="group"
        aria-label={en.bugHunter.accuracyTitle}
      >
        {WINDOWS.map(days => {
          const isSelected = days === windowDays;
          return (
            <button
              key={days}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setWindowDays(days)}
              className={`rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors hover:bg-neutral-50 ${
                isSelected
                  ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-500 ring-offset-1"
                  : "border-border-light bg-white text-typography-800"
              }`}
            >
              {days === 30 ? en.bugHunter.accuracyWindow30 : en.bugHunter.accuracyWindow90}
            </button>
          );
        })}
      </div>

      {overall.filed === 0 ? (
        <div className="border border-border-light rounded-lg py-8 text-center">
          <p className="text-sm font-medium text-typography-900">
            {en.bugHunter.accuracyEmptyTitle}
          </p>
          <p className="text-xs text-typography-600 mt-1">{en.bugHunter.accuracyEmptySubtitle}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <Tile
              label={en.bugHunter.accuracyRateLabel}
              tooltip={en.bugHunter.accuracyRateTooltip}
              // The whole design constraint of this panel, in one expression:
              // a null rate is a sentence, never a percentage.
              value={
                overall.accuracy == null
                  ? en.bugHunter.accuracyNotEnough
                  : formatRate(overall.accuracy)
              }
              detail={
                overall.accuracy == null
                  ? en.bugHunter.accuracyNotEnoughDetail
                  : en.bugHunter.accuracyRateDetail
                      .replace("{errors}", String(overall.finderErrors))
                      .replace("{judged}", String(judged))
              }
              caveat={
                overall.reasonNotRecorded > 0
                  ? en.bugHunter.accuracyReasonNotRecorded.replace(
                      "{count}",
                      String(overall.reasonNotRecorded),
                    )
                  : undefined
              }
            />
            <Tile
              label={en.bugHunter.accuracyFiledLabel}
              tooltip={en.bugHunter.accuracyFiledTooltip}
              value={overall.filed.toLocaleString()}
              detail={en.bugHunter.accuracyOpenDetail.replace("{count}", String(overall.open))}
            />
            <Tile
              label={en.bugHunter.accuracyLandedLabel}
              tooltip={en.bugHunter.accuracyLandedTooltip}
              value={overall.merged.toLocaleString()}
              detail={`${overall.released.toLocaleString()} ${en.bugHunter.findingStatusReleased.toLowerCase()}`}
            />
            <Tile
              label={en.bugHunter.accuracyCostPerFixLabel}
              tooltip={en.bugHunter.accuracyCostPerFixTooltip}
              value={data.cost.perMergedFixUsd == null ? "—" : formatUsd(data.cost.perMergedFixUsd)}
              detail={`${formatUsd(data.cost.fixSessionUsd)} over ${data.cost.fixSessionRuns} sessions`}
            />
            <Tile
              label={en.bugHunter.accuracyRegressionLabel}
              tooltip={en.bugHunter.accuracyRegressionTooltip}
              value={data.regressions.rate == null ? "—" : formatRate(data.regressions.rate)}
              detail={en.bugHunter.accuracyRegressionDetail
                .replace("{count}", String(data.regressions.fixesThatFailed))
                .replace("{merged}", String(overall.merged))}
            />
          </div>

          <div className="border border-border-light rounded-lg bg-white px-4 py-3">
            <p className="text-xs font-medium text-typography-700 mb-2">
              {en.bugHunter.accuracyLatencyTitle}
            </p>
            <div className="flex flex-col gap-1.5">
              <LatencyRow
                label={en.bugHunter.accuracyLatencyDecided}
                latency={data.latency.filedToDecided}
              />
              <LatencyRow
                label={en.bugHunter.accuracyLatencyMerged}
                latency={data.latency.filedToMerged}
              />
              <LatencyRow
                label={en.bugHunter.accuracyLatencyReleased}
                latency={data.latency.mergedToReleased}
              />
            </div>
          </div>

          {data.declines.length > 0 && (
            <div className="border border-border-light rounded-lg bg-white px-4 py-3">
              <p className="text-xs font-medium text-typography-700 mb-2">
                {en.bugHunter.accuracyDeclinesTitle}
              </p>
              <ul className="flex flex-col gap-1">
                {data.declines.map(entry => (
                  <li
                    key={entry.reason}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <span
                      className={
                        // The two groups mean opposite things, so they do not
                        // read as one list: amber is "I was wrong", plain is
                        // "you decided not to".
                        entry.finderError ? "text-amber-700" : "text-typography-700"
                      }
                    >
                      {entry.reason === "not_recorded"
                        ? en.bugHunter.accuracyDeclineNotRecorded
                        : BUG_FINDING_DECISION_REASON_LABELS[entry.reason]}
                    </span>
                    <span className="text-typography-900 tabular-nums">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <FunnelTable
            title={en.bugHunter.accuracyBySourceTitle}
            keyColumn={en.bugHunter.accuracyColSource}
            rows={data.bySource}
          />
          <FunnelTable
            title={en.bugHunter.accuracyByRepoTitle}
            keyColumn={en.bugHunter.accuracyColRepo}
            rows={data.byRepo}
          />
        </div>
      )}
    </section>
  );
};
