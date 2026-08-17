import React, { FC, useState } from "react";

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
import { BugHuntRun, BugHuntRunStatus, BugHuntTrigger } from "@types";
import { formatDate } from "@utils";

import { BUG_HUNT_EVENT_STAGE_LABELS } from "./bugHuntEventLabels";
import { BugHuntStatusBadge } from "./BugHuntStatusBadge";
import { LiveRunCard } from "./LiveRunCard";

const TRIGGER_LABELS: Record<BugHuntTrigger, string> = {
  [BugHuntTrigger.SCHEDULED]: en.bugHunter.triggerScheduled,
  [BugHuntTrigger.MANUAL]: en.bugHunter.triggerManual,
  [BugHuntTrigger.FIX_SESSION]: en.bugHunter.triggerFixSession,
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
      <TableCell colSpan={9} className="py-3 px-4">
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
                  {formatDate(event.createdAt)}
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
  const liveRun = runs.find(run => run.status === BugHuntRunStatus.RUNNING);

  return (
    <div>
      {liveRun && <LiveRunCard run={liveRun} />}

      <h2 className="text-sm font-semibold text-typography-900 mb-3">
        {en.bugHunter.historyTitle}
      </h2>

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
                  className="border-b border-border-light text-sm text-typography-900 cursor-pointer hover:bg-neutral-50"
                  onClick={() => setExpandedRunId(prev => (prev === run.id ? null : run.id))}
                >
                  <TableCell className="py-3 pr-4">{run.repo}</TableCell>
                  <TableCell className="py-3 pr-4">{TRIGGER_LABELS[run.trigger]}</TableCell>
                  <TableCell className="py-3 pr-4">
                    <BugHuntStatusBadge status={run.status} />
                  </TableCell>
                  <TableCell className="py-3 pr-4">{run.foundCount}</TableCell>
                  <TableCell className="py-3 pr-4">{run.autoMergedCount}</TableCell>
                  <TableCell className="py-3 pr-4">{run.prOpenedCount}</TableCell>
                  <TableCell className="py-3 pr-4">{run.dismissedCount}</TableCell>
                  <TableCell className="py-3 pr-4">${run.totalTokenCostUsd}</TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {formatDate(run.createdAt)}
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
