import React, { useMemo, useState } from "react";

import { SimpleBarChart, StackedBarChart } from "@carbon/charts-react";
// The stylesheets are imported HERE rather than by chartKit, because Analytics.tsx is what pulls them
// in today — so a tab reusing ChartCard without them renders technically-correct but unstyled charts.
// This file is the WhatsApp tab's only chart entry point, so this is the one place they belong.
import "@carbon/charts/styles.css";

import { ContentSwitcher, InlineNotification, Switch } from "@ally-ui-mono/ui-shared";
import {
  useGetWaAnalyticsLanguagesQuery,
  useGetWaAnalyticsOverviewQuery,
  useGetWaAnalyticsTimeseriesQuery,
  useGetWaCorpusCoverageQuery,
} from "@api";
import { TooltipHint } from "@components/app-tooltip";
import { en, TooltipLocation } from "@constants";
import { WaAnalyticsBucket, WaHandledBy } from "@types";

import {
  ChartCard,
  KpiTile,
  MIN_N_FOR_SCORE,
  ScrollableChart,
  buildSource,
  hBarOpts,
  stackedBarOpts,
} from "../Analytics/chartKit";
import { PALETTE } from "../Analytics/chartScales";

import "../Analytics/analytics-carbon.scss";

/**
 * Selectable window. The backend already accepts `from`/`to` on every analytics endpoint, so a fixed
 * 30 days was an arbitrary limit imposed by this screen alone — and 30 days is too short to judge a
 * corpus gap that shows up a few times a quarter.
 */
const RANGES = [
  { days: 7, labelKey: "range7" as const },
  { days: 30, labelKey: "range30" as const },
  { days: 90, labelKey: "range90" as const },
];
const DEFAULT_RANGE_INDEX = 1;

/** Bars in the coverage chart. Disclosed in the tile's source line rather than silently applied. */
const COVERAGE_CHART_BARS = 15;

/**
 * Outcome colours carry meaning, so they are assigned rather than taken from the categorical ramp:
 * answered is the good outcome, declined is the one to reduce, and crisis is the one an operator must
 * never lose in a wall of blue.
 */
const OUTCOME_COLOURS: Record<string, string> = {
  [WaHandledBy.RAG]: PALETTE.green,
  [WaHandledBy.DECLINED]: PALETTE.orange,
  [WaHandledBy.CLARIFIED]: PALETTE.blue,
  [WaHandledBy.CRISIS]: PALETTE.red,
  [WaHandledBy.TEMPLATE]: PALETTE.purple,
  [WaHandledBy.CONSENT]: PALETTE.teal,
  [WaHandledBy.RATE_LIMITED]: PALETTE.gray,
  [WaHandledBy.UNSUPPORTED_MEDIA]: PALETTE.gray,
  [WaHandledBy.ERROR]: PALETTE.red,
};

/**
 * One colour for every bar in a single-measure chart.
 *
 * Carbon colours bars by their `group`, so a chart plotting one measure across N categories gets N
 * colours by default — a rainbow that implies the categories differ in kind when the only thing that
 * differs is the value. The bar length already carries the comparison.
 */
const uniform = (groups: string[], colour: string): Record<string, string> =>
  groups.reduce<Record<string, string>>((scale, group) => {
    scale[group] = colour;
    return scale;
  }, {});

const outcomeLabel = (handledBy: string): string =>
  en.whatsappBot.conversations.handledBy[handledBy as WaHandledBy] ?? handledBy;

/**
 * The usage dashboard.
 *
 * Lazy-loaded behind `UsageTab` so `@carbon/charts` stays out of the main bundle — the WhatsApp route
 * itself must load eagerly for seven light tabs, and the charts are the only heavy thing in it.
 *
 * Four questions, in the order an operator actually asks them: is anyone using it · is it answering ·
 * is it answering everyone equally · is the corpus earning its keep. The third is the one that would
 * otherwise go unmeasured: cross-lingual retrieval is the weakest link in this pipeline, and the only
 * way to know it works is to watch the decline rate per language rather than in aggregate.
 */
