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
  ScrollableChart,
  boundedDomainNote,
  buildSource,
  lineOpts,
} from "./chartKit";
import {
  PROXY_NPS_DOMAIN,
  PROXY_NPS_LABEL,
  PROXY_NPS_SCALE,
  buildProxyNpsSeries,
} from "./unitCostChart";

type ChartId = "sentiment";

const TITLE = "Sentiment related to role play quality";

/**
 * Learner sentiment (proxy NPS) — relocated + relabelled here from Quality &
 * sentiment's "Learner sentiment (proxy NPS)" chart. Reads the same
 * `QualitySentimentResponse.proxyNps` per bucket and the pre-existing
 * `overallProxyNps` for All-time (already correctly re-weighted server-side,
 * never an average of bucket means — see that field's own doc).
 *
 * ## NOT an NPS — kept in every place the original carried it
 *
 * Ally has never asked the 0–10 "would you recommend" question; this is a
 * PROXY derived from the 1–5 post-session rating. The original chart carried
 * that caveat redundantly in three places (series label, caption, and the
 * server's own `proxyNote` rendered verbatim) so a reader who saw only one of
 * the three still couldn't mistake it for a published NPS — this card keeps
 * all three. The "Roleplay quality" KPI tile on Quality & sentiment still
 * carries its own copy of `proxyNote` too (it says "See the note below",
 * referring to its own page) — this is a second, independent rendering of
 * the same server string, not a place that needed edited.
 *
 * Own grain and window control — not wired to Quality & sentiment's
 * `useChartControls` entry, so this card and that tab's "Roleplay quality"
 * combo chart (left untouched) can be read at different resolutions.
 */
export const RoleplaySentimentCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.sentiment",
    defaultControlsFor(["sentiment"]),
  );
  const controls = controlsFor("sentiment");
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
  const series = useMemo(() => buildProxyNpsSeries(points), [points]);
  const noData = !series.some(d => d.value !== null);

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Proxy NPS",
        bottomTitle: bucketTitle(grain),
        colorScale: PROXY_NPS_SCALE,
        domain: PROXY_NPS_DOMAIN,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const caption =
    `%promoters − %detractors from the 1–5 post-session rating, on the NPS ` +
    `±100 scale. ${boundedDomainNote(PROXY_NPS_DOMAIN)} Suppressed in any ` +
    `period with fewer than ${data?.minResponses ?? 5} responses, where a ` +
    `single rating moves it by tens of points. NOT an NPS — see the note below.`;

  const source = buildSource({
    derivation: "scenario_session_feedbacks.rating, cut 5 / 4 / <=3",
    window: windowLabel(data?.window),
    n: data?.totalResponses,
    nUnit: "ratings",
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
        errorSubtitle="There was a problem fetching learner sentiment."
        empty={!loading && !isAllTime && noData}
        emptyText="Not enough ratings in this window to state a figure"
        onExpand={() => setExpanded(true)}
        controls={
          <GroupingPicker
            id="goals-sentiment-grain"
            value={grain}
            onChange={g => setGrain("sentiment", g)}
            options={GROUPINGS}
          />
        }
        kpi={
          isAllTime
            ? {
                label: "Learner sentiment, all time",
                description: "NOT an NPS — proxy derived from the 1–5 rating, whole window.",
                value:
                  data?.overallProxyNps === null || data?.overallProxyNps === undefined
                    ? "—"
                    : `${data.overallProxyNps}`,
                n: data?.totalResponses,
                nUnit: "ratings",
                loading,
                error: Boolean(error),
                onRetry: () => void refetch(),
              }
            : undefined
        }
        chartId="AAQ-005"
      >
        <ScrollableChart data={series}>
          <LineChart data={series} options={opts} />
        </ScrollableChart>
      </ChartCard>

      {/* The server's own caveat, rendered verbatim, outside the ChartCard so
          it stays visible in both trend and All-time (KPI) mode — the same
          third redundant channel the original chart carried. */}
      {data?.proxyNote && (
        <p className="mt-1 text-xs leading-relaxed text-typography-500">
          <strong>On the proxy NPS:</strong> {data.proxyNote}
        </p>
      )}

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="A PROXY derived from the 1–5 post-session rating, not an NPS."
          source={source}
          table={{
            columns: [bucketTitle(grain), PROXY_NPS_LABEL, "Ratings"],
            rows: points.map(p => [p.bucket, p.proxyNps ?? "—", p.responses]),
          }}
          exportContext={[
            `Window: ${windowLabel(data?.window)}`,
            groupingNote(grain),
            ...(data?.proxyNote ? [data.proxyNote] : []),
          ]}
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
