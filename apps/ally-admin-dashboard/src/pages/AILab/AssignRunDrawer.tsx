import React, { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetLabEvaluatorsQuery,
  useGetRunAssignmentsQuery,
  useAssignLabRunMutation,
  useUnassignLabRunMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabRun } from "@types";

interface AssignRunDrawerProps {
  run: LabRun | null;
  onClose: () => void;
}

/**
 * Assign a published run to evaluators. Checked = assigned. Unchecking an
 * unsubmitted assignment removes it on save; submitted evaluations are locked
 * (their data is immutable).
 */
export const AssignRunDrawer: React.FC<AssignRunDrawerProps> = ({ run, onClose }) => {
  const runId = run?.id ?? "";
  const { data: evaluatorsData } = useGetLabEvaluatorsQuery({ limit: 500 }, { skip: !run });
  const { data: assignmentsData, isFetching } = useGetRunAssignmentsQuery(runId, {
    skip: !run,
    refetchOnMountOrArgChange: true,
  });
  const [assignRun, { isLoading: isAssigning }] = useAssignLabRunMutation();
  const [unassignRun, { isLoading: isUnassigning }] = useUnassignLabRunMutation();

  const evaluators = evaluatorsData?.items ?? [];
  const assignments = useMemo(() => assignmentsData?.items ?? [], [assignmentsData]);

  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Seed the checkboxes from the current assignments whenever they load.
  useEffect(() => {
    setChecked(
      new Set(assignments.map(a => a.evaluator?.id).filter((id): id is string => Boolean(id))),
    );
  }, [assignments]);

  const assignmentByEvaluator = useMemo(
    () => new Map(assignments.filter(a => a.evaluator).map(a => [a.evaluator!.id, a])),
    [assignments],
  );

  const toggle = useCallback((evaluatorId: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(evaluatorId)) next.delete(evaluatorId);
      else next.add(evaluatorId);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!run) return;
    const existing = new Set(assignmentByEvaluator.keys());
    const toAdd = Array.from(checked).filter(id => !existing.has(id));
    const toRemove = assignments.filter(
      a => a.evaluator && !checked.has(a.evaluator.id) && !a.submittedAt,
    );

    // Attempt every change independently so one failure doesn't strand the
    // rest; each add/remove invalidates the assignment cache, so the list
    // reflects whatever actually applied. Only close on a fully clean save.
    let failed = false;
    if (toAdd.length > 0) {
      try {
        await assignRun({ runId: run.id, evaluatorIds: toAdd }).unwrap();
      } catch {
        failed = true;
      }
    }
    for (const assignment of toRemove) {
      try {
        await unassignRun({ assignmentId: assignment.id, runId: run.id }).unwrap();
      } catch {
        failed = true;
      }
    }
    if (failed) {
      toast.error(en.aiLab.assign.saveFailed);
    } else {
      toast.success(en.aiLab.assign.saved);
      onClose();
    }
  }, [run, checked, assignments, assignmentByEvaluator, assignRun, unassignRun, onClose]);

  if (!run) return null;

  const busy = isAssigning || isUnassigning;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[46%] min-w-[620px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="p-6">
          <span className="text-base font-tertiary font-[500]">{en.aiLab.assign.drawerTitle}</span>
          <p className="text-sm text-typography-600 mt-1">
            {run.skillName} — {en.aiLab.assign.subtitle}
          </p>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar pb-4">
          {isFetching ? (
            <p className="text-typography-600 py-8 text-center">{en.common.loading}</p>
          ) : evaluators.length === 0 ? (
            <p className="text-sm text-typography-600 bg-background-secondary border border-border-light rounded-md px-4 py-3">
              {en.aiLab.assign.noEvaluators}
            </p>
          ) : (
            <div className="border border-border-light rounded-md divide-y divide-border-light">
              {evaluators.map(evaluator => {
                const assignment = assignmentByEvaluator.get(evaluator.id);
                const submitted = Boolean(assignment?.submittedAt);
                return (
                  <label
                    key={evaluator.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      submitted ? "opacity-70" : "cursor-pointer hover:bg-background-secondary/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checked.has(evaluator.id)}
                      onChange={() => toggle(evaluator.id)}
                      disabled={submitted || busy}
                    />
                    <span className="flex-1 text-base text-typography-900">{evaluator.email}</span>
                    {submitted && (
                      <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        {en.aiLab.assign.submittedLock}
                      </span>
                    )}
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
            onClick={handleSave}
            disabled={busy || evaluators.length === 0}
          >
            {en.aiLab.assign.save}
          </Button>
        </div>
      </div>
    </div>
  );
};
