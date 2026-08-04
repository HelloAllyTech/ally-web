import React, { useCallback, useEffect, useMemo, useState } from "react";

import { BarChart3, Copy, Delete, Upload, Users, WandStars } from "@icons";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import { useGetLabRunsQuery, useDeleteLabRunMutation } from "@api";
import { ActionConfirmationPopup, Button, EmptyState, ListToolbar } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabRun } from "@types";

import { AssignRunDrawer } from "./AssignRunDrawer";
import { AutoEvalDrawer } from "./AutoEvalDrawer";
import { BulkAssignEvaluatorsDrawer } from "./BulkAssignEvaluatorsDrawer";
import { BulkPublishDrawer } from "./BulkPublishDrawer";
import { ComparisonDrawer } from "./ComparisonDrawer";
import { CreateRunDrawer } from "./CreateRunDrawer";
import { PublishRunDrawer } from "./PublishRunDrawer";
import { RunDetailDrawer } from "./RunDetailDrawer";
import { RunResultsDrawer } from "./RunResultsDrawer";
import { RunStatusBadge } from "./RunStatusBadge";

/** Bulk-selection eligibility: a run can only be bulk-selected alongside others of the same kind. */
type BulkKind = "unpublished" | "published";
const rowBulkKind = (run: LabRun): BulkKind | null => {
  if (run.status === "COMPLETED" && !run.publishedAt) return "unpublished";
  if (run.publishedAt) return "published";
  return null;
};

const VariableSummary: React.FC<{ run: LabRun }> = ({ run }) => {
  if (!run.variableValues.length) return <span className="text-typography-400">—</span>;
  const shown = run.variableValues.slice(0, 3);
  const extra = run.variableValues.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map(v => (
        <span
          key={v.name}
          className="font-mono text-xs bg-background-secondary border border-border-light rounded px-1.5 py-0.5"
        >{`{{${v.name}}}`}</span>
      ))}
      {extra > 0 && <span className="text-xs text-typography-500">+{extra}</span>}
    </span>
  );
};

// Poll while any run is still queued/executing so async runs update live.
const RUN_POLL_INTERVAL_MS = 3000;
const RUNS_PAGE_SIZE = 25;

