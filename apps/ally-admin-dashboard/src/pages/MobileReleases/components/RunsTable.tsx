import { FC } from "react";

import { Link as LinkIcon } from "@icons";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@ally-ui-mono/ui-shared";
import { EmptyState } from "@components";
import { MobileReleaseRun } from "@types";
import { formatDateTime, openLinkInNewTab } from "@utils";

import { runDisplayDuration, shortSha } from "../mobileReleaseFormat";
import { getMobileReleaseRunStatusDisplay } from "../mobileReleaseStatus";

interface RunsTableProps {
  runs: MobileReleaseRun[];
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  emptyTitle: string;
  emptySubtitle: string;
}

/**
 * The GitHub Actions run table shape shared by every runs-based tab (Android
 * Releases, the iOS build runs inside iOS / TestFlight, App Store
 * Submissions' dispatch runs, and the unfiltered Release History) — each tab
 * just passes a different pre-filtered `runs` array so this never drifts
 * into rendering the same table five slightly different ways.
 */
export const RunsTable: FC<RunsTableProps> = ({
  runs,
  isLoading,
  isError,
  isFetching,
  emptyTitle,
  emptySubtitle,
}) => {
  if (isLoading) return <p className="text-typography-700">Loading…</p>;
  if (isError && runs.length === 0) {
    return <p className="text-destructive-500">Failed to load run history.</p>;
  }
  if (runs.length === 0) {
    return <EmptyState title={emptyTitle} subtitle={emptySubtitle} hideActionButton />;
  }

  return (
    <>
      <Table className="w-full text-left border-collapse">
        <TableHead>
          <TableRow className="border-b border-border-light text-sm text-typography-700">
            <TableHeader className="py-3 pr-4 font-medium">Workflow</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Status</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Triggered by</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Commit</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Started</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium">Duration</TableHeader>
            <TableHeader className="py-3 pr-4 font-medium" />
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map(run => {
            const statusDisplay = getMobileReleaseRunStatusDisplay(run.status, run.conclusion);
            const isActive = run.status === "queued" || run.status === "in_progress";
            return (
              <TableRow
                key={run.id}
                className={`border-b border-border-light text-sm text-typography-900 align-top ${
                  isActive ? "bg-primary-50" : ""
                }`}
              >
                <TableCell className="py-3 pr-4 whitespace-nowrap">{run.workflowName}</TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  <Tag type={statusDisplay.type} size="sm">
                    {statusDisplay.label}
                  </Tag>
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">{run.actor}</TableCell>
                <TableCell className="py-3 pr-4 max-w-[320px]">
                  <span
                    title={run.headCommitMessage ?? undefined}
                    className="font-mono text-xs truncate block"
                  >
                    {shortSha(run.headSha)} — {run.headCommitMessage}
                  </span>
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {run.runStartedAt ? formatDateTime(run.runStartedAt) : "Queued"}
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {runDisplayDuration(run)}
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openLinkInNewTab(run.htmlUrl)}
                    title="View on GitHub"
                    aria-label="View run on GitHub"
                    className="text-typography-600 hover:text-typography-900"
                  >
                    <LinkIcon size={16} />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {isFetching !== undefined && (
        <div className="flex items-center justify-end pt-2">
          <span className="text-sm text-typography-700">{isFetching ? "Updating…" : ""}</span>
        </div>
      )}
      {isError && runs.length > 0 && (
        <p className="text-sm text-destructive-500 mt-2">
          Couldn't refresh just now — showing the last known runs.
        </p>
      )}
    </>
  );
};
