import React, { useMemo } from "react";

import { en } from "@constants";
import { LabRun } from "@types";

import { RunStatusBadge } from "./RunStatusBadge";

interface ComparisonDrawerProps {
  /** The run whose batch we're comparing (null = closed). */
  run: LabRun | null;
  /** All currently-loaded runs (filtered to the same batch here). */
  allRuns: LabRun[];
  onClose: () => void;
}

const formatCost = (cost?: string | number | null): string => {
  if (cost == null) return "—";
  const n = Number(cost);
  return Number.isNaN(n)
    ? "—"
    : `$${n
        .toFixed(n < 0.01 ? 6 : 4)
        .replace(/0+$/, "")
        .replace(/\.$/, ".00")}`;
};

/** Side-by-side comparison of the runs sharing a batchId. */
export const ComparisonDrawer: React.FC<ComparisonDrawerProps> = ({ run, allRuns, onClose }) => {
  const batchRuns = useMemo(() => {
    if (!run?.batchId) return run ? [run] : [];
    return allRuns.filter(r => r.batchId === run.batchId);
  }, [run, allRuns]);

  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[70%] min-w-[860px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <span className="text-base font-tertiary font-[500]">{en.aiLab.compare.drawerTitle}</span>
          <span className="text-sm text-typography-600">
            {batchRuns.length} {en.aiLab.runs.heading.toLowerCase()}
          </span>
        </div>

        <div className="flex-1 min-h-0 px-6 pt-2 overflow-auto custom-scrollbar pb-8">
          <p className="text-sm text-typography-600 mb-4">{en.aiLab.compare.subtitle}</p>
          {batchRuns.length <= 1 ? (
            <p className="text-sm text-typography-500">{en.aiLab.compare.empty}</p>
          ) : (
            <div className="flex gap-4 min-w-max">
              {batchRuns.map(r => (
                <div
                  key={r.id}
                  className="w-[340px] shrink-0 border border-border-light rounded-md flex flex-col"
                >
                  <div className="border-b border-border-light px-4 py-3 space-y-2">
                    <div className="font-medium text-typography-900">{r.skillName}</div>
                    <RunStatusBadge status={r.status} />
                    <div className="text-xs font-mono text-typography-500">{r.model}</div>
                    {r.variableValues.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {r.variableValues.map(v => (
                          <span
                            key={v.name}
                            className="font-mono text-[10px] bg-background-secondary border border-border-light rounded px-1 py-0.5"
                            title={`${v.name}: ${v.value}`}
                          >
                            {`{{${v.name}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-4 text-xs text-typography-600">
                      <span>
                        {en.aiLab.compare.columnTokens}: {r.totalTokens ?? "—"}
                      </span>
                      <span>
                        {en.aiLab.compare.columnCost}: {formatCost(r.costUsd)}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 text-sm text-typography-900 whitespace-pre-wrap break-words overflow-y-auto custom-scrollbar max-h-[420px]">
                    {r.status === "FAILED" ? (
                      <span className="text-destructive-700">{r.error || "—"}</span>
                    ) : (
                      r.output || "—"
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
