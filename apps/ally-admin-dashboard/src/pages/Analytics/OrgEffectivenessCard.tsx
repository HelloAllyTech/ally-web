import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import { useGetEffectivenessOrgsQuery } from "@api";

import { asOfStamp } from "./analyticsFilters";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, buildSource } from "./chartKit";
import { CONTEXT, PALETTE } from "./chartScales";
import { changeColor } from "./foundationalSkillsProgressChart";
import {
  Cell,
  EffectivenessOrgsResponse,
  ScorecardRow,
  completionCell,
  compositeCell,
  improvingCell,
  scorecardRows,
  scorecardTable,
  scorecardTakeaway,
  selfHarmCell,
  sparkAxisText,
  unhelpfulCell,
} from "./orgEffectivenessChart";

/** Stable empty argument: every org at once (the card has no org filter of its own). */
const EVERY_ORG = {};

/**
 * A sparkline on a FIXED value axis. The shared `Sparkline` scales each row to
 * its own min and max, which turns a 2.4 → 2.5 wobble into a full-height swing
 * and makes rows incomparable; the composite has a known 1–4 scale and the
 * server sends it, so every row is drawn against the same one. Nulls break the
 * line (a month under the floor is no measurement, never a zero), and a lone
 * stated month still shows as a dot.
 */
const ScaleSparkline = ({
  values,
  domain,
  label,
  color = PALETTE.blue,
  width = 88,
  height = 24,
}: {
  values: (number | null)[];
  domain: [number, number];
  label: string;
  color?: string;
  width?: number;
  height?: number;
}) => {
  if (!values.some(v => v !== null)) {
    return <span className="text-[11px] text-typography-500">—</span>;
  }
  const [lo, hi] = domain;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const x = (i: number) => i * step;
  const y = (v: number) =>
    height - 1 - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (height - 2);
  const runs: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length) runs.push(current);
      current = [];
      return;
    }
    current.push({ x: x(i), y: y(v) });
  });
  if (current.length) runs.push(current);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <line
        x1={0}
        x2={width}
        y1={height - 1}
        y2={height - 1}
        stroke={CONTEXT.faint}
        strokeWidth={0.5}
      />
      {runs.map(run =>
        run.length === 1 ? (
          <circle key={`${run[0].x}`} cx={run[0].x} cy={run[0].y} r={1.75} fill={color} />
        ) : (
          <polyline
            key={`${run[0].x}`}
            points={run.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ),
      )}
    </svg>
  );
};

/** One scorecard cell: the value, a quieter note under it; colour only for a detectable change. */
const ScoreCell = ({ cell }: { cell: Cell }) => (
  <span className="flex flex-col leading-tight">
    <span
      className={cell.withheld ? "text-typography-500" : "tabular-nums"}
      style={
        cell.detectable && cell.change !== undefined
          ? { color: changeColor({ change: cell.change ?? null, detectable: true }) }
          : undefined
      }
    >
      {cell.text}
    </span>
    {cell.note && <span className="text-[11px] text-typography-500 tabular-nums">{cell.note}</span>}
  </span>
);

