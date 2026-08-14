import { FC, useState } from "react";

import {
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import { useGetBugFindingsQuery } from "@api";
import { EmptyState } from "@components";
import { en } from "@constants";
import { BugFinding, BugFindingStatus } from "@types";
import { formatDate } from "@utils";

import { BugFindingDrawer } from "./BugFindingDrawer";
import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";

const STATUS_FILTER_VALUES: (BugFindingStatus | "all")[] = [
  "all",
  ...Object.values(BugFindingStatus),
];

const STATUS_FILTER_LABELS: Record<BugFindingStatus | "all", string> = {
  all: en.bugHunter.findingFilterAll,
  [BugFindingStatus.NEW]: en.bugHunter.findingStatusNew,
  [BugFindingStatus.PENDING_APPROVAL]: en.bugHunter.findingStatusPendingApproval,
  [BugFindingStatus.APPROVED]: en.bugHunter.findingStatusApproved,
  [BugFindingStatus.FIXING]: en.bugHunter.findingStatusFixing,
  [BugFindingStatus.NEEDS_INPUT]: en.bugHunter.findingStatusNeedsInput,
  [BugFindingStatus.PR_OPENED]: en.bugHunter.findingStatusPrOpened,
  [BugFindingStatus.MERGED]: en.bugHunter.findingStatusMerged,
  [BugFindingStatus.DISMISSED]: en.bugHunter.findingStatusDismissed,
  [BugFindingStatus.REJECTED]: en.bugHunter.findingStatusRejected,
  [BugFindingStatus.FAILED]: en.bugHunter.findingStatusFailed,
};

/**
 * The comprehensive bug table: every bug Bug Hunter knows about, from any
 * source — pipeline findings and human reports alike — replacing the earlier
 * design where a hunt run's findings were only ever shown as run-level
 * aggregates, and a human report only lived on the product roadmap.
 */
export const BugFindingsTable: FC = () => {
  const [statusFilter, setStatusFilter] = useState<BugFindingStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetBugFindingsQuery(
    { status: statusFilter, limit: 100 },
    // Cheap and small: a hunt run or an admin action elsewhere should show up
    // here without a manual refresh, similar to the run history table's poll.
    { pollingInterval: 15_000 },
  );

  const findings: BugFinding[] = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-typography-900">
            {en.bugHunter.findingsTitle}
          </h2>
          <p className="text-xs text-typography-600">{en.bugHunter.findingsSubtitle}</p>
        </div>
        <div className="w-56 shrink-0">
          <Select
            id="bug-findings-status-filter"
            labelText={en.bugHunter.findingColumnStatus}
            hideLabel
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as BugFindingStatus | "all")}
          >
            {STATUS_FILTER_VALUES.map(value => (
              <SelectItem key={value} value={value} text={STATUS_FILTER_LABELS[value]} />
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-typography-700">…</p>
      ) : isError ? (
        <div className="flex items-center gap-3">
          <p className="text-destructive-600 text-sm">{en.bugHunter.findingsLoadFailed}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary-600 underline"
          >
            {en.bugHunter.retry}
          </button>
        </div>
      ) : findings.length === 0 ? (
        <EmptyState
          title={en.bugHunter.findingsEmptyTitle}
          subtitle={en.bugHunter.findingsEmptySubtitle}
          hideActionButton
        />
      ) : (
        <Table className="w-full text-left border-collapse">
          <TableHead>
            <TableRow className="border-b border-border-light text-sm text-typography-700">
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.findingColumnTitle}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.findingColumnSource}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.findingColumnRepo}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.findingColumnSeverity}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.findingColumnStatus}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.findingColumnDiscovered}
              </TableHeader>
              <TableHeader className="py-3 pr-4 font-medium">
                {en.bugHunter.findingColumnPr}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {findings.map(finding => (
              <TableRow
                key={finding.id}
                className="border-b border-border-light text-sm text-typography-900 cursor-pointer hover:bg-neutral-50"
                onClick={() => setSelectedId(finding.id)}
              >
                <TableCell className="py-3 pr-4 max-w-[360px] truncate">{finding.title}</TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {BUG_FINDING_SOURCE_LABELS[finding.source]}
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">{finding.repo ?? "—"}</TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {finding.severity
                    ? BUG_FINDING_SEVERITY_LABELS[finding.severity]
                    : en.bugHunter.findingSeverityNone}
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <BugFindingStatusBadge status={finding.status} />
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {formatDate(finding.createdAt)}
                </TableCell>
                <TableCell className="py-3 pr-4 whitespace-nowrap">
                  {finding.prUrl ? (
                    <a
                      href={finding.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 underline"
                      onClick={e => e.stopPropagation()}
                    >
                      {en.bugHunter.viewPr}
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selectedId && <BugFindingDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
};
