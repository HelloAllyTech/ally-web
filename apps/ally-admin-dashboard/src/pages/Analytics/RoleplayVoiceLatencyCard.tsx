import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { useGetVoiceLatencyQuery } from "@api";

import { asOf, windowLabel } from "./analyticsFilters";
import { GROUPINGS, bucketTitle, grainAsBucket, groupingNote } from "./analyticsGrouping";
import { RANGES, RangePicker, defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal, ChartTableData } from "./ChartDetailModal";
import { ChartCard, GroupingPicker, ScrollableChart, buildSource, lineOpts } from "./chartKit";
import { PALETTE } from "./chartScales";
import {
  LATENCY_STAT_SCALE,
  buildVoiceLatencySeries,
  countVoiceLatencyTurns,
} from "./latencyChart";

type ChartId = "latency";

const TITLE = "Roleplay voice latency";

/**
 * `range=all` is rejected by `/v1/analytics/voice-latency` with a 400 (verified
 * against the live endpoint) — the same reason the page-level range picker on
 * Latency & reliability never offered it for ANY chart on that tab. Confirmed
 * live rather than assumed: this card's own `RangePicker` must stay narrowed
 * to the three windows the endpoint actually accepts.
 */
const WINDOWED_RANGES = RANGES.filter(r => r !== "all");

const fmtS = (ms: number | null): string =>
  ms === null ? "—" : `${(Math.round(ms) / 1000).toFixed(1)}s`;

/**
 * Time to first voice, live pipeline only — relocated here from Latency &
 * reliability's "Time to first voice — live pipeline" chart. Its 3 companion
 * diagnostic charts (what the learner heard first, the real-reply latency, the
 * filler-quality charts) stay on that tab; they are not duplicates of this one,
 * they answer different questions about the same window.
 *
 * ## A standalone grain, unlike its old home
 *
 * On Latency & reliability this chart shared ONE bucket control with 13 other
 * charts on that tab. Here it owns its own {@link useChartControls} entry — a
 * full Day/Week/Month/Quarter/Year, plus All-time (which that tab's shared
 * control deliberately does not offer, a scope decision made for THAT page,
 * not this metric). All-time swaps the trend for a KPI tile backed by
 * `VoiceLatencyResponse.overall` — a fresh, whole-window p50/avg/p95 query,
 * never a fold of the bucketed series (percentiles do not average across
 * buckets).
 *
 * ## What's dropped in the move
 *
 * The language filter that lived on Latency & reliability's page-level picker
 * does not exist here — Goals carries no page-level filters at all (see
 * `GoalsXpCard`). This card always reads every language.
 */
export const RoleplayVoiceLatencyCard = () => {
  const { controlsFor, setRange, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.latency",
    defaultControlsFor(["latency"], { latency: { range: "12m" } }),
  );
  const controls = controlsFor("latency");
  const grain = controls.grain;
  const isAllTime = grain === "allTime";

  const { data, isLoading, isError, refetch } = useGetVoiceLatencyQuery(
    { range: controls.range, bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = data?.points ?? [];
  const axisTitle = bucketTitle(grain);
  const series = useMemo(() => buildVoiceLatencySeries(points, "pipeline"), [points]);
  const turns = useMemo(() => countVoiceLatencyTurns(points, "pipeline"), [points]);
  const overall = data?.overall;

  const targetSec = (data?.targetMs ?? 4000) / 1000;

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: LATENCY_STAT_SCALE,
        extra: {
          axes: {
            left: {
              mapsTo: "value",
              scaleType: "linear",
              title: "Seconds",
              includeZero: true,
              thresholds: [
                {
                  value: targetSec,
                  label: `Target ${targetSec}s or under`,
                  fillColor: PALETTE.green,
                },
              ],
            },
            bottom: { mapsTo: "key", scaleType: "labels", title: axisTitle },
          },
        },
      }),
    [axisTitle, targetSec],
  );

  const loading = hydrating || (isLoading && !data);

  const caption =
    "How long the learner waits to hear ANY voice — a thinking filler, an " +
    "interim reply, or the reply itself, whichever came first. Median, average " +
    "and slow tail (p95). All languages, platform-wide.";

  const source = buildSource({
    derivation: "Live pipeline turn metrics, per-turn response latency",
    window: windowLabel(data?.window),
    n: isAllTime ? overall?.turns : turns,
    nUnit: "turns",
    extra: isAllTime ? undefined : groupingNote(grain),
    asOf: asOf(data?.window),
  });

  const seriesTable = (): ChartTableData => {
    const groups = Array.from(new Set(series.map(d => d.group)));
    const keys = Array.from(new Set(series.map(d => d.key)));
    const byPair = new Map(series.map(d => [`${d.key}__${d.group}`, d.value]));
    return {
      columns: [axisTitle, ...groups],
      rows: keys.map(k => [k, ...groups.map(g => byPair.get(`${k}__${g}`) ?? null)]),
    };
  };

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        source={source}
        loading={loading}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded(true)}
        errorTitle="Couldn't load time to first voice"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!loading && !isAllTime && series.length === 0}
        controls={
          <div className="flex items-center gap-2">
            <RangePicker
              id="goals-latency-range"
              value={controls.range}
              onChange={r => setRange("latency", r)}
              options={WINDOWED_RANGES}
            />
            <GroupingPicker
              id="goals-latency-grain"
              value={grain}
              onChange={g => setGrain("latency", g)}
              options={GROUPINGS}
            />
          </div>
        }
        kpi={
          isAllTime
            ? {
                label: "Time to first voice, all time",
                description: "Median / average / p95 voice-to-voice latency, whole window.",
                value: overall
                  ? `p50 ${fmtS(overall.p50Ms)} · avg ${fmtS(overall.avgMs)} · p95 ${fmtS(overall.p95Ms)}`
                  : "—",
                n: overall?.turns,
                nUnit: "turns",
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
      >
        <ScrollableChart data={series}>
          <LineChart data={series} options={opts} />
        </ScrollableChart>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="Time until the learner heard any voice — filler, interim reply or the reply itself. Median, average and slow tail (p95)."
          source={source}
          table={seriesTable()}
          exportContext={[`Window: ${windowLabel(data?.window)}`, groupingNote(grain)]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <LineChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
