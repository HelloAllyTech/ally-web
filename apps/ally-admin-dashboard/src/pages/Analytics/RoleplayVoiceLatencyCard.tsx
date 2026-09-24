import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetVoiceLatencyQuery } from "@api";

import { asOf, windowLabel } from "./analyticsFilters";
import { GROUPINGS, bucketTitle, grainAsBucket, groupingNote } from "./analyticsGrouping";
import { defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal, ChartTableData } from "./ChartDetailModal";
import { ChartCard, GroupingPicker, ScrollableChart, buildSource, lineOpts } from "./chartKit";
import { PALETTE } from "./chartScales";
import {
  LATENCY_GROUPS,
  LATENCY_GROUP_HELP,
  LATENCY_STAT_SCALE,
  buildVoiceLatencySeries,
  countVoiceLatencyTurns,
} from "./latencyChart";

type ChartId = "latency";

const TITLE = "Roleplay Voice Latency";

const LEGEND_GROUPS = [LATENCY_GROUPS.p50, LATENCY_GROUPS.avg, LATENCY_GROUPS.p95];

/** The typical wait is the headline; average and the slow tail are opt-in detail. */
const DEFAULT_VISIBLE = [LATENCY_GROUPS.p50];

/**
 * The chart's legend, drawn here instead of by Carbon so each entry can carry a
 * hover explanation — Carbon's own legend has no per-item tooltip. Clicking an
 * entry shows or hides its line; the last visible line can't be switched off,
 * so the chart is never left empty.
 */
const LatencyLegend = ({
  visible,
  onToggle,
}: {
  visible: string[];
  onToggle: (group: string) => void;
}) => (
  <div className="flex flex-wrap items-center gap-4 pt-3">
    {LEGEND_GROUPS.map(group => {
      const on = visible.includes(group);
      return (
        <Tooltip key={group} label={LATENCY_GROUP_HELP[group]} align="bottom">
          <button
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(group)}
            className={`inline-flex cursor-pointer items-center gap-2 text-sm ${on ? "" : "opacity-50"}`}
          >
            <span
              aria-hidden
              className="inline-block h-3 w-3 border"
              style={{
                borderColor: LATENCY_STAT_SCALE[group],
                backgroundColor: on ? LATENCY_STAT_SCALE[group] : "transparent",
              }}
            />
            <span className="underline decoration-dotted underline-offset-4">{group}</span>
          </button>
        </Tooltip>
      );
    })}
  </div>
);

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
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.latency",
    defaultControlsFor(["latency"]),
  );
  const grain = controlsFor("latency").grain;
  const isAllTime = grain === "allTime";

  // Always the whole history — the grouping picker is the only control, like
  // the other Goals charts. The endpoint opens `range=all` on its first turn.
  const { data, isLoading, isError, refetch } = useGetVoiceLatencyQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = data?.points ?? [];
  const axisTitle = bucketTitle(grain);
  const series = useMemo(() => buildVoiceLatencySeries(points, "pipeline"), [points]);
  const [visible, setVisible] = useState<string[]>(DEFAULT_VISIBLE);
  const toggleGroup = (group: string) =>
    setVisible(v =>
      v.includes(group) ? (v.length > 1 ? v.filter(g => g !== group) : v) : [...v, group],
    );
  const shown = useMemo(() => series.filter(d => visible.includes(d.group)), [series, visible]);
  const turns = useMemo(() => countVoiceLatencyTurns(points, "pipeline"), [points]);
  const overall = data?.overall;

  const targetSec = (data?.targetMs ?? 4000) / 1000;

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Seconds",
        bottomTitle: axisTitle,
        colorScale: LATENCY_STAT_SCALE,
        legend: false,
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
        collapseMeta
        source={source}
        loading={loading}
        error={isError}
        onRetry={refetch}
        onExpand={() => setExpanded(true)}
        errorTitle="Couldn't load time to first voice"
        errorSubtitle="There was a problem fetching turn-latency metrics."
        empty={!loading && !isAllTime && series.length === 0}
        controls={
          <GroupingPicker
            id="goals-latency-grain"
            value={grain}
            onChange={g => setGrain("latency", g)}
            options={GROUPINGS}
          />
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
        chartId="AAQ-003"
      >
        <ScrollableChart data={shown}>
          <LineChart data={shown} options={opts} />
        </ScrollableChart>
        {!isAllTime && series.length > 0 && (
          <LatencyLegend visible={visible} onToggle={toggleGroup} />
        )}
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
            <>
              <ScrollableChart data={shown}>
                <LineChart data={shown} options={{ ...opts, height }} />
              </ScrollableChart>
              <LatencyLegend visible={visible} onToggle={toggleGroup} />
            </>
          )}
        />
      )}
    </>
  );
};
