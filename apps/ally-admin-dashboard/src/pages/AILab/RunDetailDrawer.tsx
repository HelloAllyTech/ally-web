import React from "react";

import { DoubleArrowRight } from "@assets";
import { en } from "@constants";
import { LabRun } from "@types";

import { RunStatusBadge } from "./RunStatusBadge";

interface RunDetailDrawerProps {
  run: LabRun | null;
  onClose: () => void;
}

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <h4 className="text-xs uppercase tracking-wide text-typography-500 mb-1">{label}</h4>
    <div className="text-base text-typography-900">{children}</div>
  </div>
);

export const RunDetailDrawer: React.FC<RunDetailDrawerProps> = ({ run, onClose }) => {
  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <button
            onClick={onClose}
            className="flex flex-row items-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="text-base font-tertiary font-[500]">{en.aiLab.runs.detailTitle}</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-5 pb-8">
          <Section label={en.aiLab.runs.detailSkill}>{run.skillName}</Section>

          <div className="flex gap-10">
            <Section label={en.aiLab.runs.detailStatus}>
              <RunStatusBadge status={run.status} />
            </Section>
            <Section label={en.aiLab.runs.detailModel}>
              <span className="font-mono text-sm">{run.model}</span>
            </Section>
          </div>

          {run.variableValues.length > 0 && (
            <Section label={en.aiLab.runs.detailVariables}>
              <div className="space-y-2">
                {run.variableValues.map(v => (
                  <div
                    key={v.name}
                    className="border border-border-light rounded-md bg-background-secondary px-3 py-2"
                  >
                    <div className="font-mono text-sm text-typography-700 mb-1 break-all">
                      {`{{${v.name}}}`}
                    </div>
                    <div className="text-sm text-typography-900 whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar">
                      {v.value}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section label={en.aiLab.runs.detailPrompt}>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm bg-background-secondary border border-border-light rounded-md p-3 max-h-[240px] overflow-y-auto custom-scrollbar">
              {run.resolvedPrompt}
            </pre>
          </Section>

          {run.status === "FAILED" ? (
            <Section label={en.aiLab.runs.detailError}>
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-destructive-700 bg-destructive-50 border border-destructive-200 rounded-md p-3">
                {run.error || "Unknown error"}
              </pre>
            </Section>
          ) : (
            <Section label={en.aiLab.runs.detailOutput}>
              <pre className="whitespace-pre-wrap break-words text-base bg-white border border-border-light rounded-md p-3 max-h-[360px] overflow-y-auto custom-scrollbar">
                {run.output || ""}
              </pre>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};
