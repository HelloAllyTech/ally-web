import React, { FC, useEffect, useRef, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import { useGetBugHuntRunQuery, useGetBugHuntRunsQuery } from "@api";
import { TooltipIcon } from "@assets";
import { EmptyState } from "@components";
import { en } from "@constants";
import { BugHuntRun, BugHuntTrigger } from "@types";
import { formatDateTime, formatTimestamp } from "@utils";

import { useBugHunterUrlState } from "./bugHunterUrlState";
import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";
import { BugHuntStatusBadge } from "./BugHuntStatusBadge";
import { BUG_FINDINGS_TABLE_ANCHOR_ID } from "./findingsTableAnchor";

const TRIGGER_LABELS: Record<BugHuntTrigger, string> = {
  [BugHuntTrigger.SCHEDULED]: en.bugHunter.triggerScheduled,
  [BugHuntTrigger.MANUAL]: en.bugHunter.triggerManual,
  [BugHuntTrigger.FIX_SESSION]: en.bugHunter.triggerFixSession,
};

/** "—" for runs closed before token counts were tracked, not just cost. */
const formatTokens = (input: number | null, output: number | null): string =>
  input == null || output == null
    ? "—"
    : `${input.toLocaleString()} in / ${output.toLocaleString()} out`;

/** Prefers the CLI's own reported cost (prices prompt-cache correctly) over the cache-blind token estimate. */
const formatCost = (run: BugHuntRun): string =>
  `$${run.cliReportedCostUsd != null ? run.cliReportedCostUsd.toFixed(4) : run.totalTokenCostUsd}`;

/**
 * The "Found" count, as the way into the bugs that count is about.
 *
 * ## Why this is a link at all
 *
 * "Found 10" and a bugs table sorted newest-first disagreed, and the count was
 * the honest one. `foundCount` is every finding a sweep *touched*, and most of
 * what a sweep touches on a quiet night is human-reported bugs it re-triages —
 * rows created the day somebody filed them, weeks before this run stamped
 * itself onto them. So a sweep reporting ten could add nothing at all to the
 * top of a table ordered by discovery date, and the only available reading was
 * that the ten had gone missing.
 *
 * The count is the aggregate; the rows are the records behind it. Making the
 * one reach the other is Stacks' *Correlate Logs and Traces via Shared
 * Metadata* — the shared id is `runId`, and the jump from "a number looks wrong"
 * to "here is exactly what produced it" is the whole value of having it.
 *
 * Zero stays plain text. A link that leads to an empty table teaches a reader
 * that the links are unreliable.
 */
const FoundCell: FC<{ run: BugHuntRun }> = ({ run }) => {
  const { setRun } = useBugHunterUrlState();

  if (run.foundCount === 0) return <>{run.foundCount}</>;

  return (
    <button
      type="button"
      // The row itself toggles the event timeline. Without this, one click both
      // scopes the table and expands a detail row the reader is about to be
      // scrolled away from.
      onClick={event => {
        event.stopPropagation();
        setRun(run.id);
        document
          .getElementById(BUG_FINDINGS_TABLE_ANCHOR_ID)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="text-primary-600 underline underline-offset-2 cursor-pointer tabular-nums hover:text-primary-700"
      aria-label={en.bugHunter.runScopeCellLabel
        .replace("{count}", String(run.foundCount))
        .replace("{repo}", run.repo)}
    >
      {run.foundCount}
    </button>
  );
};

/** A column header with a help tooltip — the pattern from the ally-web admin tooltip convention, applied per-column instead of per-field. */
const HeaderWithTooltip: FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <span className="inline-flex items-center gap-1">
    {label}
    <Tooltip label={tooltip} align="top">
      <button type="button" className="cursor-pointer inline-flex items-center">
        <TooltipIcon />
      </button>
    </Tooltip>
  </span>
);

const RunDetailRow: FC<{ runId: string }> = ({ runId }) => {
  const { data, isLoading, isError } = useGetBugHuntRunQuery(runId);

  return (
    <TableRow className="bg-neutral-50">
      <TableCell colSpan={10} className="py-3 px-4">
        <p className="text-xs font-semibold text-typography-700 mb-2">
          {en.bugHunter.detailEventsTitle}
        </p>
        {isLoading ? (
          <p className="text-sm text-typography-600">…</p>
        ) : isError || !data ? (
          <p className="text-sm text-destructive-600">{en.bugHunter.detailLoadFailed}</p>
        ) : data.events.length === 0 ? (
          <p className="text-sm text-typography-500">—</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.events.map(event => (
              <li key={event.id} className="text-sm text-typography-800 flex gap-2">
                <span className="text-typography-500 whitespace-nowrap tabular-nums">
                  {formatTimestamp(event.createdAt)}
                </span>
                <span className="font-medium text-typography-700 whitespace-nowrap">
                  {BUG_HUNT_EVENT_STAGE_LABELS[event.stage]}
                </span>
                <span>{event.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </TableCell>
    </TableRow>
  );
};

export const RunHistoryTable: FC = () => {
  const { data, isLoading, isError, refetch } = useGetBugHuntRunsQuery(undefined, {
    // Cheap: the table is small and this is the only "is anything running"
    // signal outside of opening a run's own live card.
    pollingInterval: 10_000,
  });
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const runs: BugHuntRun[] = data?.items ?? [];

  // Same "new since last poll" tracking as the bugs table: never flashes on
  // the first successful load, only on a poll that actually grew the list.
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return undefined;
    const currentIds = new Set(runs.map(run => run.id));
    if (seenIdsRef.current === null) {
      seenIdsRef.current = currentIds;
      return undefined;
    }
    const fresh = new Set<string>();
    currentIds.forEach(id => {
      if (!seenIdsRef.current!.has(id)) fresh.add(id);
    });
    seenIdsRef.current = currentIds;
    if (fresh.size === 0) return undefined;
    setFreshIds(fresh);
    const timer = setTimeout(() => setFreshIds(new Set()), 250);
    return () => clearTimeout(timer);
  }, [data]);

  return (
    <div>
      {/* The live run is no longer rendered here: watching Bug Hunter work is
          the top of the page now, next to what it's saying, rather than
          buried above a history table two screens down. */}
      <h2 className="text-sm font-semibold text-typography-900">{en.bugHunter.historyTitle}</h2>
      <p className="text-xs text-typography-600 mb-3">{en.bugHunter.historySubtitle}</p>

      {isLoading ? (
        <p className="text-typography-700">…</p>
      ) : isError ? (
        <div className="flex items-center gap-3">
          <p className="text-destructive-600 text-sm">{en.bugHunter.loadFailed}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary-600 underline"
          >
            {en.bugHunter.retry}
          </button>
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          title={en.bugHunter.emptyTitle}
          subtitle={en.bugHunter.emptySubtitle}
          hideActionButton
        />
      ) : (
        <Table className="w-full text-left border-collapse">
          <TableHead>
            <TableRow className="border-b border-border-light text-sm text-typography-700">
              <TableHeader className="py-3 pr-4 font-medium">{en.bugHunter.columnRepo}</TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.columnTrigger}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.columnStatus}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                <HeaderWithTooltip
                  label={en.bugHunter.columnFound}
                  tooltip={en.bugHunter.columnFoundTooltip}
                />
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                <HeaderWithTooltip
                  label={en.bugHunter.columnAutoMerged}
                  tooltip={en.bugHunter.columnAutoMergedTooltip}
                />
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                <HeaderWithTooltip
                  label={en.bugHunter.columnPrPending}
                  tooltip={en.bugHunter.columnPrPendingTooltip}
                />
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.columnDismissed}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                <HeaderWithTooltip
                  label={en.bugHunter.columnCost}
                  tooltip={en.bugHunter.columnCostTooltip}
                />
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                <HeaderWithTooltip
                  label={en.bugHunter.columnTokens}
                  tooltip={en.bugHunter.columnTokensTooltip}
                />
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.columnStarted}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Keyed on the Fragment, not on the TableRow inside it: the
                fragment is what this map returns, so it is the list child React
                reconciles — a key on its children is invisible to that, which
                is why this warned about missing keys while looking keyed. The
                spelled-out React.Fragment is required because the `<>` shorthand
                takes no props.

                The key is the run id, not the index, because this table polls
                and a run can arrive at the top. Cells are pure functions of
                their run, so index reconciliation still rendered the right
                values — what it cost was identity: every row below the newcomer
                shifted, so an expanded RunDetailRow was destroyed and rebuilt
                one position down, re-subscribing its own request and flashing
                its loading state on each poll. Keyed by id, React moves the
                existing rows instead. */}
            {runs.map(run => (
              <React.Fragment key={run.id}>
                <TableRow
                  className={`border-b border-border-light text-sm text-typography-900 cursor-pointer hover:bg-neutral-50 ${
                    freshIds.has(run.id) ? "animate-fadeIn motion-reduce:animate-none" : ""
                  }`}
                  onClick={() => setExpandedRunId(prev => (prev === run.id ? null : run.id))}
                >
                  <TableCell className="py-3 pr-4">{run.repo}</TableCell>
                  <TableCell className="py-3 pr-4">{TRIGGER_LABELS[run.trigger]}</TableCell>
                  <TableCell className="py-3 pr-4">
                    <BugHuntStatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <FoundCell run={run} />
                  </TableCell>
                  <TableCell className="py-3 pr-4">{run.autoMergedCount}</TableCell>
                  <TableCell className="py-3 pr-4">{run.prOpenedCount}</TableCell>
                  <TableCell className="py-3 pr-4">{run.dismissedCount}</TableCell>
                  <TableCell className="py-3 pr-4">{formatCost(run)}</TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {formatTokens(run.totalInputTokens, run.totalOutputTokens)}
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {formatDateTime(run.createdAt)}
                  </TableCell>
                </TableRow>
                {expandedRunId === run.id && <RunDetailRow runId={run.id} />}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
