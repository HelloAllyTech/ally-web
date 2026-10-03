import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { CarbonDropdown as Dropdown } from "@ally-ui-mono/ui-shared";
import { useGetFoundationalSkillsQuery } from "@api";

import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, buildSource, lineOpts } from "./chartKit";
import {
  FHS_DOMAIN,
  FHS_GROUPS,
  buildFoundationalSkillsSeries,
  fhsScale,
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
const BASELINE_ITEMS: { id: 1 | 2; label: string }[] = [
  { id: 1, label: "Compare with cut 1" },
  { id: 2, label: "Compare with cut 2 (skip warm-up)" },
];

export const FoundationalSkillsCard = () => {
  // Cut 1 behaves like a warm-up on production data (feedback-seeking and
  // unhelpful behaviour both step once between cut 1 and cut 2), so the reader
  // can choose cut 2 as the baseline and see what practice did after it.
  const [baselineCut, setBaselineCut] = useState<1 | 2>(1);
  const { data, isLoading, isError, refetch } = useGetFoundationalSkillsQuery({ baselineCut });
  const [expanded, setExpanded] = useState(false);

  const base = data?.baselineCut ?? baselineCut;
  const cuts = useMemo(() => data?.cuts ?? [], [data]);
  const series = useMemo(() => buildFoundationalSkillsSeries(cuts, base), [cuts, base]);
  const takeaway = foundationalSkillsTakeaway(cuts, base);
  const table = useMemo(() => foundationalSkillsTable(data), [data]);

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Average score (1–4)",
        bottomTitle: "Cut (5,000 characters of the learner's own speech each)",
        colorScale: fhsScale(base),
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
    [base],
  );

  const loading = isLoading && !data;
  const firstCut = cuts.find(c => c.cut === 1);

  const caption =
    "Each learner's completed roleplay practice is cut into 5,000-character slices of their own speech; " +
    "cut 1 is their first 5,000 characters, cut 2 the next, whatever scenarios filled them. Every slice is " +
    "scored 1–4 on the foundational helping skills a transcript can show (non-verbal is excluded), skipping " +
    "any skill the slice gave no opportunity for. The blue line is the average at each cut, with n learners " +
    `beside each point ("At this cut"); the grey line ("Their cut ${base}") is those same learners at their own cut ${base} ` +
    `(learners whose cut ${base} could not be scored drop out of that comparison), so the gap is change ` +
    "within the same people rather than a change in who kept practising. The takeaway gives its 95% interval: a gap " +
    "whose interval includes zero is not distinguishable from noise. 1 = an unhelpful behaviour, 2 = no unhelpful behaviour but not every basic skill (none or some), " +
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
        controls={
          <Dropdown
            id="fhs-baseline-cut"
            size="sm"
            type="inline"
            label="Baseline"
            titleText=""
            hideLabel
            items={BASELINE_ITEMS}
            itemToString={(i: (typeof BASELINE_ITEMS)[number]) => i?.label ?? ""}
            selectedItem={BASELINE_ITEMS.find(i => i.id === baselineCut)}
            onChange={({ selectedItem }: { selectedItem: (typeof BASELINE_ITEMS)[number] }) =>
              selectedItem && setBaselineCut(selectedItem.id)
            }
          />
        }
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
