import React, { useEffect, useMemo, useState } from "react";

import { useSelector } from "react-redux";
import { toast } from "sonner";

import {
  useCancelRoleplayTestRunMutation,
  useGetAgentTestCasesQuery,
  useGetRoleplayTestReportsQuery,
  useStartRoleplayTestRunMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { selectRoleplaySpecState } from "@reducer";
import {
  RoleplayReportImproveStatus,
  RoleplayTestReportListItem,
  RoleplayTestReportStatus,
  RoleplayTestRunStatus,
} from "@src/types/roleplayStudio";

import { TestReportCard } from "./TestReportCard";

const POLL_INTERVAL_MS = 4000;

const isRunActive = (report: RoleplayTestReportListItem): boolean =>
  report.runStatus === RoleplayTestRunStatus.STARTED ||
  report.runStatus === RoleplayTestRunStatus.IN_PROGRESS;

const isImproveActive = (report: RoleplayTestReportListItem): boolean =>
  report.improveStatus === RoleplayReportImproveStatus.IMPROVING ||
  report.improveStatus === RoleplayReportImproveStatus.RERUNNING;

/** Anything that should keep the drawer polling / the Run button locked. */
const isReportActive = (report: RoleplayTestReportListItem): boolean =>
  report.status === RoleplayTestReportStatus.PENDING ||
  isRunActive(report) ||
  isImproveActive(report);

interface ImproveDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Flushes any dirty draft state before the run starts (same as publish). */
  onSaveDraft: () => Promise<boolean>;
  /** Queues the auto-improve prompt into the copilot chat (workspace owns it). */
  onAutoImprove: (report: RoleplayTestReportListItem) => void;
}

/**
 * The Improve drawer: pick agent test cases, run them against the current
 * draft (each spins a background text-to-text session judged in ai-learn),
 * and watch the per-case reports fill in live. Everything derives from server
 * state — the reports list polls while any run/report is non-terminal, so a
 * refresh mid-run recovers cleanly.
 */