export const UsageDashboard: React.FC = () => {
  const [rangeIndex, setRangeIndex] = useState(DEFAULT_RANGE_INDEX);
  const range = RANGES[rangeIndex];

  // Recomputed only when the range changes, so every tile asks for the same window and a re-render
  // does not shift the boundary under them by a few milliseconds.
  const window = useMemo(
    () => ({
      from: new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString(),
    }),
    [range.days],
  );
  const windowLabel = en.whatsappBot.usage[range.labelKey].toLowerCase();

  const overview = useGetWaAnalyticsOverviewQuery(window);
  const timeseries = useGetWaAnalyticsTimeseriesQuery(window);
  const languages = useGetWaAnalyticsLanguagesQuery(window);
  const coverage = useGetWaCorpusCoverageQuery(window);

  const stats = overview.data;

  const outcomeSeries = useMemo(
    () =>
      (timeseries.data ?? []).map((row: WaAnalyticsBucket) => ({
        group: outcomeLabel(row.handledBy),
        // Date only. An hour-level label on a daily bucket claims a precision the bucket does not
        // have.
        key: new Date(row.bucket).toISOString().slice(0, 10),
        value: row.count,
      })),
    [timeseries.data],
  );

  const outcomeScale = useMemo(() => {
    const present = Array.from(new Set((timeseries.data ?? []).map(row => row.handledBy)));
    return present.reduce<Record<string, string>>((scale, handledBy) => {
      scale[outcomeLabel(handledBy)] = OUTCOME_COLOURS[handledBy] ?? PALETTE.blue;
      return scale;
    }, {});
  }, [timeseries.data]);

  // Only languages with enough traffic to carry a rate. Below the floor the backend sends null
  // rather than a percentage from three messages, and plotting a bar of zero there would read as
  // "this language never declines".
  const languageRows = useMemo(
    () => (languages.data ?? []).filter(row => row.declineRate !== null),
    [languages.data],
  );

  const languageBars = useMemo(
    () =>
      languageRows.map(row => ({
        group: row.language,
        value: Math.round((row.declineRate ?? 0) * 1000) / 10,
      })),
    [languageRows],
  );

  const coverageRows = coverage.data?.rows ?? [];
  // Archived documents are excluded from the dead-corpus worklist. An archived document that is
  // never cited is not a problem to fix — it was retired on purpose, and listing it as dead corpus
  // sends an admin to re-title material the bot is deliberately no longer using.
  const neverCited = coverageRows.filter(row => row.citations === 0 && !row.isArchived);
  const coverageBars = useMemo(
    () =>
      coverageRows
        .slice(0, COVERAGE_CHART_BARS)
        .map(row => ({ group: row.title, value: row.citations })),
    [coverageRows],
  );

  const totalQuestions = (stats?.answered ?? 0) + (stats?.declined ?? 0);

  return (
    <div className="pt-4 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-1 text-sm text-typography-600">
          {en.whatsappBot.usage.subtitle}
          <TooltipHint location={TooltipLocation.WA_USAGE_DECLINE_RATE} />
        </p>
        <ContentSwitcher
          selectedIndex={rangeIndex}
          onChange={({ index }: { index?: number }) => {
            if (index === undefined) return;
            setRangeIndex(index);
          }}
          size="sm"
        >
          {RANGES.map(item => (
            <Switch key={item.days} text={en.whatsappBot.usage[item.labelKey]} />
          ))}
        </ContentSwitcher>
      </div>

      {overview.isError && (
        <InlineNotification
          kind="error"
          title={en.whatsappBot.usage.loadError}
          lowContrast
          hideCloseButton
        />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile
          label={en.whatsappBot.usage.inbound}
          description={en.whatsappBot.usage.inboundHelp}
          value={count(stats?.inbound)}
          loading={overview.isLoading}
        />
        <KpiTile
          label={en.whatsappBot.usage.uniqueContacts}
          description={en.whatsappBot.usage.contactsHelp}
          value={count(stats?.uniqueContacts)}
          loading={overview.isLoading}
        />
        <KpiTile
          label={en.whatsappBot.usage.declineRate}
          description={en.whatsappBot.usage.declineRateHelp}
          // A rate, not a count: 200 declines out of 2000 questions and out of 220 are very
          // different situations, and only the ratio distinguishes them.
          value={percent(stats?.declineRate)}
          n={totalQuestions}
          nUnit="questions"
          minN={MIN_N_FOR_SCORE}
          higherIsBetter={false}
          loading={overview.isLoading}
        />
        <KpiTile
          label={en.whatsappBot.usage.latency}
          value={seconds(stats?.latencyP50Ms)}
          // p95 beside p50, not instead of it: the median says the bot feels fast, the p95 says what
          // the unlucky worker actually waited.
          description={`p95 ${seconds(stats?.latencyP95Ms)}`}
          higherIsBetter={false}
          loading={overview.isLoading}
        />
      </div>

      {/* Crisis and error counts are raw numbers, deliberately not folded into a chart: one crisis
          reply is operationally significant and would be invisible as a sliver in a stacked bar. */}
      <div className="flex gap-8 text-sm">
        <Counter label={en.whatsappBot.usage.answered} value={stats?.answered ?? 0} />
        <Counter label={en.whatsappBot.usage.declined} value={stats?.declined ?? 0} />
        <Counter label={en.whatsappBot.usage.crisis} value={stats?.crisis ?? 0} />
        <Counter label={en.whatsappBot.usage.errors} value={stats?.errors ?? 0} />
      </div>

      <ChartCard
        title={en.whatsappBot.usage.outcomesHeading}
        caption={en.whatsappBot.usage.subtitle}
        source={buildSource({
          derivation: "outbound replies grouped by outcome, per day",
          window: windowLabel,
          n: stats?.outbound ?? null,
          nUnit: "replies",
        })}
        loading={timeseries.isLoading}
        error={timeseries.isError}
        onRetry={timeseries.refetch}
        empty={outcomeSeries.length === 0}
        emptyText={en.whatsappBot.usage.empty}
        wide
      >
        <ScrollableChart data={outcomeSeries}>
          <StackedBarChart
            data={outcomeSeries}
            options={stackedBarOpts({
              leftTitle: "Replies",
              colorScale: outcomeScale,
            })}
          />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title={en.whatsappBot.usage.languagesHeading}
        caption={en.whatsappBot.usage.languagesHelp}
        controls={<TooltipHint location={TooltipLocation.WA_USAGE_LANGUAGE_DECLINE} />}
        source={buildSource({
          derivation: "declines ÷ answered-or-declined, per inbound language",
          window: windowLabel,
          n: languageRows.reduce((sum, row) => sum + row.total, 0),
          nUnit: "questions",
          extra: `languages below ${MIN_SAMPLE} questions omitted`,
        })}
        loading={languages.isLoading}
        error={languages.isError}
        onRetry={languages.refetch}
        empty={languageBars.length === 0}
        emptyText={en.whatsappBot.usage.empty}
      >
        {/* Horizontal: language names are free text and Carbon rotates and truncates long labels on a
            300px vertical axis, which makes the bars unreadable — exactly the chart where knowing
            WHICH language is the whole point. */}
        <SimpleBarChart
          data={languageBars}
          options={hBarOpts({
            bottomTitle: "Decline rate (%)",
            colorScale: uniform(
              languageBars.map(bar => bar.group),
              PALETTE.orange,
            ),
            domain: [0, 100],
          })}
        />
      </ChartCard>

      {/* The table, not a chart, carries the language detail: the counts behind each rate are what
          make a high rate actionable, and the omitted-for-thin-sample rows have to appear somewhere. */}
      <LanguageTable rows={languages.data ?? []} />

      <ChartCard
        title={en.whatsappBot.usage.coverageHeading}
        caption={en.whatsappBot.usage.coverageHelp}
        controls={<TooltipHint location={TooltipLocation.WA_USAGE_CORPUS_COVERAGE} />}
        source={buildSource({
          derivation: "citations recorded against each document",
          window: windowLabel,
          n: coverage.data?.totalDocuments ?? coverageRows.length,
          nUnit: "documents",
          // Both facts in one clause: how many bars the chart is showing of the whole set, and how
          // many documents earned no citation at all. The bar cap is said out loud rather than left
          // to be inferred from counting bars — the never-cited list below is the unbounded half.
          extra:
            [
              coverageRows.length > COVERAGE_CHART_BARS
                ? `top ${COVERAGE_CHART_BARS} shown`
                : undefined,
              neverCited.length > 0
                ? `${neverCited.length} ${en.whatsappBot.usage.neverCited}`
                : undefined,
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
        })}
        loading={coverage.isLoading}
        error={coverage.isError}
        onRetry={coverage.refetch}
        empty={coverageBars.length === 0}
        emptyText={en.whatsappBot.usage.empty}
        // Matches the chart's own height, so the loading skeleton and the empty placeholder reserve
        // the space the chart will actually take and the page does not jump when it arrives.
        height="460px"
        wide
      >
        <SimpleBarChart
          data={coverageBars}
          options={hBarOpts({
            bottomTitle: en.whatsappBot.usage.coverageCitations,
            colorScale: uniform(
              coverageBars.map(bar => bar.group),
              PALETTE.blue,
            ),
            height: "460px",
          })}
        />
      </ChartCard>

      {/* A bounded list says so. Presenting the first N of a larger corpus as the complete
          never-cited set would have an admin conclude the rest is fine when it was never looked at. */}
      {(coverage.data?.omittedDocuments ?? 0) > 0 && (
        <InlineNotification
          kind="warning"
          title={en.whatsappBot.usage.coverageTruncated
            .replace("{shown}", String(coverageRows.length))
            .replace("{total}", String(coverage.data?.totalDocuments ?? 0))}
          lowContrast
          hideCloseButton
        />
      )}

      {neverCited.length > 0 && (
        // Named, not just counted. "12 documents never cited" is a statistic; the list is a worklist.
        <div className="rounded border border-border-light p-4">
          <p className="text-sm font-medium text-typography-900">
            {neverCited.length} {en.whatsappBot.usage.neverCited}
          </p>
          <ul className="pt-2 space-y-1 text-sm text-typography-600">
            {neverCited.map(row => (
              <li key={row.documentId}>
                {row.title}{" "}
                <span className="text-typography-400">
                  {/* PASSAGES, not citations. This whole list has zero citations by definition —
                      labelling the chunk count "citations" would contradict the heading directly
                      above it. */}
                  ({row.chunkCount} {en.whatsappBot.usage.passages})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const MIN_SAMPLE = MIN_N_FOR_SCORE;

/**
 * KpiTile takes a pre-formatted string, so the em-dash for "no value" is decided here.
 *
 * A missing number renders as "—" rather than 0: zero questions and no measurement are different
 * facts, and printing 0 for the second is the kind of quiet lie a dashboard gets trusted on.
 */
const count = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : value.toLocaleString();

const percent = (value: number | null | undefined): string =>
  value === null || value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;

const seconds = (ms: number | null | undefined): string =>
  ms === null || ms === undefined ? "—" : `${(ms / 1000).toFixed(1)}s`;

const Counter: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className="flex flex-col">
    <span className="text-lg text-typography-900 tabular-nums">{value.toLocaleString()}</span>
    <span className="text-xs text-typography-500">{label}</span>
  </span>
);

const LanguageTable: React.FC<{
  rows: {
    language: string;
    total: number;
    answered: number;
    declined: number;
    declineRate: number | null;
  }[];
}> = ({ rows }) => {
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded border border-border-light">
      <table className="w-full text-left text-sm">
        <thead className="bg-background-secondary text-typography-700">
          <tr>
            <th className="px-4 py-2 font-medium">{en.whatsappBot.usage.languageColumn}</th>
            <th className="px-4 py-2 font-medium">{en.whatsappBot.usage.languageTotal}</th>
            <th className="px-4 py-2 font-medium">{en.whatsappBot.usage.answered}</th>
            <th className="px-4 py-2 font-medium">{en.whatsappBot.usage.declined}</th>
            <th className="px-4 py-2 font-medium">{en.whatsappBot.usage.languageDeclineRate}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.language} className="border-t border-border-light">
              <td className="px-4 py-2">{row.language}</td>
              <td className="px-4 py-2">{row.total}</td>
              <td className="px-4 py-2">{row.answered}</td>
              <td className="px-4 py-2">{row.declined}</td>
              <td className="px-4 py-2">
                {row.declineRate === null ? (
                  // Says WHY there is no number instead of printing a dash. A blank cell reads as a
                  // missing measurement; this reads as a measurement withheld on purpose.
                  <span className="text-typography-400">
                    {en.whatsappBot.usage.insufficientSample}
                  </span>
                ) : (
                  `${(row.declineRate * 100).toFixed(1)}%`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsageDashboard;
