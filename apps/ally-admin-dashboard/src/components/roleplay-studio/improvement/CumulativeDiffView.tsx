import React from "react";

import { useGetImprovementRunDiffQuery } from "@api";
import { en } from "@constants";

const previewValue = (value: unknown): string => {
  if (value === undefined) return "—";
  if (typeof value === "string") return value.length > 260 ? `${value.slice(0, 260)}…` : value;
  try {
    const json = JSON.stringify(value, null, 1);
    return json.length > 260 ? `${json.slice(0, 260)}…` : json;
  } catch {
    return String(value);
  }
};

interface CumulativeDiffViewProps {
  runId: string;
}

/** Baseline → best changed-paths list with before/after previews. */
export const CumulativeDiffView: React.FC<CumulativeDiffViewProps> = ({ runId }) => {
  const strings = en.roleplayStudio.improvement;
  const rehearsalStrings = en.roleplayStudio.rehearsal;
  const { data: diff } = useGetImprovementRunDiffQuery(runId);

  if (!diff) return null;

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h4 className="text-sm font-medium text-typography-900">{strings.cumulativeDiff}</h4>
      {diff.changes.length === 0 ? (
        <p className="mt-2 text-sm text-typography-600">{strings.noChanges}</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {diff.changes.map((change, index) => (
            <div
              key={`${change.path}-${index}`}
              className="rounded-md border border-border-light bg-neutral-50/50 p-2.5"
            >
              <p className="font-mono text-[11px] text-typography-600">{change.path}</p>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium uppercase text-typography-600">
                    {rehearsalStrings.before}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-typography-800">
                    {previewValue(change.before)}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-medium uppercase text-typography-600">
                    {rehearsalStrings.after}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-typography-900">
                    {previewValue(change.after)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
