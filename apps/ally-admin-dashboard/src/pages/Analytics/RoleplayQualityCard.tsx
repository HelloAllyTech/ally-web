import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { useGetQualitySentimentQuery } from "@api";

import { asOf, windowLabel } from "./analyticsFilters";
import { GROUPINGS, bucketTitle, grainAsBucket, groupingNote } from "./analyticsGrouping";
import { defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  GroupingPicker,
  MIN_N_FOR_SCORE,
  ScrollableChart,
  boundedDomainNote,
  buildSource,
  lineOpts,
  single,
} from "./chartKit";
import {
  QUALITY_INDEX_DOMAIN,
  QUALITY_INDEX_LABEL,
  buildQualityIndexSeries,
} from "./unitCostChart";

type ChartId = "quality";

const TITLE = "Roleplay quality";

/**
 * The Roleplay Quality Index, composite number only — no dimension breakdown.
 *
 * New card. The full 4-dimension stacked breakdown of this same index stays on
 * Quality & sentiment's "Roleplay quality" combo chart, which this task leaves
 * completely untouched — that is an intentional second, simpler view of the
 * same metric on Goals, not a duplicate bug, hence the caption below.
 *
 * Reads `QualitySentimentResponse.qualityIndex` per bucket and the new
 * `overallQualityIndex` for All-time (a fresh whole-window blend, never a fold
 * of the bucketed series). Own grain control, own window — this card is not
 * wired to Quality & sentiment's `useChartControls` entry, so switching one
 * does not move the other.
 */
export const RoleplayQualityCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.quality",
    defaultControlsFor(["quality"]),
  );
  const controls = controlsFor("quality");
  const grain = controls.grain;
  const isAllTime = grain === "allTime";

  // Always read the full platform history: this card offers only a grouping
  // control, never a window scope, so the data availability is never narrowed.
  const { data, isLoading, error, refetch } = useGetQualitySentimentQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = useMemo(() => data?.points ?? [], [data?.points]);
  const series = useMemo(() => buildQualityIndexSeries(points), [points]);
  const noData = !series.some(d => d.value !== null);

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Quality index",
        bottomTitle: bucketTitle(grain),
        colorScale: single(QUALITY_INDEX_LABEL),
        domain: QUALITY_INDEX_DOMAIN,
        legend: false,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const caption =
    `Weighted blend of actor-goal score, in-character rate, language quality ` +
    `and response latency, one number per period. ${boundedDomainNote(QUALITY_INDEX_DOMAIN)} ` +
    `The full 4-dimension breakdown lives on the Quality & sentiment tab — this ` +
    `card shows only the composite.`;

  const source = buildSource({
    derivation:
      "Weighted blend of actor-goal score, in-character rate, language quality " +
      "and response latency; each normalised 0-100 and re-weighted over whichever " +
      "dimensions had data" +
      (data?.indexVersion ? ` (index v${data.indexVersion})` : ""),
    window: windowLabel(data?.window),
    n: data?.totalEvaluatedSessions,
    nUnit: "evaluated sessions",
    extra: isAllTime ? undefined : groupingNote(grain),
    asOf: asOf(data?.window),
  });

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        source={source}
        loading={loading}
        error={Boolean(error)}
        onRetry={() => void refetch()}
        errorSubtitle="There was a problem fetching quality scores."
        empty={!loading && !isAllTime && noData}
        emptyText="No session in this window has been evaluated"
        onExpand={() => setExpanded(true)}
        n={data?.totalEvaluatedSessions}
        minN={MIN_N_FOR_SCORE}
        controls={
          <GroupingPicker
            id="goals-quality-grain"
            value={grain}
            onChange={g => setGrain("quality", g)}
            options={GROUPINGS}
          />
        }
        kpi={
          isAllTime
            ? {
                label: "Roleplay quality, all time",
                description: "Whole-window Roleplay Quality Index, 0–100.",
                value:
                  data?.overallQualityIndex === null || data?.overallQualityIndex === undefined
                    ? "—"
                    : `${data.overallQualityIndex}`,
                n: data?.totalEvaluatedSessions,
                nUnit: "evaluated sessions",
                minN: MIN_N_FOR_SCORE,
                loading,
                error: Boolean(error),
                onRetry: () => void refetch(),
              }
            : undefined
        }
        chartId="AAQ-004"
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
          caption="The composite Roleplay Quality Index only — see Quality & sentiment for the 4-dimension breakdown."
          source={source}
          table={{
            columns: [bucketTitle(grain), QUALITY_INDEX_LABEL, "Evaluated sessions"],
            rows: points.map(p => [p.bucket, p.qualityIndex ?? "—", p.evaluatedSessions]),
          }}
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
