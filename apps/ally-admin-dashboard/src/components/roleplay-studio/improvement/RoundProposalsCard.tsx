import React from "react";

import { en } from "@constants";
import { RoleplayCritiqueProposal } from "@src/types/roleplayStudio";

const statusStyles: Record<string, string> = {
  PROPOSED: "bg-neutral-100 text-typography-700",
  APPLIED: "bg-secondary-50 text-typography-900",
  REJECTED: "bg-neutral-100 text-typography-600",
  SKIPPED_INVALID: "bg-neutral-100 text-typography-600",
  VERIFIED: "bg-success-50 text-success-600",
  FAILED_VERIFICATION: "bg-destructive-50 text-destructive-500",
};

interface RoundProposalsCardProps {
  roundNumber: number;
  proposals: RoleplayCritiqueProposal[];
}

/**
 * The critique proposals one improvement round generated, each with its
 * lifecycle status (applied / verified / failed-verification / skipped) and
 * the ops it carries. Read-only — the loop already decided application.
 */
export const RoundProposalsCard: React.FC<RoundProposalsCardProps> = ({
  roundNumber,
  proposals,
}) => {
  const strings = en.roleplayStudio.improvement;
  const rehearsalStrings = en.roleplayStudio.rehearsal;
  if (proposals.length === 0) return null;

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h4 className="text-sm font-medium text-typography-900">
        {strings.round} {roundNumber}
      </h4>
      <div className="mt-2 flex flex-col gap-2">
        {proposals.map(proposal => {
          const statusKey = String(proposal.status ?? "PROPOSED").toUpperCase();
          return (
            <div key={proposal.id} className="rounded-md border border-border-light p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-typography-900">{proposal.summary}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-typography-800">
                      {proposal.targetSection}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-typography-700">
                      {rehearsalStrings.severity}: {proposal.severity}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    statusStyles[statusKey] ?? statusStyles.PROPOSED
                  }`}
                >
                  {strings.proposalStatus[statusKey as keyof typeof strings.proposalStatus] ??
                    statusKey}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-typography-700">{proposal.rationale}</p>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {proposal.ops.map((op, index) => (
                  <p
                    key={`${proposal.id}-op-${index}`}
                    className="font-mono text-[11px] text-typography-600"
                  >
                    {op.op} {op.path}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