export const RunsTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [pollInterval, setPollInterval] = useState(0);
  const { data, isLoading, refetch } = useGetLabRunsQuery(
    { search: search || undefined, limit: RUNS_PAGE_SIZE, offset },
    { pollingInterval: pollInterval },
  );
  const runs = data?.items ?? [];
  const total = data?.count ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + RUNS_PAGE_SIZE < total;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + RUNS_PAGE_SIZE, total);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Reset to the first page whenever the search term changes.
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setOffset(0);
    clearSelection();
  }, [clearSelection]);

  // Enable polling only while runs are in-flight; stop once all are terminal.
  useEffect(() => {
    const inFlight = runs.some(r => r.status === "PENDING" || r.status === "RUNNING");
    setPollInterval(inFlight ? RUN_POLL_INTERVAL_MS : 0);
  }, [runs]);

  const [deleteRun] = useDeleteLabRunMutation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [detailRun, setDetailRun] = useState<LabRun | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabRun | null>(null);
  const [publishRun, setPublishRun] = useState<LabRun | null>(null);
  const [assignRun, setAssignRun] = useState<LabRun | null>(null);
  const [resultsRun, setResultsRun] = useState<LabRun | null>(null);
  const [autoEvalRun, setAutoEvalRun] = useState<LabRun | null>(null);
  const [compareRun, setCompareRun] = useState<LabRun | null>(null);
  const [bulkPublishOpen, setBulkPublishOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  // Count runs per batch so the compare action shows only for multi-run batches.
  const batchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of runs) {
      if (r.batchId) counts.set(r.batchId, (counts.get(r.batchId) ?? 0) + 1);
    }
    return counts;
  }, [runs]);

  // Bulk selection: only rows of one "kind" (unpublished-completed vs
  // published) can be selected together, derived from whichever kind is
  // currently selected (so mixed selections are impossible by construction).
  const selectedKind = useMemo<BulkKind | null>(() => {
    if (selectedIds.size === 0) return null;
    const firstSelected = runs.find(r => selectedIds.has(r.id));
    return firstSelected ? rowBulkKind(firstSelected) : null;
  }, [selectedIds, runs]);
  const selectedRuns = useMemo(() => runs.filter(r => selectedIds.has(r.id)), [runs, selectedIds]);

  const toggleSelectRow = useCallback((run: LabRun) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(run.id)) next.delete(run.id);
      else next.add(run.id);
      return next;
    });
  }, []);

  // "Select all" targets whichever kind is already selected, or unpublished
  // (the more common bulk case) when nothing is selected yet.
  const headerBulkKind = selectedKind ?? "unpublished";
  const headerEligibleRuns = useMemo(
    () => runs.filter(r => rowBulkKind(r) === headerBulkKind),
    [runs, headerBulkKind],
  );
  const allHeaderSelected =
    headerEligibleRuns.length > 0 && headerEligibleRuns.every(r => selectedIds.has(r.id));
  const someHeaderSelected = headerEligibleRuns.some(r => selectedIds.has(r.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allHeaderSelected) {
        headerEligibleRuns.forEach(r => next.delete(r.id));
      } else {
        headerEligibleRuns.forEach(r => next.add(r.id));
      }
      return next;
    });
  }, [allHeaderSelected, headerEligibleRuns]);

  const closeBulkPublish = useCallback(() => {
    setBulkPublishOpen(false);
    clearSelection();
  }, [clearSelection]);
  const closeBulkAssign = useCallback(() => {
    setBulkAssignOpen(false);
    clearSelection();
  }, [clearSelection]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const response = await deleteRun(deleteTarget.id);
    if ("error" in response && response.error) {
      toast.error(en.aiLab.runs.deleteFailed);
    } else {
      toast.success(en.aiLab.runs.deleted);
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteRun]);

  return (
    <div className="mt-4">
      <p className="text-typography-600 text-sm mb-4 max-w-3xl">{en.aiLab.runs.subtitle}</p>
      <ListToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        placeholder={en.aiLab.runs.searchPlaceholder}
        action={{
          label: en.aiLab.runs.create,
          onClick: () => setIsDrawerOpen(true),
          variant: ButtonVariant.PRIMARY,
        }}
      />

      <div className="mt-5">
        {isLoading ? (
          <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
        ) : runs.length === 0 ? (
          <EmptyState
            title={en.aiLab.runs.empty}
            subtitle={en.aiLab.runs.emptySubtitle}
            actionLabel={en.aiLab.runs.create}
            onAction={() => setIsDrawerOpen(true)}
          />
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-md px-4 py-2 mb-3">
                <span className="text-sm font-medium text-primary-800">
                  {en.aiLab.runs.selectedCount(selectedIds.size)}
                </span>
                <div className="flex items-center gap-4">
                  {selectedKind === "unpublished" && (
                    <Button variant={ButtonVariant.PRIMARY} onClick={() => setBulkPublishOpen(true)}>
                      {en.aiLab.runs.bulkPublishAction}
                    </Button>
                  )}
                  {selectedKind === "published" && (
                    <Button variant={ButtonVariant.PRIMARY} onClick={() => setBulkAssignOpen(true)}>
                      {en.aiLab.runs.bulkAssignAction}
                    </Button>
                  )}
                  <button
                    onClick={clearSelection}
                    className="text-sm text-typography-600 hover:text-typography-900 underline"
                  >
                    {en.aiLab.runs.clearSelection}
                  </button>
                </div>
              </div>
            )}
            <div className="border border-border-light rounded-md overflow-hidden">
              <Table className="w-full text-left font-primary text-base">
                <TableHead>
                  <TableRow className="bg-background-secondary text-typography-700 text-sm">
                    <TableHeader className="px-4 py-3 w-[36px]">
                      {headerEligibleRuns.length > 0 && (
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={allHeaderSelected}
                          ref={el => {
                            if (el) el.indeterminate = !allHeaderSelected && someHeaderSelected;
                          }}
                          onChange={toggleSelectAll}
                          aria-label={en.common.select}
                        />
                      )}
                    </TableHeader>
                    <TableHeader className="px-4 py-3 font-medium w-[20%]">
                      {en.aiLab.runs.columnSkill}
                    </TableHeader>
                    <TableHeader className="px-4 py-3 font-medium w-[16%]">
                      {en.aiLab.runs.columnVariables}
                    </TableHeader>
                    <TableHeader className="px-4 py-3 font-medium w-[12%]">
                      {en.aiLab.runs.columnStatus}
                    </TableHeader>
                    <TableHeader className="px-4 py-3 font-medium">
                      {en.aiLab.runs.columnOutput}
                    </TableHeader>
                    <TableHeader className="px-4 py-3 font-medium w-[130px]">
                      {en.aiLab.runs.columnCreated}
                    </TableHeader>
                    <TableHeader className="px-4 py-3 font-medium text-right w-[70px]">
                      Actions
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {runs.map(run => {
                    const kind = rowBulkKind(run);
                    const checkboxDisabled = !kind || (selectedKind !== null && selectedKind !== kind);
                    return (
                    <TableRow
                      key={run.id}
                      onClick={() => setDetailRun(run)}
                      className="border-t border-border-light hover:bg-background-secondary/50 transition-colors cursor-pointer"
                    >
                      <TableCell
                        className="px-4 py-3 align-top"
                        onClick={e => e.stopPropagation()}
                      >
                        {kind && (
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={selectedIds.has(run.id)}
                            disabled={checkboxDisabled}
                            onChange={() => toggleSelectRow(run)}
                            aria-label={en.common.select}
                          />
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top font-medium text-typography-900">
                        {run.skillName}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <VariableSummary run={run} />
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <RunStatusBadge status={run.status} />
                          {run.publishedAt && (
                            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-primary-50 text-primary-700 border-primary-200">
                              {en.aiLab.publish.publishedBadge}
                            </span>
                          )}
                          {run.publishedAt && run.evalStats && run.evalStats.assigned > 0 && (
                            <span className="text-xs text-typography-500">
                              {en.aiLab.assign.responses(
                                run.evalStats.submitted,
                                run.evalStats.assigned,
                              )}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top text-typography-700">
                        <span className="line-clamp-2">
                          {run.status === "FAILED" ? run.error : run.output}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top text-typography-500 text-sm">
                        {new Date(run.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-3 text-typography-600">
                          {!!run.batchId && (batchCounts.get(run.batchId) ?? 0) > 1 && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setCompareRun(run);
                              }}
                              className="hover:text-primary-600"
                              aria-label={en.aiLab.compare.action}
                              title={en.aiLab.compare.action}
                            >
                              <Copy size={18} />
                            </button>
                          )}
                          {run.status === "COMPLETED" && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setAutoEvalRun(run);
                              }}
                              className="hover:text-primary-600"
                              aria-label={en.aiLab.autoEval.action}
                              title={en.aiLab.autoEval.action}
                            >
                              <WandStars width={18} height={18} />
                            </button>
                          )}
                          {run.status === "COMPLETED" && !run.publishedAt && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setPublishRun(run);
                              }}
                              className="hover:text-primary-600"
                              aria-label={en.aiLab.publish.action}
                              title={en.aiLab.publish.action}
                            >
                              <Upload size={18} />
                            </button>
                          )}
                          {run.publishedAt && (
                            <>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setAssignRun(run);
                                }}
                                className="hover:text-primary-600"
                                aria-label={en.aiLab.assign.action}
                                title={en.aiLab.assign.action}
                              >
                                <Users size={18} />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setResultsRun(run);
                                }}
                                className="hover:text-primary-600"
                                aria-label={en.aiLab.results.action}
                                title={en.aiLab.results.action}
                              >
                                <BarChart3 size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteTarget(run);
                            }}
                            className="hover:text-destructive-600"
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Delete size={18} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {(canPrev || canNext) && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-typography-500">
                  {en.aiLab.runs.paginationRange
                    .replace("{start}", String(rangeStart))
                    .replace("{end}", String(rangeEnd))
                    .replace("{total}", String(total))}
                </span>
                <div className="flex gap-3">
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    disabled={!canPrev}
                    onClick={() => {
                      setOffset(o => Math.max(0, o - RUNS_PAGE_SIZE));
                      clearSelection();
                    }}
                  >
                    {en.aiLab.runs.prev}
                  </Button>
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    disabled={!canNext}
                    onClick={() => {
                      setOffset(o => (canNext ? o + RUNS_PAGE_SIZE : o));
                      clearSelection();
                    }}
                  >
                    {en.aiLab.runs.next}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateRunDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onComplete={refetch}
      />

      <RunDetailDrawer run={detailRun} onClose={() => setDetailRun(null)} />

      <PublishRunDrawer run={publishRun} onClose={() => setPublishRun(null)} />

      <AssignRunDrawer run={assignRun} onClose={() => setAssignRun(null)} />

      <BulkPublishDrawer runs={bulkPublishOpen ? selectedRuns : []} onClose={closeBulkPublish} />

      <BulkAssignEvaluatorsDrawer
        runs={bulkAssignOpen ? selectedRuns : []}
        onClose={closeBulkAssign}
      />

      <RunResultsDrawer run={resultsRun} onClose={() => setResultsRun(null)} />

      <AutoEvalDrawer run={autoEvalRun} onClose={() => setAutoEvalRun(null)} />

      <ComparisonDrawer run={compareRun} allRuns={runs} onClose={() => setCompareRun(null)} />

      <ActionConfirmationPopup
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={en.aiLab.runs.deleteTitle}
        description={en.aiLab.runs.deleteDescription}
        primaryButton={{
          label: en.common.delete,
          onClick: handleDelete,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setDeleteTarget(null) }}
      />
    </div>
  );
};
