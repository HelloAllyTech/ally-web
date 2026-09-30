import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { useGetFoundationalSkillsQuery } from "@api";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, lineOpts } from "./chartKit";
import {
  FHS_DOMAIN,
  FHS_GROUPS,
  FHS_SCALE,
  buildFoundationalSkillsSeries,
  hasPlottedPoint,
  foundationalSkillsEmptyText,
  foundationalSkillsTable,
  foundationalSkillsTakeaway,
} from "./foundationalSkillsChart";
import { PointCountLabels } from "./PointCountLabels";

const TITLE = "Foundational Helping Skills by Practice";

/** A label above a point near the top of the 1–4 axis would run into the legend. */
const LABEL_BELOW_FROM = 3.7;

const nLabel = (datum: Record<string, unknown>): string | null =>
  datum.group === FHS_GROUPS.average && typeof datum.learners === "number"
    ? `n=${datum.learners.toLocaleString()}`
    : null;

const labelAbove = (datum: Record<string, unknown>): boolean =>
  typeof datum.value !== "number" || datum.value < LABEL_BELOW_FROM;

/**
 * Are learners getting better at the skills every helping conversation needs,
 * whatever scenarios they practise? Each learner's completed roleplay speech is
 * cut into 5,000-character slices of their own words, and each slice is scored
 * 1–4 against one fixed foundational helping skills rubric — independent of every
 * scenario's own competencies (backend: `src/foundational-skills`).
 *
 * No grain picker and no window: the axis is practice volume, so a date range
 * would only measure who practised inside it. Platform-wide, like every Priority
 * card. The second line is the survivorship control — see foundationalSkillsChart.
 */
export const FoundationalSkillsCard = () => {
  const { data, isLoading, isError, refetch } = useGetFoundationalSkillsQuery();
  const [expanded, setExpanded] = useState(false);

  const cuts = useMemo(() => data?.cuts ?? [], [data]);
  const series = useMemo(() => buildFoundationalSkillsSeries(cuts), [cuts]);
  const takeaway = foundationalSkillsTakeaway(cuts);
  const table = useMemo(() => foundationalSkillsTable(data), [data]);

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Average score (1–4)",
        bottomTitle: "Cut (5,000 characters of the learner's own speech each)",
        colorScale: FHS_SCALE,
        domain: FHS_DOMAIN,
        legend: true,
        extra: {
          // PointCountLabels reads the dots' positions; mid-transition they are stale.
          animations: false,
          points: { enabled: true, radius: 4 },
          tooltip: {
            valueFormatter: (v: unknown) => (typeof v === "number" ? v.toFixed(2) : String(v)),
          },
        },
      }),
    [],
  );

  const loading = isLoading && !data;
  const firstCut = cuts.find(c => c.cut === 1);

  const caption =
    "Each learner's completed roleplay practice is cut into 5,000-character slices of their own speech; " +
    "cut 1 is their first 5,000 characters, cut 2 the next, whatever scenarios filled them. Every slice is " +
    "scored 1–4 on the foundational helping skills a transcript can show (non-verbal is excluded), skipping " +
    "any skill the slice gave no opportunity for. The blue line is the average at each cut, with n learners " +
    'beside each point ("At this cut"); the grey line ("Their cut 1") is those same learners at their own first cut ' +
    "(learners whose first cut could not be scored drop out of that comparison), so the gap is real " +
    "change rather than a change in who kept practising. 1 = an unhelpful behaviour, 2 = no unhelpful behaviour but not every basic skill (none or some), " +
    "3 = all basic skills, 4 = basic plus advanced.";

  const source = buildSource({
    derivation: "LLM-judged rubric per 5,000-character cut",
    window: "All time",
    n: data?.coverage.learners,
    nUnit: "learners",
    extra: data
      ? `Rubric ${data.rubricVersion} · ${data.coverage.cutsScored.toLocaleString()} of ${data.coverage.cutsSealed.toLocaleString()} cuts scored${
          data.coverage.cutsFailed ? ` (${data.coverage.cutsFailed.toLocaleString()} failed)` : ""
        } · test orgs excluded`
      : undefined,
    asOf: data?.computedAt ? new Date(data.computedAt).toLocaleDateString() : undefined,
  });

  const chart = (height?: string) => (
    <ScrollableChart data={series}>
      <PointCountLabels countOf={nLabel} above={labelAbove}>
        <LineChart data={series} options={height ? { ...opts, height } : opts} />
      </PointCountLabels>
    </ScrollableChart>
  );

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        collapseMeta
        metaExtra={
          takeaway || data?.provenance.note ? (
            <>
              {takeaway && <p>{takeaway}</p>}
              {data?.provenance.note && (
                <p className={takeaway ? "mt-2" : undefined}>{data.provenance.note}</p>
              )}
            </>
          ) : undefined
        }
        source={source}
        loading={loading}
        error={isError}
        onRetry={refetch}
        errorSubtitle="There was a problem fetching foundational skills scores."
        n={firstCut ? firstCut.learners : undefined}
        nUnit="learners at cut 1"
        minN={firstCut ? data?.minSampleSize : undefined}
        empty={!loading && !hasPlottedPoint(series)}
        emptyText={foundationalSkillsEmptyText(data)}
        onExpand={() => setExpanded(true)}
        chartId="AAQ-166"
      >
        {chart()}
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="Every cut reached by at least 5 learners, with each skill's average and the learners it was assessable for. Averages over fewer than the minimum learners show only their n."
          source={source}
          table={table}
          exportContext={[
            "All time, platform-wide, test orgs excluded",
            data ? `Rubric ${data.rubricVersion}` : "",
          ]}
          exportFilename="foundational-helping-skills"
          render={({ height }) => chart(height)}
        />
      )}
    </>
  );
};
