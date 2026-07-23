import React from "react";

import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import {
  RoleplayReportImproveStatus,
  RoleplayTestReportListItem,
  RoleplayTestReportStatus,
  RoleplayTestRunStatus,
} from "@src/types/roleplayStudio";
import { formatDate } from "@utils";

import { TestReportDetail } from "./TestReportDetail";

const Spinner: React.FC = () => (
  <div
    data-testid="report-spinner"
    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-dashed border-primary-300 border-t-transparent"
  />
);

const VERDICT_STYLES: Record<string, { chip: string; dot: string }> = {
  PASSED: { chip: "bg-success-100", dot: "bg-success-400" },
  FAILED: { chip: "bg-red-100", dot: "bg-red-500" },
  INCONCLUSIVE: { chip: "bg-yellow-100", dot: "bg-yellow-500" },
};

/** Condition-case verdict pill, styled like the session-log pass chip. */
export const VerdictPill: React.FC<{ verdict?: string | null }> = ({ verdict }) => {
  const strings = en.roleplayStudio.improve;
  if (!verdict) return null;
  const style = VERDICT_STYLES[verdict] ?? { chip: "bg-neutral-100", dot: "bg-neutral-400" };
  const label =
    verdict === "PASSED"
      ? strings.verdictPassed
      : verdict === "FAILED"
        ? strings.verdictFailed
        : verdict === "INCONCLUSIVE"
          ? strings.verdictInconclusive
          : verdict;
  return (
    <span
      data-testid="verdict-pill"
      className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-xs text-typography-900 ${style.chip}`}
    >
      <span className={`w-2 h-2 rounded-full mr-1 ${style.dot}`} />
      {label}
    </span>
  );
};

interface TestReportCardProps {
  report: RoleplayTestReportListItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onCancelRun: (runId: string) => void;
  isCancelling: boolean;
  onAutoImprove: (report: RoleplayTestReportListItem) => void;
  /** Drawer-wide auto-improve lock (any run in flight, or the copilot is streaming). */
  improveLocked: boolean;
}

/**
 * One test-report row in the Improve drawer: title / type / version header,
 * live run state (spinner + progress + cancel), the outcome (verdict pill or
 * overall score), auto-improve lifecycle chips, and the lazily fetched detail
 * when expanded.
 */
export const TestReportCard: React.FC<TestReportCardProps> = ({
  report,
  expanded,
  onToggleExpand,
  onCancelRun,
  isCancelling,
  onAutoImprove,
  improveLocked,
}) => {
  const strings = en.roleplayStudio.improve;
  const snapshot = report.testCaseSnapshot;
  const runActive =
    report.runStatus === RoleplayTestRunStatus.STARTED ||
    report.runStatus === RoleplayTestRunStatus.IN_PROGRESS;
  const improveActive =
    report.improveStatus === RoleplayReportImproveStatus.IMPROVING ||
    report.improveStatus === RoleplayReportImproveStatus.RERUNNING;
  const autoImproveEnabled =
    report.status === RoleplayTestReportStatus.COMPLETED && !improveLocked && !improveActive;

  const renderOutcome = () => {
    if (report.status === RoleplayTestReportStatus.COMPLETED) {
      if (snapshot?.type === "full_session") {
        return (
          <span className="text-sm font-medium text-typography-900">
            {report.overallScore != null ? Math.round(report.overallScore) : "—"}
            <span className="text-typography-500">/100</span>
          </span>
        );
      }
      return <VerdictPill verdict={report.verdict} />;
    }
    if (report.status === RoleplayTestReportStatus.PENDING) {
      if (!runActive) {
        return <span className="text-xs text-typography-500">{strings.pending}</span>;
      }
      const { completed, total } = report.runProgress ?? {};
      return (
        <span className="flex items-center gap-2">
          <Spinner />
          {completed != null && total != null && (
            <span className="text-xs text-typography-500">
              {strings.progressLabel(completed, total)}
            </span>
          )}
          <Button
            variant={ButtonVariant.TEXT}
            onClick={() => onCancelRun(report.runId)}
            disabled={isCancelling}
            className="h-[28px] px-2 text-xs"
          >
            {strings.cancelRun}
          </Button>
        </span>
      );
    }
    return (
      <span className="text-xs text-typography-500">
        {report.status === RoleplayTestReportStatus.FAILED
          ? strings.statusFailed
          : strings.statusCancelled}
      </span>
    );
  };

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onToggleExpand} className="flex-1 min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-typography-900">
              {snapshot?.title || report.agentTestCaseId}
            </span>
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-typography-700">
              {snapshot?.type === "full_session" ? strings.typeFullSession : strings.typeCondition}
            </span>
            {report.versionNumber != null && (
              <span className="text-xs text-typography-500">
                {strings.versionLabel(report.versionNumber)}
              </span>
            )}
            {report.improveOfReportId && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-900">
                {strings.improvedFrom}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-typography-500">
            <span>{formatDate(report.createdAt)}</span>
            {(snapshot?.tags ?? []).length > 0 && <span>({snapshot?.tags?.join(", ")})</span>}
          </div>
        </button>
        <div className="flex items-center gap-3 shrink-0">
          {renderOutcome()}
          <span title={autoImproveEnabled ? strings.autoImproveHint : ""}>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={() => onAutoImprove(report)}
              disabled={!autoImproveEnabled}
              className="h-[32px] px-3 text-xs"
            >
              {strings.autoImprove}
            </Button>
          </span>
        </div>
      </div>

      {/* Auto-improve lifecycle (on the parent report) */}
      {report.improveStatus && report.improveStatus !== RoleplayReportImproveStatus.DONE && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {report.improveStatus === RoleplayReportImproveStatus.IMPROVING && (
            <span className="flex items-center gap-2 text-typography-700">
              <Spinner />
              {strings.improving}
            </span>
          )}
          {report.improveStatus === RoleplayReportImproveStatus.RERUNNING && (
            <span className="flex items-center gap-2 text-typography-700">
              <Spinner />
              {strings.rerunning}
            </span>
          )}
          {report.improveStatus === RoleplayReportImproveStatus.NO_CHANGES && (
            <span className="text-typography-500">{strings.noChanges}</span>
          )}
          {report.improveStatus === RoleplayReportImproveStatus.FAILED && (
            <span className="text-destructive-500">
              {strings.improveFailed}
              {report.improveMeta?.error ? `: ${report.improveMeta.error}` : ""}
            </span>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-3 border-t border-border-light pt-3">
          <TestReportDetail
            reportId={report.id}
            status={report.status}
            improveStatus={report.improveStatus}
          />
        </div>
      )}
    </div>
  );
};