export const ImproveDrawer: React.FC<ImproveDrawerProps> = ({
  open,
  onClose,
  onSaveDraft,
  onAutoImprove,
}) => {
  const strings = en.roleplayStudio.improve;
  const { specId, isStreaming } = useSelector(selectRoleplaySpecState);

  const {
    data: casesResponse,
    isLoading: casesLoading,
    isError: casesError,
  } = useGetAgentTestCasesQuery(undefined, {
    skip: !open,
  });

  const [pollingInterval, setPollingInterval] = useState(0);
  const { data: reportsResponse, isLoading: reportsLoading } = useGetRoleplayTestReportsQuery(
    { specId: specId ?? "" },
    { skip: !open || !specId, pollingInterval },
  );

  const [startTestRun, { isLoading: isStartingRun }] = useStartRoleplayTestRunMutation();
  const [cancelRun, { isLoading: isCancelling }] = useCancelRoleplayTestRunMutation();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [caseFilter, setCaseFilter] = useState("");
  const [casesOpen, setCasesOpen] = useState(true);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const testCases = casesResponse?.data ?? [];
  const reports = useMemo(() => reportsResponse?.data ?? [], [reportsResponse]);

  const filteredCases = useMemo(() => {
    const query = caseFilter.trim().toLowerCase();
    if (!query) return testCases;
    return testCases.filter(
      testCase =>
        testCase.title.toLowerCase().includes(query) ||
        testCase.tags.some(tag => tag.toLowerCase().includes(query)),
    );
  }, [testCases, caseFilter]);

  const anyRunInFlight = useMemo(() => reports.some(isRunActive), [reports]);
  const anyReportActive = useMemo(() => reports.some(isReportActive), [reports]);

  // Poll (4s) only while something is non-terminal; stop once everything lands.
  useEffect(() => {
    setPollingInterval(open && anyReportActive ? POLL_INTERVAL_MS : 0);
  }, [open, anyReportActive]);

  if (!open) return null;

  const toggleCase = (id: string) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runDisabled = selectedIds.size === 0 || anyRunInFlight || isStartingRun || !specId;
  const runHint = anyRunInFlight
    ? strings.runInProgressHint
    : selectedIds.size === 0
      ? strings.selectCasesHint
      : "";

  const handleRun = async () => {
    if (!specId || runDisabled) return;
    // Flush the dirty draft first — autosave is on a 10s cadence and the run
    // snapshots the server-side draft (same save-then-act sequence as publish).
    await onSaveDraft();
    try {
      await startTestRun({ specId, agentTestCaseIds: [...selectedIds] }).unwrap();
      setSelectedIds(new Set());
      toast.success(strings.runStarted);
    } catch (error) {
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error(message || strings.runStartFailed);
    }
  };

  const handleCancelRun = async (runId: string) => {
    try {
      await cancelRun(runId).unwrap();
      toast.success(strings.runCancelled);
    } catch {
      toast.error(strings.cancelFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="improve-drawer">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <span className="text-base font-tertiary font-[500]">{strings.drawerTitle}</span>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-5 pb-8">
          <p className="text-sm text-typography-600">{strings.drawerSubtitle}</p>

          {/* Test cases (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setCasesOpen(previous => !previous)}
              className="flex w-full items-center justify-between text-left"
            >
              <h4 className="text-xs uppercase tracking-wide text-typography-500">
                {strings.testCasesHeading}
              </h4>
              <span className="text-xs text-typography-500">{casesOpen ? "▾" : "▸"}</span>
            </button>
            {casesOpen && (
              <div className="mt-2 flex flex-col gap-3">
                <input
                  value={caseFilter}
                  onChange={event => setCaseFilter(event.target.value)}
                  placeholder={strings.searchPlaceholder}
                  className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-sm"
                />
                {casesLoading ? (
                  <p className="text-sm text-typography-500">{en.common.loading}</p>
                ) : casesError ? (
                  <p className="text-sm text-destructive-500">{strings.loadTestCasesFailed}</p>
                ) : testCases.length === 0 ? (
                  <p className="text-sm text-typography-500">{strings.noTestCases}</p>
                ) : filteredCases.length === 0 ? (
                  <p className="text-sm text-typography-500">{strings.noMatchingTestCases}</p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-72 overflow-y-auto custom-scrollbar">
                    {filteredCases.map(testCase => (
                      <label
                        key={testCase.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(testCase.id)}
                          onChange={() => toggleCase(testCase.id)}
                          className="h-4 w-4 accent-primary-500"
                        />
                        <span className="text-sm text-typography-900">{testCase.title}</span>
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-typography-700">
                          {testCase.type === "full_session"
                            ? strings.typeFullSession
                            : strings.typeCondition}
                        </span>
                        {testCase.tags.length > 0 && (
                          <span className="text-xs text-typography-500">
                            ({testCase.tags.join(", ")})
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <div>
                  {/* Title lives on the wrapper — a disabled button swallows hover events. */}
                  <span title={runHint || undefined}>
                    <Button
                      variant={ButtonVariant.PRIMARY}
                      onClick={() => void handleRun()}
                      disabled={runDisabled}
                    >
                      {isStartingRun ? strings.startingRun : strings.runTestCases(selectedIds.size)}
                    </Button>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Reports (newest first, live) */}
          <div>
            <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-2">
              {strings.reportsHeading}
            </h4>
            {reportsLoading && reports.length === 0 ? (
              <p className="text-sm text-typography-500">{en.common.loading}</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-typography-500">{strings.reportsEmpty}</p>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <TestReportCard
                    key={report.id}
                    report={report}
                    expanded={expandedReportId === report.id}
                    onToggleExpand={() =>
                      setExpandedReportId(previous => (previous === report.id ? null : report.id))
                    }
                    onCancelRun={runId => void handleCancelRun(runId)}
                    isCancelling={isCancelling}
                    onAutoImprove={onAutoImprove}
                    improveLocked={anyRunInFlight || isStreaming}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
