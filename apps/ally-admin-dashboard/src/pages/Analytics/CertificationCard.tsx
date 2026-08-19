import { useMemo, useState } from "react";

import { ComboChart, SimpleBarChart } from "@carbon/charts-react";

import { useGetCertificationQuery } from "@api";

import {
  CERTIFICATION_GROUPS,
  CERTIFICATION_SCALE,
  buildCertificationSeries,
  buildCertificationTable,
  buildPipelineBars,
  buildPipelineScale,
  buildPipelineTable,
  certificationTakeaway,
  monthLabel,
  pipelineTotal,
  plottableCertificationMonths,
} from "./certificationChart";
import { ChartDetailModal } from "./ChartDetailModal";
import {
  ChartCard,
  ScrollableChart,
  buildSource,
  comboOpts,
  hBarOpts,
  integerTickValues,
} from "./chartKit";

const asOfStamp = (computedAt?: string): string | undefined => {
  if (!computedAt) return undefined;
  const d = new Date(computedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Ally Certification attainment — the hero card, first thing on the Highlights
 * tab and the platform's single most important number.
 *
 * The question: how many distinct people have practised enough to be Ally
 * Certified, when did each of them get there, and how many are on the way? Every
 * other engagement figure on this tab is an enabler of this one — practice
 * minutes, session counts and retention all matter because they move learners
 * toward a level, not on their own account. It is placed above the KPI strip and
 * given the page's only full-width combo so the ranking is visible in the layout
 * rather than asserted in a caption.
 *
 * ## Two series, two axes, one quantity
 *
 * Bars are learners who crossed the threshold IN that month; the line is the
 * running total. A learner appears in exactly one bar, ever — the month they
 * earned it — which is what stops the bars from being a redrawing of the line.
 * The second axis is justified here and almost nowhere else: the line is the
 * cumulative sum of the bars, so the scales cannot be made to imply a
 * correlation that the numbers do not contain. See `comboOpts` for the rule.
 *
 * ## The pipeline panel
 *
 * At 5,000 minutes a level takes many months to earn, so crossings read as a
 * flat zero for most of the time the platform is in fact succeeding — and read
 * as nothing at all before the first one lands. The pipeline bands the
 * not-yet-certified learners by how far along they are, which is the leading
 * indicator the crossings cannot be, and it is a real answer on day one.
 *
 * ## Honesty rules on the surface, not in a tooltip
 *  - **The rule is on the card.** A certification whose criteria a reader has to
 *    guess at is a number nobody can act on, so the caption states the threshold
 *    and what counts as a minute.
 *  - **The current month is left off the plot.** It is still accruing crossings,
 *    so its bar can only grow; the table keeps it, flagged.
 *  - **All-time and fixed**, so it says so rather than silently ignoring the
 *    page's date range.
 *  - **Nobody is named.** "How close is the next one" is answered with a minute
 *    count, not a leaderboard: over a small org, naming the top learners names
 *    the people the whole card is about.
 */
export const CertificationCard = ({ tenantId }: { tenantId?: string }) => {
  const { data, isLoading, isError, refetch } = useGetCertificationQuery({ tenantId });
  const [expanded, setExpanded] = useState(false);

  const plotted = useMemo(() => plottableCertificationMonths(data), [data]);
  const series = useMemo(() => buildCertificationSeries(plotted), [plotted]);
  const table = useMemo(() => buildCertificationTable(data), [data]);

  const pipelineBars = useMemo(() => buildPipelineBars(data), [data]);
  const pipelineScale = useMemo(() => buildPipelineScale(data), [data]);
  const pipelineRows = useMemo(() => buildPipelineTable(data), [data]);
  const inPipeline = pipelineTotal(data);

  const takeaway = certificationTakeaway(data);

  const level = data?.level;
  const levelLabel = level?.label ?? "Ally Certification";
  const threshold = level?.minMinutes.toLocaleString("en-US") ?? "5,000";

  // Both axes count PEOPLE, so both get whole-number ticks. Left to itself D3
  // splits a 0-3 range into halves, and half a certified learner does not exist.
  const opts = useMemo(
    () =>
      comboOpts({
        barGroup: CERTIFICATION_GROUPS.newlyCertified,
        lineGroup: CERTIFICATION_GROUPS.totalCertified,
        leftTitle: "Newly certified",
        rightTitle: "Total certified",
        bottomTitle: "Month",
        colorScale: CERTIFICATION_SCALE,
        height: "360px",
        valueTicks: integerTickValues(Math.max(0, ...plotted.map(m => m.newlyCertified))),
        rightTicks: integerTickValues(Math.max(0, ...plotted.map(m => m.cumulativeCertified))),
      }),
    [plotted],
  );

  const pipelineOpts = useMemo(
    () =>
      hBarOpts({
        bottomTitle: "Learners",
        colorScale: pipelineScale,
        height: "220px",
        valueTicks: integerTickValues(Math.max(0, ...pipelineBars.map(b => b.value))),
      }),
    [pipelineScale, pipelineBars],
  );

  const caption =
    `${levelLabel} is earned at ${threshold} lifetime minutes of roleplay practice — ` +
    `bars are the learners who crossed that line in each month, the grey line is the running ` +
    `total. A learner is counted once, in the month they earned it, and never loses it. ` +
    `All-time and monthly — not affected by the date range above. The current month is still ` +
    `accruing, so it is left off the chart and shown in the table instead.`;

  const source = buildSource({
    derivation:
      "Running per-learner totals of user_daily_scores.minutesPlayed over LEARNER accounts, " +
      `first month at or above ${threshold}`,
    window: "All time",
    n: data?.learners,
    nUnit: "learners in scope",
    asOf: asOfStamp(data?.computedAt),
  });

  const nobodyYet = !!data && data.certified === 0;
  const noHistory = plotted.length === 0;

  return (
    <>
      <ChartCard
        wide
        title={`${levelLabel} — learners certified`}
        caption={caption}
        takeaway={takeaway}
        source={source}
        loading={isLoading && !data}
        error={isError}
        onRetry={refetch}
        // Deliberately NOT empty when nobody has certified: zero certified is a
        // measurement, and the pipeline below it is the whole reason this card
        // is useful before the first crossing. The card only goes empty when
        // there is no month axis to draw at all.
        empty={!isLoading && noHistory}
        emptyText="No practice history yet, so there is nothing to certify against."
        onExpand={() => setExpanded(true)}
        height="360px"
      >
        <div className="flex flex-col gap-6">
          {nobodyYet ? (
            <div
              className="flex flex-col items-center justify-center gap-1 rounded border border-dashed border-[#e0e0e0] text-center"
              style={{ height: "360px" }}
            >
              <p className="text-sm font-medium text-typography-600">
                No learner has reached {levelLabel} yet
              </p>
              <p className="text-xs text-typography-500">
                It takes {threshold} minutes of roleplay. The pipeline below shows how far the
                population has got.
              </p>
            </div>
          ) : (
            <ScrollableChart data={series}>
              <ComboChart data={series} options={opts} />
            </ScrollableChart>
          )}

          {/* ------------------------- L1 pipeline ------------------------- */}
          <div className="flex flex-col gap-2 border-t border-[#e0e0e0] pt-4">
            <div>
              <h4 className="text-sm font-medium text-typography-900">
                On the way to {levelLabel}
              </h4>
              <p className="text-xs text-typography-500">
                Learners who have not certified yet, by how far along they are. At {threshold}{" "}
                minutes a level takes many months to earn, so this moves long before the bars above
                do. Bands are lower-inclusive.
              </p>
            </div>

            {inPipeline === 0 ? (
              <div
                className="flex items-center justify-center rounded border border-dashed border-[#e0e0e0] text-sm text-typography-500"
                style={{ height: "220px" }}
              >
                {data && data.learners > 0
                  ? `Every learner in scope already holds ${levelLabel}.`
                  : "No learners in scope."}
              </div>
            ) : (
              <SimpleBarChart data={pipelineBars} options={pipelineOpts} />
            )}

            <p className="text-xs text-typography-500">
              {inPipeline.toLocaleString("en-US")} {plural(inPipeline, "learner", "learners")} in
              the pipeline
              {data && data.nearestMinutes > 0 && (
                <>
                  {" · "}the closest is at {data.nearestMinutes.toLocaleString("en-US")} of{" "}
                  {threshold} minutes
                </>
              )}
              . Counts only — no learner is named, because over a small org a ranking of the people
              closest to a level identifies them.
            </p>
          </div>
        </div>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={`${levelLabel} — learners certified`}
          caption="Monthly and cumulative counts, including the current in-progress month that the chart leaves off."
          source={source}
          table={table}
          exportContext={[
            `${levelLabel} is earned at ${threshold} lifetime minutes of roleplay practice`,
            "Minutes are user_daily_scores.minutesPlayed — roleplay only, net of paused time",
            "Population: LEARNER-group accounts, excluding test tenants",
            "A learner is counted once, in the month their running total first reached the threshold",
            `Window: all time${data?.months?.length ? `, ${monthLabel(data.months[0].month)} onward` : ""}`,
            `Pipeline (as of now): ${pipelineRows.rows.map(r => `${r[0]} = ${r[2]}`).join("; ")}`,
          ]}
          render={({ height }) =>
            nobodyYet ? (
              <div
                className="flex items-center justify-center rounded border border-dashed border-[#e0e0e0] text-sm text-typography-500"
                style={{ height }}
              >
                No learner has reached {levelLabel} yet.
              </div>
            ) : (
              <ScrollableChart data={series}>
                <ComboChart data={series} options={{ ...opts, height }} />
              </ScrollableChart>
            )
          }
        />
      )}
    </>
  );
};
