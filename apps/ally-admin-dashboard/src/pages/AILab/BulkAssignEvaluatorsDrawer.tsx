import React, { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetLabEvaluatorsQuery,
  useLazyGetRunAssignmentsQuery,
  useAssignLabRunMutation,
  useUnassignLabRunMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabRun } from "@types";

interface BulkAssignEvaluatorsDrawerProps {
  /** Selected published runs. Empty = closed. */
  runs: LabRun[];
  onClose: () => void;
}

interface AssignmentInfo {
  assignmentId: string;
  submitted: boolean;
}

const RUN_PREVIEW_LIMIT = 6;

/**
 * Add or remove human evaluators across several published runs in one action.
 * Each evaluator row reflects its aggregate assignment across the selection
 * (assigned to all / some / none). Clicking an untouched row commits to the
 * "full" state implied by a native tri-state checkbox: none/some -> assign to
 * every selected run (filling any gap), all -> remove from every selected
 * run. Only rows the admin actually touches are applied; nothing left alone
 * is changed. Removal skips assignments already submitted (immutable).
 */
export const BulkAssignEvaluatorsDrawer: React.FC<BulkAssignEvaluatorsDrawerProps> = ({
  runs,
  onClose,
}) => {
  const runIdsKey = runs.map(r => r.id).join(",");
  const { data: evaluatorsData } = useGetLabEvaluatorsQuery(
    { limit: 500 },
    { skip: runs.length === 0 },
  );
  const evaluators = evaluatorsData?.items ?? [];

  const [fetchAssignments] = useLazyGetRunAssignmentsQuery();
  const [assignRun] = useAssignLabRunMutation();
  const [unassignRun] = useUnassignLabRunMutation();

  const [assignmentsByRun, setAssignmentsByRun] = useState<
    Map<string, Map<string, AssignmentInfo>>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [desired, setDesired] = useState<Map<string, boolean>>(new Map());
  const [isApplying, setIsApplying] = useState(false);

  // (Re)load current assignments whenever the actual set of selected runs
  // changes (not on every parent re-render — `runs` is a fresh array each time).
  useEffect(() => {
    if (runs.length === 0) return undefined;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(false);
    setDesired(new Map());

    (async () => {
      try {
        const perRun = await Promise.all(
          runs.map(async run => ({ runId: run.id, res: await fetchAssignments(run.id).unwrap() })),
        );
        if (cancelled) return;
        const map = new Map<string, Map<string, AssignmentInfo>>();
        for (const { runId, res } of perRun) {
          const byEvaluator = new Map<string, AssignmentInfo>();
          for (const item of res.items) {
            if (!item.evaluator) continue;
            byEvaluator.set(item.evaluator.id, {
              assignmentId: item.id,
              submitted: Boolean(item.submittedAt),
            });
          }
          map.set(runId, byEvaluator);
        }
        setAssignmentsByRun(map);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIdsKey]);

  const assignedCountFor = useCallback(
    (evaluatorId: string) => runs.filter(r => assignmentsByRun.get(r.id)?.has(evaluatorId)).length,
    [runs, assignmentsByRun],
  );

  const aggregateStateFor = useCallback(
    (evaluatorId: string): "all" | "some" | "none" => {
      const count = assignedCountFor(evaluatorId);
      if (count === 0) return "none";
      if (count === runs.length) return "all";
      return "some";
    },
    [assignedCountFor, runs.length],
  );

  const handleToggle = useCallback(
    (evaluatorId: string) => {
      setDesired(prev => {
        const next = new Map(prev);
        const explicit = next.get(evaluatorId);
        if (explicit !== undefined) {
          next.set(evaluatorId, !explicit);
        } else {
          // First touch: indeterminate/none -> assign to all; all -> remove from all.
          next.set(evaluatorId, aggregateStateFor(evaluatorId) !== "all");
        }
        return next;
      });
    },
    [aggregateStateFor],
  );

  const previewNames = useMemo(
    () => runs.slice(0, RUN_PREVIEW_LIMIT).map(r => r.skillName),
    [runs],
  );
  const previewExtra = runs.length - previewNames.length;

  const handleApply = useCallback(async () => {
    if (desired.size === 0) return;

    const addPerRun = new Map<string, string[]>();
    const removeCalls: { runId: string; assignmentId: string }[] = [];
    let skippedSubmitted = 0;

    for (const [evaluatorId, want] of desired.entries()) {
      for (const run of runs) {
        const info = assignmentsByRun.get(run.id)?.get(evaluatorId);
        if (want) {
          if (!info) {
            addPerRun.set(run.id, [...(addPerRun.get(run.id) ?? []), evaluatorId]);
          }
        } else if (info) {
          if (info.submitted) {
            skippedSubmitted++;
          } else {
            removeCalls.push({ runId: run.id, assignmentId: info.assignmentId });
          }
        }
      }
    }

    const addCalls = Array.from(addPerRun.entries()).map(([runId, evaluatorIds]) => ({
      runId,
      evaluatorIds,
    }));

    setIsApplying(true);
    const [addResults, removeResults] = await Promise.all([
      Promise.allSettled(
        addCalls.map(c => assignRun({ runId: c.runId, evaluatorIds: c.evaluatorIds }).unwrap()),
      ),
      Promise.allSettled(
        removeCalls.map(c =>
          unassignRun({ assignmentId: c.assignmentId, runId: c.runId }).unwrap(),
        ),
      ),
    ]);
    setIsApplying(false);

    let added = 0;
    let failed = 0;
    addResults.forEach((r, i) => {
      if (r.status === "fulfilled") added += addCalls[i].evaluatorIds.length;
      else failed += addCalls[i].evaluatorIds.length;
    });
    let removed = 0;
    removeResults.forEach(r => {
      if (r.status === "fulfilled") removed += 1;
      else failed += 1;
    });

    const parts: string[] = [];
    if (added > 0) parts.push(en.aiLab.bulkAssign.added(added));
    if (removed > 0) parts.push(en.aiLab.bulkAssign.removed(removed));
    if (skippedSubmitted > 0) parts.push(en.aiLab.bulkAssign.skippedSubmitted(skippedSubmitted));

    if (failed > 0) {
      toast.error([...parts, en.aiLab.bulkAssign.applyFailed].join(" · "));
    } else if (parts.length > 0) {
      toast.success(parts.join(" · "));
    }
    onClose();
  }, [desired, runs, assignmentsByRun, assignRun, unassignRun, onClose]);

  if (runs.length === 0) return null;

  const busy = isLoading || isApplying;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[46%] min-w-[620px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="p-6">
          <span className="text-base font-tertiary font-[500]">
            {en.aiLab.bulkAssign.drawerTitle}
          </span>
          <p className="text-sm text-typography-600 mt-1">
            {en.aiLab.bulkAssign.subtitle(runs.length)}
          </p>
          <p className="text-xs text-typography-500 mt-2">
            {previewNames.join(", ")}
            {previewExtra > 0 && ` (+${previewExtra} more)`}
          </p>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar pb-4">
          {isLoading ? (
            <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
          ) : loadError ? (
            <p className="text-sm text-destructive-600 py-8 text-center">
              {en.aiLab.bulkAssign.loadFailed}
            </p>
          ) : evaluators.length === 0 ? (
            <p className="text-sm text-typography-600 bg-background-secondary border border-border-light rounded-md px-4 py-3">
              {en.aiLab.bulkAssign.noEvaluators}
            </p>
          ) : (
            <div className="border border-border-light rounded-md divide-y divide-border-light">
              {evaluators.map(evaluator => {
                const explicit = desired.get(evaluator.id);
                const agg = aggregateStateFor(evaluator.id);
                const checked = explicit !== undefined ? explicit : agg === "all";
                const indeterminate = explicit === undefined && agg === "some";
                const assignedN = assignedCountFor(evaluator.id);
                return (
                  <label
                    key={evaluator.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-background-secondary/50"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checked}
                      ref={el => {
                        if (el) el.indeterminate = indeterminate;
                      }}
                      onChange={() => handleToggle(evaluator.id)}
                      disabled={busy}
                    />
                    <span className="flex-1 text-base text-typography-900">{evaluator.email}</span>
                    <span className="text-xs text-typography-500">
                      {agg === "all"
                        ? en.aiLab.bulkAssign.assignedAll
                        : agg === "none"
                          ? en.aiLab.bulkAssign.assignedNone
                          : en.aiLab.bulkAssign.assignedSome(assignedN, runs.length)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border-light px-10 py-4 flex gap-3 justify-end">
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose} disabled={busy}>
            {en.common.cancel}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleApply}
            disabled={busy || desired.size === 0}
            title={desired.size === 0 ? en.aiLab.bulkAssign.noChanges : undefined}
          >
            {isApplying ? en.aiLab.bulkAssign.applying : en.aiLab.bulkAssign.apply}
          </Button>
        </div>
      </div>
    </div>
  );
};
