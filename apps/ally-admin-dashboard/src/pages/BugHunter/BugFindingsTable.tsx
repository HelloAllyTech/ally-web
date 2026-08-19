import { FC, useEffect, useRef, useState } from "react";

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
// Reached past the barrel on purpose. Importing the barrel pulls @constants,
// which reads `cellTypes` back off it at module-eval time — a test that needs
// the real boundary while stubbing the barrel deadlocks on that cycle. Same
// direct-path treatment as @components/action-confirmation-popup elsewhere.
import { ErrorBoundary } from "@components/error-boundary";
import { en } from "@constants";
import { BugFinding, BugFindingStatus } from "@types";
import { formatDate } from "@utils";

import { BrailleSpinner } from "./BrailleSpinner";
import { BugFindingDrawer } from "./BugFindingDrawer";
import { BUG_FINDING_SEVERITY_LABELS, BUG_FINDING_SOURCE_LABELS } from "./bugFindingLabels";
import { BugFindingStatusBadge } from "./BugFindingStatusBadge";

/** Statuses where Bug Hunter is actively moving the bug right now — the spinner rides along wherever this shows up. */
const MID_FLIGHT_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.QUEUED,
  BugFindingStatus.FIXING,
  BugFindingStatus.COORDINATING,
  BugFindingStatus.RELEASING,
];

const STATUS_FILTER_VALUES: (BugFindingStatus | "all")[] = [
  "all",
  ...Object.values(BugFindingStatus),
];

const STATUS_FILTER_LABELS: Record<BugFindingStatus | "all", string> = {
  all: en.bugHunter.findingFilterAll,
  [BugFindingStatus.NEW]: en.bugHunter.findingStatusNew,
  [BugFindingStatus.PENDING_APPROVAL]: en.bugHunter.findingStatusPendingApproval,
  [BugFindingStatus.APPROVED]: en.bugHunter.findingStatusApproved,
  [BugFindingStatus.QUEUED]: en.bugHunter.findingStatusQueued,
  [BugFindingStatus.BLOCKED]: en.bugHunter.findingStatusBlocked,
  [BugFindingStatus.COORDINATING]: en.bugHunter.findingStatusCoordinating,
  [BugFindingStatus.FIXING]: en.bugHunter.findingStatusFixing,
  [BugFindingStatus.NEEDS_INPUT]: en.bugHunter.findingStatusNeedsInput,
  [BugFindingStatus.PR_OPENED]: en.bugHunter.findingStatusPrOpened,
  [BugFindingStatus.MERGED]: en.bugHunter.findingStatusMerged,
  [BugFindingStatus.RELEASING]: en.bugHunter.findingStatusReleasing,
  [BugFindingStatus.RELEASED]: en.bugHunter.findingStatusReleased,
  [BugFindingStatus.RELEASE_FAILED]: en.bugHunter.findingStatusReleaseFailed,
  [BugFindingStatus.DISMISSED]: en.bugHunter.findingStatusDismissed,
  [BugFindingStatus.REJECTED]: en.bugHunter.findingStatusRejected,
  [BugFindingStatus.FAILED]: en.bugHunter.findingStatusFailed,
  [BugFindingStatus.CANCELLED]: en.bugHunter.findingStatusCancelled,
};

/**
 * The comprehensive bug table: every bug Bug Hunter knows about, from any
 * source — pipeline findings and human reports alike — replacing the earlier
 * design where a hunt run's findings were only ever shown as run-level
 * aggregates, and a human report only lived on the product roadmap.
 */
interface BugFindingsTableProps {
  /**
   * A bug to open the drawer on, chosen somewhere else on the page — clicking
   * a notification in the inbox. The drawer lives here rather than being
   * duplicated up there, so both entry points land on the same one.
   */
  focusFindingId?: string | null;
  onFocusHandled?: () => void;
}

export const BugFindingsTable: FC<BugFindingsTableProps> = ({ focusFindingId, onFocusHandled }) => {
  const [statusFilter, setStatusFilter] = useState<BugFindingStatus | "all">("all");
  const [ownSelectedId, setOwnSelectedId] = useState<string | null>(null);
  const selectedId = focusFindingId ?? ownSelectedId;
  const setSelectedId = (id: string | null) => {
    setOwnSelectedId(id);
    if (!id) onFocusHandled?.();
  };

  const { data, isLoading, isError, refetch } = useGetBugFindingsQuery(
    { status: statusFilter, limit: 100 },
    // Cheap and small: a hunt run or an admin action elsewhere should show up
    // here without a manual refresh, similar to the run history table's poll.
    { pollingInterval: 15_000 },
  );

  const findings: BugFinding[] = data?.items ?? [];

  // Which rows just showed up, so they can get a one-time fade-in — never on
  // the first successful load, only on a poll that grew the list. `null`
  // means "haven't seen a real response yet"; once set, it's the id set from
  // the previous render to diff the new one against.
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return undefined;
    const currentIds = new Set(findings.map(finding => finding.id));
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
                className={`border-b border-border-light text-sm text-typography-900 cursor-pointer hover:bg-neutral-50 ${
                  freshIds.has(finding.id) ? "animate-fadeIn motion-reduce:animate-none" : ""
                }`}
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
                  <span className="inline-flex items-center gap-1.5">
                    <BugFindingStatusBadge status={finding.status} />
                    {MID_FLIGHT_STATUSES.includes(finding.status) && (
                      <BrailleSpinner className="text-amber-600" />
                    )}
                  </span>
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

      {/* Scoped barrier, keyed to the open bug. The page-level one in
          PrivateLayout would already stop a bad drawer blanking the console,
          but it would take the bugs table down with it — and the table is how
          you'd reach a different bug. This keeps the failure inside the drawer,
          and a different row starts clean rather than inheriting the error. */}
      {selectedId && (
        <ErrorBoundary variant="panel" resetKey={selectedId} onDismiss={() => setSelectedId(null)}>
          <BugFindingDrawer id={selectedId} onClose={() => setSelectedId(null)} />
        </ErrorBoundary>
      )}
    </div>
  );
};
