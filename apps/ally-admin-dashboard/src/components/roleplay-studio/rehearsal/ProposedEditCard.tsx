import React from "react";

import { useSelector } from "react-redux";

import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { selectRoleplaySpec } from "@reducer";
import { RoleplayCritiqueProposal } from "@src/types/roleplayStudio";
import { getValueAtPointer } from "@utils/applyJsonPatch";

const severityStyles: Record<string, string> = {
  critical: "bg-destructive-50 text-destructive-500",
  major: "bg-secondary-50 text-typography-900",
  minor: "bg-neutral-100 text-typography-700",
};

const previewValue = (value: unknown): string => {
  if (value === undefined) return "—";
  if (typeof value === "string") return value.length > 220 ? `${value.slice(0, 220)}…` : value;
  try {
    const json = JSON.stringify(value, null, 1);
    return json.length > 220 ? `${json.slice(0, 220)}…` : json;
  } catch {
    return String(value);
  }
};

interface ProposedEditCardProps {
  proposal: RoleplayCritiqueProposal;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * One critique proposal: rationale, target section + severity chips, and a
 * before/after diff per patch op ("before" read live from the spec slice at
 * the op's path, "after" from the op value).
 */
export const ProposedEditCard: React.FC<ProposedEditCardProps> = ({
  proposal,
  onAccept,
  onReject,
}) => {
  const strings = en.roleplayStudio.rehearsal;
  const spec = useSelector(selectRoleplaySpec);
  const severityClass =
    severityStyles[proposal.severity?.toLowerCase?.() ?? ""] ?? severityStyles.minor;

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-typography-800">
              {proposal.targetSection}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${severityClass}`}>
              {strings.severity}: {proposal.severity}
            </span>
          </div>
          {proposal.summary ? (
            <p className="mt-2 text-sm font-medium text-typography-900">{proposal.summary}</p>
          ) : null}
          <p className="mt-2 text-sm text-typography-900">{proposal.rationale}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={ButtonVariant.SECONDARY}
            className="h-[32px] px-3 text-sm"
            onClick={onReject}
          >
            {strings.reject}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            className="h-[32px] px-3 text-sm"
            onClick={onAccept}
          >
            {strings.accept}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {proposal.ops.map((op, index) => {
          const before = spec ? getValueAtPointer(spec, op.path) : undefined;
          return (
            <div
              key={`${proposal.id}-op-${index}`}
              className="rounded-md border border-border-light bg-neutral-50/50 p-2.5"
            >
              <p className="font-mono text-[11px] text-typography-600">
                {op.op} {op.path}
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-medium uppercase text-typography-600">
                    {strings.before}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-typography-800">
                    {previewValue(before)}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-medium uppercase text-typography-600">
                    {strings.after}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-typography-900">
                    {op.op === "remove" ? "—" : previewValue(op.value)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
