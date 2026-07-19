import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useGetRunAutoEvaluationsQuery,
  useCreateAutoEvaluationMutation,
  useGetAutofillModelsQuery,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, DEFAULT_AUTOFILL_MODEL, FALLBACK_AUTOFILL_MODEL_OPTIONS } from "@constants";
import { LabRun } from "@types";

interface AutoEvalDrawerProps {
  run: LabRun | null;
  onClose: () => void;
}

const scoreColor = (score?: number | null): string => {
  if (score == null) return "text-typography-500";
  if (score >= 80) return "text-green-700";
  if (score >= 50) return "text-amber-700";
  return "text-destructive-700";
};

/** Trigger and view LLM-as-judge evaluations for a completed run. */
export const AutoEvalDrawer: React.FC<AutoEvalDrawerProps> = ({ run, onClose }) => {
  const { data: evaluations, isFetching } = useGetRunAutoEvaluationsQuery(run?.id ?? "", {
    skip: !run,
    refetchOnMountOrArgChange: true,
  });
  const [createAutoEval, { isLoading: running }] = useCreateAutoEvaluationMutation();

  const { data: models } = useGetAutofillModelsQuery();
  const modelOptions = models?.length ? models : FALLBACK_AUTOFILL_MODEL_OPTIONS;

  const [criteria, setCriteria] = useState("");
  const [model, setModel] = useState(DEFAULT_AUTOFILL_MODEL);

  useEffect(() => {
    if (run) {
      setCriteria("");
      setModel(DEFAULT_AUTOFILL_MODEL);
    }
  }, [run]);

  if (!run) return null;

  const handleRun = async () => {
    if (!criteria.trim()) return;
    const response = await createAutoEval({ runId: run.id, criteria: criteria.trim(), model });
    if ("error" in response && response.error) {
      toast.error(en.aiLab.autoEval.failed);
      return;
    }
    toast.success(en.aiLab.autoEval.success);
    setCriteria("");
  };

  const prior = evaluations ?? [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={running ? undefined : onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <span className="text-base font-tertiary font-[500]">
            {en.aiLab.autoEval.drawerTitle}
          </span>
          <span className="text-sm text-typography-600">{run.skillName}</span>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-5 pb-8">
          <p className="text-sm text-typography-600">{en.aiLab.autoEval.subtitle}</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-typography-900">
              {en.aiLab.autoEval.criteriaLabel}
              <span className="text-destructive-500 ml-1">*</span>
            </label>
            <textarea
              value={criteria}
              onChange={e => setCriteria(e.target.value)}
              placeholder={en.aiLab.autoEval.criteriaPlaceholder}
              rows={4}
              disabled={running}
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-sm resize-y"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-typography-900">
              {en.aiLab.autoEval.modelLabel}
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={running}
              className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base bg-white"
            >
              {modelOptions.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleRun}
              disabled={running || !criteria.trim()}
              title={!criteria.trim() ? en.aiLab.autoEval.validation : undefined}
            >
              {running ? en.aiLab.autoEval.running : en.aiLab.autoEval.run}
            </Button>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-2">
              {en.aiLab.autoEval.priorHeading}
            </h4>
            {isFetching && prior.length === 0 ? (
              <p className="text-sm text-typography-500">{en.common.loading}</p>
            ) : prior.length === 0 ? (
              <p className="text-sm text-typography-500">{en.aiLab.autoEval.empty}</p>
            ) : (
              <div className="space-y-3">
                {prior.map(ev => (
                  <div key={ev.id} className="border border-border-light rounded-md p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-2xl font-medium ${scoreColor(ev.score)}`}>
                        {ev.score != null ? `${ev.score}` : "—"}
                        <span className="text-sm text-typography-500"> / 100</span>
                      </span>
                      <span className="font-mono text-xs text-typography-500">{ev.model}</span>
                    </div>
                    {ev.error ? (
                      <p className="text-sm text-destructive-600">{ev.error}</p>
                    ) : (
                      ev.reasoning && (
                        <p className="text-sm text-typography-800 whitespace-pre-wrap break-words">
                          {ev.reasoning}
                        </p>
                      )
                    )}
                    <p className="text-xs text-typography-400 mt-2 whitespace-pre-wrap break-words">
                      {ev.criteria}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
