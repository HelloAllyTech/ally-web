import { useMemo, useState } from "react";

import { LineChart, SimpleBarChart, StackedBarChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import {
  useGetAgentJoinReliabilityQuery,
  useGetStartLatencyQuery,
  useGetVoiceLatencyQuery,
} from "@api";
import { AnalyticsBucket } from "@types";

import { AnalyticsTabFilters, asOf, windowLabel } from "../analyticsFilters";
import { ChartDetailModal, ChartTableData } from "../ChartDetailModal";
import { LatencyByScenarioPanel } from "./LatencyByScenarioPanel";
import { LatencySessionsPanel } from "./LatencySessionsPanel";
import {
  ChartCard,
  ScrollableChart,
  buildSource,
  hBarOpts,
  lineOpts,
  stackedBarOpts,
} from "../chartKit";
import { CONTEXT, PALETTE, languageScale } from "../chartScales";
import {
  JOIN_LATENCY_SCALE,
  RELIABILITY_SCALE,
  buildJoinLatencySeries,
  buildReliabilitySeries,
  countReliabilitySessions,
  reliabilityBucketTitle,
} from "../joinReliabilityChart";
import {
  CACHE_HIT_RATE_SCALE,
  FIRST_AUDIO_SCALE,
  LATENCY_STAT_SCALE,
  START_SEGMENT_SCALE,
  START_TOTAL_SCALE,
  buildFirstAudioLatencySeries,
  buildFirstAudioMixSeries,
  buildLlmTtftSeries,
  buildPromptCacheHitRateSeries,
  buildReplyLatencySeries,
  buildStartLatencySegments,
  buildStartTotalSeries,
  buildVoiceLatencyByLanguageBars,
  buildVoiceLatencySeries,
  countFirstAudioTurns,
  countMaskedTurns,
  countStartLatencySessions,
  countVoiceLatencyTurns,
  latencyBucketTitle,
} from "../latencyChart";

const BUCKET_ITEMS: { id: AnalyticsBucket; label: string }[] = [
  { id: "day", label: "Day-wise" },
  { id: "week", label: "Week-wise" },
  { id: "month", label: "Month-wise" },
];

/**
 * Reference ceiling for the join-failure rate (%).
 *
 * This is a frontend-set service objective, not a measured value — the threshold
 * label says so, because an unlabelled reference line invites the reader to
 * assume it came from the data.
 */
const FAILURE_RATE_TARGET_PCT = 2;

/**
 * A labelled threshold. The label carries the VALUE and what kind of bound it is
 * ("ceiling" vs "target"), because a bare line labelled "Target" tells the reader
 * neither what number it sits at nor which side of it is good.
 */
const threshold = (value: number, label: string) => ({
  value,
  label,
  fillColor: PALETTE.green,
});

/** Axis block with a threshold, replacing the factory's own `axes`. */
const axesWithThreshold = ({
  leftTitle,
  bottomTitle,
  thresholdValue,
  thresholdLabel,
  stacked = false,
}: {
  leftTitle: string;
  bottomTitle: string;
  thresholdValue: number;
  thresholdLabel: string;
  stacked?: boolean;
}) => ({
  axes: {
    left: {
      mapsTo: "value",
      scaleType: "linear",
      title: leftTitle,
      ...(stacked ? { stacked: true } : {}),
      thresholds: [threshold(thresholdValue, thresholdLabel)],
    },
    bottom: { mapsTo: "key", scaleType: "labels", title: bottomTitle },
  },
});

/**
 * Latency & reliability.
 *
 * Two deliberate structural choices here, both because the alternative made the
 * charts say things that were not true:
 *
 *  - **Live and Historical get separate charts.** They measure the same quantity
 *    by different means (real-time pipeline instrumentation vs. values derived
 *    from backfilled transcripts), so plotting them together invited comparison
 *    of two numbers that are not comparable.
 *  - **Start latency splits parts from wholes.** The segment breakdown
 *    (configure/initialize/connect/prep) stacks to the live mean total; the
 *    live-vs-historical totals are their own chart. Previously the historical
 *    total sat in the same stack as the four parts, so the bar height meant
 *    "sum of phases" in some buckets and "the whole measurement" in others.
 */
export const LatencyTab = ({ query, language }: AnalyticsTabFilters) => {
  const [bucket, setBucket] = useState<AnalyticsBucket>("day");
  const [expanded, setExpanded] = useState<string | null>(null);
  // Lifted so a click on a LatencyByScenarioPanel row can drive
  // LatencySessionsPanel's simulation picker directly, without either owning
  // the other's state. focusToken bumps on every click, even a repeat of the
  // same scenario id, so a click that repeats the current value still forces
  // LatencySessionsPanel to re-apply it -- otherwise a manual pick in that
  // panel's own dropdown could diverge and a same-id click here would be a
  // silent no-op (React bails on setState when the value is unchanged).
  const [focusedScenarioId, setFocusedScenarioId] = useState<number | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const selectScenario = (scenarioId: number) => {
    setFocusedScenarioId(scenarioId);
    setFocusToken(token => token + 1);
  };
  const languageParam = language || undefined;
  const scopedQuery = { ...query, bucket };

  const { data, isLoading, isError, refetch } = useGetVoiceLatencyQuery({
    ...scopedQuery,
    language: languageParam,
  });

  const {
    data: startData,
    isLoading: startLoading,
    isError: startError,
    refetch: refetchStart,
  } = useGetStartLatencyQuery({ ...scopedQuery, language: languageParam });

  const {
    data: reliabilityData,
    isLoading: reliabilityLoading,
    isError: reliabilityError,
    refetch: refetchReliability,
  } = useGetAgentJoinReliabilityQuery(scopedQuery);

  const points = data?.points ?? [];
  const axisTitle = useMemo(() => latencyBucketTitle(data?.bucket), [data]);
  const liveSeries = useMemo(() => buildVoiceLatencySeries(points, "pipeline"), [points]);
  const historySeries = useMemo(() => buildVoiceLatencySeries(points, "transcript"), [points]);
  const liveTurns = useMemo(() => countVoiceLatencyTurns(points, "pipeline"), [points]);
  const historyTurns = useMemo(() => countVoiceLatencyTurns(points, "transcript"), [points]);
  // Live-instrumentation only — no historical counterpart, so no source
  // param and no separate turn count (same `turns` field as liveTurns above,
  // it's per-bucket, not per-metric).
  const llmTtftSeries = useMemo(() => buildLlmTtftSeries(points), [points]);
  // Same live-only caveat as llmTtftSeries — no transcript counterpart exists
  // for a provider prompt-cache stat.
  const cacheHitRateSeries = useMemo(() => buildPromptCacheHitRateSeries(points), [points]);
  // What spoke first, and the unmasked reply time behind it. Live-only: a
  // transcript-derived row carries no provenance at all, so a "historical"
  // counterpart to these would be a chart of one grey band.
  const firstAudioMixSeries = useMemo(() => buildFirstAudioMixSeries(points), [points]);
  const firstAudioLatencySeries = useMemo(() => buildFirstAudioLatencySeries(points), [points]);
  const replyLatencySeries = useMemo(() => buildReplyLatencySeries(points), [points]);
  const firstAudioTurns = useMemo(() => countFirstAudioTurns(points), [points]);
  const maskedTurns = useMemo(() => countMaskedTurns(points), [points]);
  const maskedSharePct =
    firstAudioTurns > 0 ? Math.round((100 * maskedTurns) / firstAudioTurns) : null;
  const byLanguageBars = useMemo(
    () => buildVoiceLatencyByLanguageBars(data?.byLanguage ?? []),
    [data],
  );
  const selectedBucket = BUCKET_ITEMS.find(b => b.id === bucket) ?? BUCKET_ITEMS[0];

  const targetSec = (data?.targetMs ?? 4000) / 1000;
  const llmTtftTargetSec = (data?.llmTtftTargetMs ?? 1500) / 1000;
  const startTargetSec = (startData?.targetMs ?? 4000) / 1000;
  const languageNote = languageParam ? ` · language: ${languageParam}` : " · all languages";

  const voiceOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: LATENCY_STAT_SCALE,
        extra: axesWithThreshold({
          leftTitle: "Seconds",
          bottomTitle: axisTitle,
          thresholdValue: targetSec,
          thresholdLabel: `Target ${targetSec}s or under`,
        }),
      }),
    [axisTitle, targetSec],
  );

  const llmTtftOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: LATENCY_STAT_SCALE,
        extra: axesWithThreshold({
          leftTitle: "Seconds",
          bottomTitle: axisTitle,
          thresholdValue: llmTtftTargetSec,
          thresholdLabel: `Target ${llmTtftTargetSec}s or under`,
        }),
      }),
    [axisTitle, llmTtftTargetSec],
  );

  // No threshold line yet — same posture the LLM TTFT chart itself shipped
  // with before a target was set. Add one via axesWithThreshold, the same
  // way llmTtftTargetMs does, once product sets a target hit-rate.
  const cacheHitRateOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Percent of turns",
        bottomTitle: axisTitle,
        colorScale: CACHE_HIT_RATE_SCALE,
      }),
    [axisTitle],
  );

  // Shares of a whole, so the axis is pinned to 0-100 rather than left to fit
  // the data: a stack that reaches the top of the plot but only sums to 60%
  // reads as "all turns" to anyone not checking the ticks.
  const firstAudioMixOptions = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Percent of turns",
        bottomTitle: axisTitle,
        colorScale: FIRST_AUDIO_SCALE,
        domain: [0, 100],
      }),
    [axisTitle],
  );

  // Same threshold as the headline chart: this is the same measure, split by
  // what spoke, so the target has to sit in the same place on both.
  const firstAudioLatencyOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: FIRST_AUDIO_SCALE,
        extra: axesWithThreshold({
          leftTitle: "Seconds",
          bottomTitle: axisTitle,
          thresholdValue: targetSec,
          thresholdLabel: `Target ${targetSec}s or under`,
        }),
      }),
    [axisTitle, targetSec],
  );

  // Deliberately shares the percentile scale AND the target line with the
  // time-to-first-voice chart: the pair is meant to be read together, and a
  // difference in palette or reference line between them would read as a
  // difference in kind rather than the gap that masking opens up.
  const replyLatencyOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: LATENCY_STAT_SCALE,
        extra: axesWithThreshold({
          leftTitle: "Seconds",
          bottomTitle: axisTitle,
          thresholdValue: targetSec,
          thresholdLabel: `Target ${targetSec}s or under`,
        }),
      }),
    [axisTitle, targetSec],
  );

  // Historical is context, so its own chart is drawn in greys rather than
  // competing with the live chart for attention.
  const historyOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: {
          "p50 (median)": CONTEXT.faint,
          Average: CONTEXT.line,
          "p95 (slow tail)": CONTEXT.strong,
        },
      }),
    [axisTitle],
  );

  const languageColors = useMemo(
    () => languageScale(byLanguageBars.avg.map(b => b.group)),
    [byLanguageBars],
  );

  // Both by-language charts share ONE language colour scale, so a language is
  // the same colour in the avg chart and the p95 chart beside it.
  const languageBarOptions = useMemo(
    () => hBarOpts({ bottomTitle: "Seconds", leftTitle: "", colorScale: languageColors }),
    [languageColors],
  );

  const startSegments = useMemo(
    () => buildStartLatencySegments(startData?.points ?? []),
    [startData],
  );
  const startTotals = useMemo(() => buildStartTotalSeries(startData?.points ?? []), [startData]);
  const startAxisTitle = useMemo(() => latencyBucketTitle(startData?.bucket), [startData]);
  const startLiveSessions = useMemo(
    () => countStartLatencySessions(startData?.points ?? [], "pipeline"),
    [startData],
  );
  const startAllSessions = useMemo(
    () => countStartLatencySessions(startData?.points ?? []),
    [startData],
  );

  const startSegmentOptions = useMemo(
    () =>
      stackedBarOpts({
        leftTitle: "Seconds",
        bottomTitle: startAxisTitle,
        colorScale: START_SEGMENT_SCALE,
        extra: axesWithThreshold({
          leftTitle: "Seconds",
          bottomTitle: startAxisTitle,
          thresholdValue: startTargetSec,
          thresholdLabel: `Target ${startTargetSec}s or under`,
          stacked: true,
        }),
      }),
    [startAxisTitle, startTargetSec],
  );

  const startTotalOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: startAxisTitle,
        colorScale: START_TOTAL_SCALE,
      }),
    [startAxisTitle],
  );

  const reliabilityPoints = reliabilityData?.points ?? [];
  const reliabilityAxisTitle = useMemo(
    () => reliabilityBucketTitle(reliabilityData?.bucket),
    [reliabilityData],
  );
  const reliabilitySessions = useMemo(
    () => countReliabilitySessions(reliabilityPoints),
    [reliabilityPoints],
  );

  const rateSeries = useMemo(() => buildReliabilitySeries(reliabilityPoints), [reliabilityPoints]);
  const joinLatencySeries = useMemo(
    () => buildJoinLatencySeries(reliabilityPoints),
    [reliabilityPoints],
  );

  const rateOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Percent of sessions",
        bottomTitle: reliabilityAxisTitle,
        colorScale: RELIABILITY_SCALE,
        extra: axesWithThreshold({
          leftTitle: "Percent of sessions",
          bottomTitle: reliabilityAxisTitle,
          thresholdValue: FAILURE_RATE_TARGET_PCT,
          thresholdLabel: `Ceiling ${FAILURE_RATE_TARGET_PCT}% (service objective)`,
        }),
      }),
    [reliabilityAxisTitle],
  );

  const joinLatencyOptions = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: reliabilityAxisTitle,
        colorScale: JOIN_LATENCY_SCALE,
      }),
    [reliabilityAxisTitle],
  );

  /* ---------------------------------------------------------------------- */
  /* Provenance lines — one per chart, so an exported tile explains itself.  */
  /* ---------------------------------------------------------------------- */

  const voiceWindow = windowLabel(data?.window);
  const startWindow = windowLabel(startData?.window);
  const reliabilityWindow = windowLabel(reliabilityData?.window);

  const liveSource = buildSource({
    derivation: "Live pipeline turn metrics, per-turn response latency",
    window: `${voiceWindow}${languageNote}`,
    n: liveTurns,
    nUnit: "turns",
    asOf: asOf(data?.window),
  });

  // Same window/turn count as liveSource — llmTtft rides the same query and
  // the same per-bucket `turns` field, just a different column within it.
  const llmTtftSource = buildSource({
    derivation: "Live pipeline turn metrics, graph-start-to-first-token latency",
    window: `${voiceWindow}${languageNote}`,
    n: liveTurns,
    nUnit: "turns",
    asOf: asOf(data?.window),
  });

  // Same window/turn count as llmTtftSource — ratio-of-sums over the same
  // per-turn rows, just a different column.
  const cacheHitRateSource = buildSource({
    derivation: "Live pipeline turn metrics, OpenAI prompt-cache hit rate",
    window: `${voiceWindow}${languageNote}`,
    n: liveTurns,
    nUnit: "turns",
    asOf: asOf(data?.window),
  });

  // n for the split charts is the INSTRUMENTED turn count, not liveTurns:
  // pre-instrumentation turns are in the tab's other charts but cannot appear
  // in these, and quoting the bigger number would overstate what they cover.
  const firstAudioSource = buildSource({
    derivation: "Live pipeline turn metrics, first-audio source per turn",
    window: `${voiceWindow}${languageNote}`,
    n: firstAudioTurns,
    nUnit: "turns",
    asOf: asOf(data?.window),
  });

  const replyLatencySource = buildSource({
    derivation:
      "Live pipeline turn metrics, user speech end to the real reply " +
      "(excludes filler/interim masking)",
    window: `${voiceWindow}${languageNote}`,
    n: firstAudioTurns,
    nUnit: "turns",
    asOf: asOf(data?.window),
  });

  const bucketPicker = (
    <div className="flex justify-end">
      <div className="w-44">
        <Dropdown
          id="latency-bucket"
          size="sm"
          titleText="Granularity"
          hideLabel
          label="Granularity"
          items={BUCKET_ITEMS}
          selectedItem={selectedBucket}
          itemToString={item => item?.label ?? ""}
          onChange={({ selectedItem }) => {
            if (selectedItem) setBucket(selectedItem.id);
          }}
        />
      </div>
    </div>
  );

  /** Pivot a group/key/value series into a chart-detail table. */
  const seriesTable = (
    series: { group: string; key: string; value: number | null }[],
    keyHeader: string,
  ): ChartTableData => {
    const groups = Array.from(new Set(series.map(d => d.group)));
    const keys = Array.from(new Set(series.map(d => d.key)));
    const byPair = new Map(series.map(d => [`${d.key}__${d.group}`, d.value]));
    return {
      columns: [keyHeader, ...groups],
      rows: keys.map(k => [k, ...groups.map(g => byPair.get(`${k}__${g}`) ?? null)]),
    };
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {bucketPicker}

      <ChartCard
        title="Time to first voice — live pipeline"
        caption={
          "How long the learner waits to hear ANY voice — a thinking filler, an " +
          "interim reply, or the reply itself, whichever came first. Median, " +
          "average and slow tail (p95)." +
          (maskedSharePct !== null
            ? ` ${maskedSharePct}% of turns in this window were fronted by a filler or interim.`
            : "")
        }
        source={liveSource}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded("live")}
        errorTitle="Couldn't load time to first voice"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!isLoading && liveSeries.length === 0}
      >
        <ScrollableChart data={liveSeries}>
          <LineChart data={liveSeries} options={voiceOptions} />
        </ScrollableChart>
      </ChartCard>

      {/* The two cards below exist so the headline above stays readable. It
          measures time to the first audio of ANY kind, so it improves both when
          the pipeline gets faster and when more turns are masked by a filler —
          the mix chart says which happened, and the reply chart says what the
          pipeline did underneath. */}
      <ChartCard
        title="What the learner heard first"
        caption="Share of turns fronted by a thinking filler, an interim reply, or the reply itself."
        source={firstAudioSource}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded("firstAudioMix")}
        errorTitle="Couldn't load the first-audio split"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!isLoading && firstAudioMixSeries.length === 0}
        emptyText="No turns with a recorded first-audio source in this range"
      >
        <ScrollableChart data={firstAudioMixSeries}>
          <StackedBarChart data={firstAudioMixSeries} options={firstAudioMixOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Time to first voice, by what spoke"
        caption={
          "Average wait for each kind of first audio. Turns with no recorded " +
          "source have no mean to state and are absent here — see the share " +
          "chart above for how much of the window that is."
        }
        source={firstAudioSource}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded("firstAudioLatency")}
        errorTitle="Couldn't load latency by first-audio source"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!isLoading && firstAudioLatencySeries.length === 0}
        emptyText="No turns with a recorded first-audio source in this range"
      >
        <ScrollableChart data={firstAudioLatencySeries}>
          <LineChart data={firstAudioLatencySeries} options={firstAudioLatencyOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Time to the real reply — live pipeline"
        caption={
          "The same turns measured to the agent's actual answer, ignoring any " +
          "filler or interim in front of it. This is the pipeline's own number: " +
          "it does not improve when more turns are masked."
        }
        source={replyLatencySource}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded("replyLatency")}
        errorTitle="Couldn't load reply latency"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!isLoading && replyLatencySeries.length === 0}
        emptyText="No turns with a recorded first-audio source in this range"
      >
        <ScrollableChart data={replyLatencySeries}>
          <LineChart data={replyLatencySeries} options={replyLatencyOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="LLM time-to-first-token — live pipeline"
        caption="Median, average and slow tail (p95) of graph-start-to-first-token latency."
        source={llmTtftSource}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded("llmTtft")}
        errorTitle="Couldn't load LLM TTFT"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!isLoading && llmTtftSeries.length === 0}
      >
        <ScrollableChart data={llmTtftSeries}>
          <LineChart data={llmTtftSeries} options={llmTtftOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Prompt cache hit rate — live pipeline"
        caption="Share of prompt tokens served from OpenAI's cache, ratio-of-sums per bucket."
        source={cacheHitRateSource}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded("cacheHitRate")}
        errorTitle="Couldn't load prompt cache hit rate"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!isLoading && cacheHitRateSeries.length === 0}
      >
        <ScrollableChart data={cacheHitRateSeries}>
          <LineChart data={cacheHitRateSeries} options={cacheHitRateOptions} />
        </ScrollableChart>
      </ChartCard>

      {/* Only rendered when backfilled data actually exists — an empty context
          chart is a panel nobody can act on. */}
      {historySeries.length > 0 && (
        <ChartCard
          title="Voice-to-voice latency — historical (backfilled)"
          caption="Derived from backfilled transcripts, so not directly comparable with the live pipeline above. Shown for context only."
          source={buildSource({
            derivation: "Transcript-derived latency, backfilled",
            window: `${voiceWindow}${languageNote}`,
            n: historyTurns,
            nUnit: "turns",
            asOf: asOf(data?.window),
          })}
          loading={isLoading && !data}
          onExpand={() => setExpanded("history")}
        >
          <ScrollableChart data={historySeries}>
            <LineChart data={historySeries} options={historyOptions} />
          </ScrollableChart>
        </ChartCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard
          title="Average latency by language"
          caption="Live pipeline, whole window. Sorted slowest first."
          source={buildSource({
            derivation: "Live pipeline turn metrics, mean per language",
            window: voiceWindow,
            n: byLanguageBars.totalTurns,
            nUnit: "turns",
          })}
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load latency by language"
          errorSubtitle="There was a problem fetching turn-latency metrics."
          empty={!isLoading && byLanguageBars.avg.length === 0}
          onExpand={() => setExpanded("byLanguage")}
        >
          <SimpleBarChart data={byLanguageBars.avg} options={languageBarOptions} />
        </ChartCard>
        <ChartCard
          title="p95 latency by language"
          caption="Live pipeline, whole window. Same language order and colours as the chart beside it."
          source={buildSource({
            derivation: "Live pipeline turn metrics, p95 per language",
            window: voiceWindow,
            n: byLanguageBars.totalTurns,
            nUnit: "turns",
          })}
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load latency by language"
          errorSubtitle="There was a problem fetching turn-latency metrics."
          empty={!isLoading && byLanguageBars.p95.length === 0}
          onExpand={() => setExpanded("byLanguage")}
        >
          <SimpleBarChart data={byLanguageBars.p95} options={languageBarOptions} />
        </ChartCard>
        <ChartCard
          title="STT finalize time by language"
          caption="Pure STT finalization time (time to transcript after end of speech), isolated from the broader end-to-end latency beside it. Same language order and colours."
          source={buildSource({
            derivation: "Live pipeline turn metrics, mean STT finalize per language",
            window: voiceWindow,
            n: byLanguageBars.totalTurns,
            nUnit: "turns",
          })}
          loading={isLoading && !data}
          error={isError}
          onRetry={refetch}
          errorTitle="Couldn't load STT finalize time by language"
          errorSubtitle="There was a problem fetching turn-latency metrics."
          empty={!isLoading && byLanguageBars.sttFinalize.length === 0}
          onExpand={() => setExpanded("byLanguage")}
        >
          <SimpleBarChart data={byLanguageBars.sttFinalize} options={languageBarOptions} />
        </ChartCard>
      </div>

      <ChartCard
        title="Simulation start latency by startup phase"
        caption="Live pipeline. Bar height is the mean total time to first word; segments are the ordered phases that make it up."
        source={buildSource({
          derivation: "Live start metrics, mean per phase",
          window: `${startWindow}${languageNote}`,
          n: startLiveSessions,
          nUnit: "sessions",
          asOf: asOf(startData?.window),
        })}
        loading={startLoading && !startData}
        error={startError}
        onRetry={refetchStart}
        onExpand={() => setExpanded("startSegments")}
        errorTitle="Couldn't load start latency"
        errorSubtitle="There was a problem fetching start-latency metrics."
        empty={!startLoading && startSegments.length === 0}
      >
        <ScrollableChart data={startSegments}>
          <StackedBarChart data={startSegments} options={startSegmentOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Time to first word — live vs historical total"
        caption="Both series are whole measurements, so they share an axis honestly. Historical is backfilled and shown as context."
        source={buildSource({
          derivation: "Start metrics, mean total time to first word",
          window: `${startWindow}${languageNote}`,
          n: startAllSessions,
          nUnit: "sessions",
          asOf: asOf(startData?.window),
        })}
        loading={startLoading && !startData}
        error={startError}
        onRetry={refetchStart}
        onExpand={() => setExpanded("startTotals")}
        errorTitle="Couldn't load start latency"
        errorSubtitle="There was a problem fetching start-latency metrics."
        empty={!startLoading && startTotals.length === 0}
      >
        <ScrollableChart data={startTotals}>
          <LineChart data={startTotals} options={startTotalOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Agent-join latency (dispatch → join)"
        caption="Agent-infrastructure timing. Not filtered by language."
        source={buildSource({
          derivation: "Session lifecycle log, dispatch→join percentiles",
          window: reliabilityWindow,
          n: reliabilitySessions,
          nUnit: "sessions",
          asOf: asOf(reliabilityData?.window),
        })}
        loading={reliabilityLoading && !reliabilityData}
        error={reliabilityError}
        onRetry={refetchReliability}
        onExpand={() => setExpanded("joinLatency")}
        errorTitle="Couldn't load join latency"
        errorSubtitle="There was a problem fetching reliability metrics."
        empty={!reliabilityLoading && joinLatencySeries.length === 0}
      >
        <ScrollableChart data={joinLatencySeries}>
          <LineChart data={joinLatencySeries} options={joinLatencyOptions} />
        </ScrollableChart>
      </ChartCard>

      <ChartCard
        title="Agent-join failure, mid-session drop and suspected freeze rate"
        caption="Join failure = agent never joined · Mid-session drop = agent joined then left · Suspected freeze = agent went quiet mid-conversation. Gaps are periods with no sessions, not clean ones. Not filtered by language."
        source={buildSource({
          derivation: "Session lifecycle log, failures ÷ sessions per period",
          window: reliabilityWindow,
          n: reliabilitySessions,
          nUnit: "sessions",
          asOf: asOf(reliabilityData?.window),
        })}
        loading={reliabilityLoading && !reliabilityData}
        error={reliabilityError}
        onRetry={refetchReliability}
        onExpand={() => setExpanded("rates")}
        errorTitle="Couldn't load join reliability"
        errorSubtitle="There was a problem fetching reliability metrics."
        empty={!reliabilityLoading && reliabilityPoints.length === 0}
      >
        <ScrollableChart data={rateSeries}>
          <LineChart data={rateSeries} options={rateOptions} />
        </ScrollableChart>
      </ChartCard>

      <LatencyByScenarioPanel query={query} language={language} onSelectScenario={selectScenario} />

      <LatencySessionsPanel
        query={query}
        language={language}
        initialScenarioId={focusedScenarioId ?? undefined}
        focusToken={focusToken}
      />

      {/* ---------------------------- Detail views ---------------------------- */}

      {expanded === "live" && (
        <ChartDetailModal
          open={expanded === "live"}
          onClose={() => setExpanded(null)}
          title="Time to first voice — live pipeline"
          caption="Time until the learner heard any voice — filler, interim reply or the reply itself. Median, average and slow tail (p95)."
          source={liveSource}
          table={seriesTable(liveSeries, axisTitle)}
          exportContext={[`Window: ${voiceWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={liveSeries}>
              <LineChart data={liveSeries} options={{ ...voiceOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "firstAudioMix" && (
        <ChartDetailModal
          open={expanded === "firstAudioMix"}
          onClose={() => setExpanded(null)}
          title="What the learner heard first"
          caption="Share of turns fronted by a thinking filler, an interim reply, or the reply itself."
          source={firstAudioSource}
          table={seriesTable(firstAudioMixSeries, axisTitle)}
          exportContext={[`Window: ${voiceWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={firstAudioMixSeries}>
              <StackedBarChart
                data={firstAudioMixSeries}
                options={{ ...firstAudioMixOptions, height }}
              />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "firstAudioLatency" && (
        <ChartDetailModal
          open={expanded === "firstAudioLatency"}
          onClose={() => setExpanded(null)}
          title="Time to first voice, by what spoke"
          caption="Average wait for each kind of first audio. Turns with no recorded source are absent."
          source={firstAudioSource}
          table={seriesTable(firstAudioLatencySeries, axisTitle)}
          exportContext={[`Window: ${voiceWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={firstAudioLatencySeries}>
              <LineChart
                data={firstAudioLatencySeries}
                options={{ ...firstAudioLatencyOptions, height }}
              />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "replyLatency" && (
        <ChartDetailModal
          open={expanded === "replyLatency"}
          onClose={() => setExpanded(null)}
          title="Time to the real reply — live pipeline"
          caption="The same turns measured to the agent's actual answer, ignoring any filler or interim in front of it."
          source={replyLatencySource}
          table={seriesTable(replyLatencySeries, axisTitle)}
          exportContext={[`Window: ${voiceWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={replyLatencySeries}>
              <LineChart data={replyLatencySeries} options={{ ...replyLatencyOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "llmTtft" && (
        <ChartDetailModal
          open={expanded === "llmTtft"}
          onClose={() => setExpanded(null)}
          title="LLM time-to-first-token — live pipeline"
          caption="Median, average and slow tail (p95) of graph-start-to-first-token latency."
          source={llmTtftSource}
          table={seriesTable(llmTtftSeries, axisTitle)}
          exportContext={[`Window: ${voiceWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={llmTtftSeries}>
              <LineChart data={llmTtftSeries} options={{ ...llmTtftOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "cacheHitRate" && (
        <ChartDetailModal
          open={expanded === "cacheHitRate"}
          onClose={() => setExpanded(null)}
          title="Prompt cache hit rate — live pipeline"
          caption="Share of prompt tokens served from OpenAI's cache, ratio-of-sums per bucket."
          source={cacheHitRateSource}
          table={seriesTable(cacheHitRateSeries, axisTitle)}
          exportContext={[`Window: ${voiceWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={cacheHitRateSeries}>
              <LineChart data={cacheHitRateSeries} options={{ ...cacheHitRateOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "history" && (
        <ChartDetailModal
          open={expanded === "history"}
          onClose={() => setExpanded(null)}
          title="Voice-to-voice latency — historical (backfilled)"
          source={buildSource({
            derivation: "Transcript-derived latency, backfilled",
            window: voiceWindow,
            n: historyTurns,
            nUnit: "turns",
          })}
          table={seriesTable(historySeries, axisTitle)}
          exportContext={[`Window: ${voiceWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={historySeries}>
              <LineChart data={historySeries} options={{ ...historyOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "byLanguage" && (
        <ChartDetailModal
          open={expanded === "byLanguage"}
          onClose={() => setExpanded(null)}
          title="Latency by language"
          caption="Live pipeline, whole window. Sample size per language is the column the bars cannot show."
          source={buildSource({
            derivation: "Live pipeline turn metrics per language",
            window: voiceWindow,
            n: byLanguageBars.totalTurns,
            nUnit: "turns",
          })}
          table={{
            columns: ["Language", "Average (s)", "p95 (s)", "STT finalize (avg, s)", "Turns"],
            rows: byLanguageBars.avg.map((row, i) => [
              row.group,
              row.value,
              byLanguageBars.p95[i]?.value ?? null,
              byLanguageBars.sttFinalizeByLanguage[row.group] ?? null,
              byLanguageBars.turnsByLanguage[row.group] ?? null,
            ]),
          }}
          exportContext={[`Window: ${voiceWindow}`]}
          render={({ height }) => (
            <SimpleBarChart data={byLanguageBars.avg} options={{ ...languageBarOptions, height }} />
          )}
        />
      )}

      {expanded === "startSegments" && (
        <ChartDetailModal
          open={expanded === "startSegments"}
          onClose={() => setExpanded(null)}
          title="Simulation start latency by startup phase"
          source={buildSource({
            derivation: "Live start metrics, mean per phase",
            window: startWindow,
            n: startLiveSessions,
            nUnit: "sessions",
          })}
          table={seriesTable(startSegments, startAxisTitle)}
          exportContext={[`Window: ${startWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={startSegments}>
              <StackedBarChart data={startSegments} options={{ ...startSegmentOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "startTotals" && (
        <ChartDetailModal
          open={expanded === "startTotals"}
          onClose={() => setExpanded(null)}
          title="Time to first word — live vs historical total"
          source={buildSource({
            derivation: "Start metrics, mean total time to first word",
            window: startWindow,
            n: startAllSessions,
            nUnit: "sessions",
          })}
          table={seriesTable(startTotals, startAxisTitle)}
          exportContext={[`Window: ${startWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={startTotals}>
              <LineChart data={startTotals} options={{ ...startTotalOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "joinLatency" && (
        <ChartDetailModal
          open={expanded === "joinLatency"}
          onClose={() => setExpanded(null)}
          title="Agent-join latency (dispatch → join)"
          source={buildSource({
            derivation: "Session lifecycle log, dispatch→join percentiles",
            window: reliabilityWindow,
            n: reliabilitySessions,
            nUnit: "sessions",
          })}
          table={seriesTable(joinLatencySeries, reliabilityAxisTitle)}
          exportContext={[`Window: ${reliabilityWindow}`, `Granularity: ${bucket}`]}
          render={({ height }) => (
            <ScrollableChart data={joinLatencySeries}>
              <LineChart data={joinLatencySeries} options={{ ...joinLatencyOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "rates" && (
        <ChartDetailModal
          open={expanded === "rates"}
          onClose={() => setExpanded(null)}
          title="Agent-join failure, mid-session drop and suspected freeze rate"
          caption="Blank cells are periods with no sessions — nothing was measured, rather than nothing went wrong."
          source={buildSource({
            derivation: "Session lifecycle log, failures ÷ sessions per period",
            window: reliabilityWindow,
            n: reliabilitySessions,
            nUnit: "sessions",
          })}
          table={{
            columns: [
              reliabilityAxisTitle,
              "Sessions",
              "Join failure %",
              "Mid-session drop %",
              "Suspected freeze %",
            ],
            rows: reliabilityPoints.map(p => [
              p.bucket,
              p.totalSessions,
              p.totalSessions > 0 ? p.failureRatePct : null,
              p.totalSessions > 0
                ? Math.round((p.midSessionDrops / p.totalSessions) * 1000) / 10
                : null,
              p.conversations > 0 ? p.freezeRatePct : null,
            ]),
          }}
          exportContext={[
            `Window: ${reliabilityWindow}`,
            `Granularity: ${bucket}`,
            `Failure-rate ceiling: ${FAILURE_RATE_TARGET_PCT}% (frontend service objective, not measured)`,
          ]}
          render={({ height }) => (
            <ScrollableChart data={rateSeries}>
              <LineChart data={rateSeries} options={{ ...rateOptions, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </div>
  );
};