const ScorecardTable = ({
  data,
  rows,
}: {
  data: EffectivenessOrgsResponse;
  rows: ScorecardRow[];
}) => (
  <TableContainer>
    <Table size="sm">
      <TableHead>
        <TableRow>
          <TableHeader>Organisation</TableHeader>
          <TableHeader>Measurable learners</TableHeader>
          <TableHeader>Composite change ± CI</TableHeader>
          <TableHeader>Improving beyond noise</TableHeader>
          <TableHeader>Unhelpful change</TableHeader>
          <TableHeader>Course completion</TableHeader>
          <TableHeader>
            <span className="inline-flex items-center gap-1">
              Self-harm follow-up
              <span className="rounded border border-[#a2191f] px-1 text-[10px] font-semibold uppercase tracking-wide text-[#a2191f]">
                Internal
              </span>
            </span>
          </TableHeader>
          <TableHeader>Median composite, 6 months</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(r => {
          const m = r.metrics;
          return (
            <TableRow key={r.key}>
              <TableCell>
                <span className={r.platform ? "font-semibold" : "font-medium"}>{r.name}</span>
                {r.code && <span className="text-typography-500"> · {r.code}</span>}
                {m.belowFloor && (
                  <span className="block text-[11px] text-typography-500">
                    under {data.minSampleSize} measurable learners — rates withheld
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="flex flex-col leading-tight tabular-nums">
                  <span>{m.measurableLearners.toLocaleString()}</span>
                  <span className="text-[11px] text-typography-500">
                    {m.scoredCuts.toLocaleString()} slices
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <ScoreCell cell={compositeCell(m)} />
              </TableCell>
              <TableCell>
                <ScoreCell cell={improvingCell(m)} />
              </TableCell>
              <TableCell>
                <ScoreCell cell={unhelpfulCell(m)} />
              </TableCell>
              <TableCell>
                <ScoreCell cell={completionCell(m)} />
              </TableCell>
              <TableCell>
                <ScoreCell cell={selfHarmCell(m)} />
              </TableCell>
              <TableCell>
                <ScaleSparkline
                  values={m.belowFloor ? m.spark.map(() => null) : m.spark}
                  domain={data.scoreDomain}
                  color={r.platform ? CONTEXT.strong : PALETTE.blue}
                  label={`${r.name} median helping-skills composite by month`}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

/**
 * Highlights → Orgs: the org effectiveness scorecard (AAQ-232).
 *
 * One row per non-test org with its learners' own start → now change on the
 * helping-skills composite, the share improving beyond noise, the change in
 * unhelpful behaviour, course completion and (internal) self-harm cue
 * follow-up — the platform-wide row on top as the reference. Sorted by
 * measurable learners, as the server sends it, never by a rate: this is a
 * partner-reporting view, not a league table. Rows under the floor keep their
 * counts and say "withheld" for every rate.
 */
export const OrgEffectivenessCard = () => {
  const [open, setOpen] = useState(false);
  const q = useGetEffectivenessOrgsQuery(EVERY_ORG);
  const data = q.data;
  const rows = data ? scorecardRows(data) : [];
  const months = data ? sparkAxisText(data.sparkMonths) : "";

  const source = buildSource({
    derivation: "Each learner's own first half → last half of scored slices, one fixed rubric",
    window: "All time",
    n: data?.summary.orgsWithData,
    nUnit: "orgs with data",
    extra: data
      ? `rubric ${data.rubricVersion}${
          data.summary.cutsUnattributed > 0
            ? ` · ${data.summary.cutsUnattributed} slices with no live org are in the platform row only`
            : ""
        }`
      : undefined,
    asOf: asOfStamp(data?.computedAt),
  });
  const caption = data
    ? `Per org: learners with 2+ scored slices there; the composite change (1–4) from each learner's first half of slices to their last half, ± 95% interval, coloured only when it excludes zero; the share improving beyond the platform noise band (learners with ${data.thresholds.trendMinCuts}+ slices); the change in slices with an unhelpful behaviour, in percentage points (down is good); and course completion. Orgs under ${data.minSampleSize} measurable learners show counts and "withheld". The sparkline is the median composite per month (${months}) on the fixed ${data.scoreDomain[0]}–${data.scoreDomain[1]} scale, blank in a month with under ${data.sparkMinCuts} slices. Self-harm follow-up is internal — unaudited judge coding; share only privately with partners. Ordered by measurable learners, never by a rate.`
    : "Each org's learners against their own start, with the platform as the reference row.";

  return (
    <>
      <ChartCard
        wide
        title="Org effectiveness scorecard"
        caption={caption}
        source={source}
        takeaway={data ? scorecardTakeaway(data) : undefined}
        loading={q.isLoading && !data}
        error={q.isError && !data}
        onRetry={q.refetch}
        errorSubtitle="The org effectiveness endpoint did not respond — it may not be deployed yet."
        empty={!!data && data.orgs.length === 0}
        emptyText="No org has scored practice or a started course yet"
        height="auto"
        onExpand={data ? () => setOpen(true) : undefined}
        chartId="AAQ-232"
      >
        {data && <ScorecardTable data={data} rows={rows} />}
      </ChartCard>

      {data && open && (
        <ChartDetailModal
          open
          onClose={() => setOpen(false)}
          title="Org effectiveness scorecard"
          caption="Every org with the counts behind each rate, the start and now averages, and the monthly medians. Blank = withheld under the floor."
          source={source}
          render={() => <ScorecardTable data={data} rows={rows} />}
          table={scorecardTable(data)}
          exportContext={[
            data.provenance.derivation,
            data.provenance.note,
            "Self-harm follow-up columns are internal: unaudited judge coding; share only privately with partners.",
          ]}
          exportFilename="org-effectiveness-scorecard"
        />
      )}
    </>
  );
};
