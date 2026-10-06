import { useMemo, useState } from "react";

import { SimpleBarChart } from "@carbon/charts-react";

import { StickinessResponse } from "@types";

import { asOfStamp } from "./analyticsFilters";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, ScrollableChart, barOpts, buildSource } from "./chartKit";
import {
  SPACING_TABLE_COLUMNS,
  buildSpacingBars,
  hasSpacingShares,
  spacingScale,
  spacingTableRows,
  spacingTakeaway,
} from "./practiceSpacingChart";

const TITLE = "Practice spacing";

/**
 * Practice spacing — Highlights → Usage, AAQ-224.
 *
 * How long learners leave between sessions, beside the "do they come back?"
 * funnel it shares a response with: the funnel counts return DAYS, this shows
 * the rhythm of the returns. Takes the stickiness query's result from the tab
 * rather than calling the hook itself, so the two cards are visibly one
 * request.
 *
 * All time and no picker, like the funnel: a window would cut every gap that
 * straddles its edge and report recent learners as having none.
 */
export const PracticeSpacingCard = ({
  stickiness,
  loading,
  error,
  onRetry,
}: {
  stickiness: StickinessResponse | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const spacing = stickiness?.spacing;
  // A response without the block is a backend from before 2026-10: say so,
  // rather than rendering an empty chart that reads as "nobody returns".
  const missing = Boolean(stickiness) && !spacing;

  const bands = useMemo(() => spacing?.bands ?? [], [spacing]);
  const bars = useMemo(() => buildSpacingBars(bands), [bands]);
  const opts = useMemo(
    () =>
      barOpts({
        leftTitle: "Share of gaps (%)",
        bottomTitle: "Days until the learner's next session",
        colorScale: spacingScale(bands),
      }),
    [bands],
  );

  const source = buildSource({
    derivation: "Whole days between consecutive countable sessions of the same learner",
    window: "all time",
    n: spacing?.totalGaps,
    nUnit: "gaps",
    extra: spacing
      ? `${spacing.activeLearners.toLocaleString()} learners with 2+ sessions`
      : undefined,
    asOf: asOfStamp(stickiness?.computedAt),
  });

  const caption =
    "All time. Every gap between one session and the same learner's next, as a share of all gaps. " +
    "0–1 days is massed practice — back-to-back sessions in one sitting land there. " +
    "Learners choose their own rhythm, so this describes it; it does not show that spacing helps." +
    (spacing?.medianGapDays != null
      ? ` The typical learner's median gap is ${spacing.medianGapDays} days.`
      : "");

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={caption}
        source={source}
        takeaway={spacing ? spacingTakeaway(spacing) : undefined}
        loading={loading}
        error={error || missing}
        errorSubtitle={
          missing
            ? "The stickiness endpoint returned no spacing figures — the backend may not be deployed yet."
            : "There was a problem fetching practice spacing."
        }
        onRetry={onRetry}
        // A real 0 gaps is empty; a non-zero count under the floor is thin.
        n={spacing && spacing.totalGaps > 0 ? spacing.totalGaps : undefined}
        nUnit="gaps"
        minN={spacing?.minGapSample}
        empty={
          !loading && Boolean(spacing) && (spacing?.totalGaps === 0 || !hasSpacingShares(bands))
        }
        emptyText="No learner has two countable sessions yet"
        onExpand={() => setExpanded(true)}
        chartId="AAQ-224"
      >
        <ScrollableChart data={bars} on="group">
          <SimpleBarChart data={bars} options={opts} />
        </ScrollableChart>
      </ChartCard>

      <ChartDetailModal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={TITLE}
        caption="Gap counts always; shares are withheld below the minimum number of gaps."
        source={source}
        render={({ height }) => <SimpleBarChart data={bars} options={{ ...opts, height }} />}
        table={{ columns: SPACING_TABLE_COLUMNS, rows: spacingTableRows(bands) }}
        exportContext={[
          "Window: All time",
          spacing?.provenance.derivation ?? "",
          spacing?.provenance.note ?? "",
        ]}
        exportFilename="practice-spacing"
      />
    </>
  );
};
