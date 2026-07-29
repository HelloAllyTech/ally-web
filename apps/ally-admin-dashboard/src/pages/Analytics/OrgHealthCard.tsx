import { useMemo } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import { OrgHealthResponse } from "@types";

import { asOfStamp } from "./analyticsFilters";
import { ChartCard, Sparkline, buildSource } from "./chartKit";
import { CONTEXT, PALETTE } from "./chartScales";
import {
  ORG_STATUS_COLOR,
  creditUtilisationLabel,
  formatCount,
  formatDay,
  orgHealthTakeaway,
  orgStatus,
} from "./testingChart";

/**
 * The account-management agenda: one row per customer organisation, ordered by
 * how long it has been quiet.
 *
 * A TABLE, not a chart, and deliberately so. The decision this panel serves is
 * "who do we call this week", which needs names and exact values — chart for
 * shape, table for value. The shape that does matter (is this org's practice
 * volume rising or fading?) is carried per row by a sparkline over a shared
 * twelve-week axis, so the rows are comparable with each other rather than each
 * being scaled to itself.
 *
 * Two honesty rules the card enforces:
 *  - **Below the minimum group size, counts travel and rates do not.** An org
 *    with three learners is three identifiable people; a utilisation percentage
 *    over them is a statement about individuals. The row stays — dropping it
 *    would understate the totals and hide exactly the tail a churn question is
 *    about — and its rates are replaced with the group's size.
 *  - **"No credit limit set" is not 0% utilisation.** There is no ceiling to be a
 *    share of, so the cell says so instead of printing a zero.
 */
export const OrgHealthCard = ({
  data,
  loading,
  error,
  onRetry,
}: {
  data?: OrgHealthResponse;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) => {
  const rows = data?.orgs ?? [];
  const buckets = data?.trendBuckets ?? [];

  const axisLabel = useMemo(() => {
    if (buckets.length === 0) return "";
    const first = buckets[0];
    const last = buckets[buckets.length - 1];
    return `${first} → ${last}`;
  }, [buckets]);

  return (
    <ChartCard
      wide
      title="Organisation health"
      caption={
        "One row per customer, longest silence first. The sparkline is completed simulations per week over the last " +
        `${buckets.length || 12} weeks on a shared axis${axisLabel ? ` (${axisLabel})` : ""}. ` +
        `Organisations with fewer than ${data?.minGroupSize ?? 5} learners keep their counts and have their rates ` +
        "suppressed — a percentage over four identifiable people is a statement about those people."
      }
      source={buildSource({
        derivation: "Completed simulations per org, credits summed from per-learner allocations",
        window: "All time, with a trailing 12-week trend and 28-day activity windows",
        n: data?.summary.orgs,
        nUnit: "organisations",
        asOf: asOfStamp(data?.computedAt),
      })}
      takeaway={orgHealthTakeaway(data?.summary)}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!loading && rows.length === 0}
      emptyText="No organisations with any activity yet"
      height="auto"
    >
      <TableContainer>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Organisation</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Last 12 weeks</TableHeader>
              <TableHeader>Learners</TableHeader>
              <TableHeader>Active (28d)</TableHeader>
              <TableHeader>Sims (28d)</TableHeader>
              <TableHeader>Sims (all time)</TableHeader>
              <TableHeader>Last session</TableHeader>
              <TableHeader>Credits used</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => {
              const status = orgStatus(row);
              return (
                <TableRow key={row.tenantId}>
                  <TableCell>
                    <span className="font-medium">{row.tenantName}</span>
                    {row.code && <span className="text-typography-500"> · {row.code}</span>}
                  </TableCell>
                  <TableCell>
                    {/* The word carries the meaning; the colour only reinforces
                        it, so the cell survives greyscale and colour-blindness. */}
                    <span style={{ color: ORG_STATUS_COLOR[status] }}>{status}</span>
                  </TableCell>
                  <TableCell>
                    <Sparkline
                      values={row.trend}
                      color={status === "dormant" ? CONTEXT.line : PALETTE.blue}
                      label={`${row.tenantName} weekly completed simulations`}
                    />
                  </TableCell>
                  <TableCell>{formatCount(row.learners)}</TableCell>
                  <TableCell>
                    {row.belowFloor ? (
                      <span className="text-typography-500">n = {row.learners} · suppressed</span>
                    ) : (
                      formatCount(row.activeLearners28d)
                    )}
                  </TableCell>
                  <TableCell>{formatCount(row.completedLast28d)}</TableCell>
                  <TableCell>{formatCount(row.completedSimulations)}</TableCell>
                  <TableCell>{formatDay(row.lastCompletedAt)}</TableCell>
                  <TableCell>
                    {row.belowFloor ? (
                      <span className="text-typography-500">suppressed</span>
                    ) : (
                      creditUtilisationLabel(row)
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </ChartCard>
  );
};
