import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";
import { useDispatch, useSelector } from "react-redux";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import {
  baseAPI,
  useCancelRoleplayRehearsalMutation,
  useCritiqueRoleplayRehearsalMutation,
  useGetRoleplayRehearsalComparisonQuery,
  useGetRoleplayRehearsalQuery,
  useGetRoleplayRehearsalsBySpecQuery,
  useGetRoleplayRehearsalTranscriptsQuery,
  useUpdateCritiqueProposalStatusMutation,
} from "@api";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { en, TAG_TYPES } from "@constants";
import { acceptProposal, queueProposals, rejectProposal, selectRoleplaySpecState } from "@reducer";
import { RehearsalRunStatusPayload, RoleplayRehearsalStatus } from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { roleplayMarkdownComponents } from "../markdownComponents";
import { JudgeScorecard } from "./JudgeScorecard";
import { ProposedEditCard } from "./ProposedEditCard";
import { RehearsalLaunchCard } from "./RehearsalLaunchCard";
import { RehearsalRunRow } from "./RehearsalRunRow";
import { RehearsalTranscriptViewer } from "./RehearsalTranscriptViewer";
import { TestCaseResultsCard } from "./TestCaseResultsCard";
import { useRehearsalSocket } from "./useRehearsalSocket";

/**
 * The rehearse step: launch card, live run list (socket-driven progress from
 * namespace roleplay/rehearsals), and the selected run's results — judge
 * scorecard, report markdown, per-profile transcripts, and critique
 * proposals that accept/reject straight into the spec slice.
 */
export const RehearsalPanel: React.FC = () => {
  const strings = en.roleplayStudio.rehearsal;
  const dispatch = useDispatch();
  const { specId, versionId, pendingProposals } = useSelector(selectRoleplaySpecState);

  const { data: rehearsals = [], isLoading } = useGetRoleplayRehearsalsBySpecQuery(
    specId as string,
    { skip: !specId },
  );
  const [cancelRehearsal] = useCancelRoleplayRehearsalMutation();
  const [critiqueRehearsal, { isLoading: isCritiquing }] = useCritiqueRoleplayRehearsalMutation();
  const [updateProposalStatus] = useUpdateCritiqueProposalStatusMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, RehearsalRunStatusPayload>>({});
  // "View transcript" focus: which transcript tab to show + scroll target.
  const [transcriptFocusId, setTranscriptFocusId] = useState<string | null>(null);
  const transcriptViewerRef = useRef<HTMLDivElement>(null);

  const onRunStatus = useCallback((data: RehearsalRunStatusPayload) => {
    setLiveStatuses(previous => ({ ...previous, [data.rehearsalId]: data }));
  }, []);

  const onRehearsalCompleted = useCallback(
    (data: { rehearsalId: string }) => {
      // Refetch the list + the completed run's results.
      dispatch(
        baseAPI.util.invalidateTags([
          TAG_TYPES.ROLEPLAY_REHEARSALS,
          { type: TAG_TYPES.ROLEPLAY_REHEARSALS, id: data.rehearsalId },
        ]),
      );
    },
    [dispatch],
  );

  useRehearsalSocket({ onRunStatus, onRehearsalCompleted });

  // No explicit pick yet -> default to the first completed run (else newest).
  const defaultSelectedId =
    rehearsals.find(run => String(run.status) === RoleplayRehearsalStatus.COMPLETED)?.id ??
    rehearsals[0]?.id ??
    null;
  const effectiveSelectedId = selectedId ?? defaultSelectedId;

  const { data: selectedRun } = useGetRoleplayRehearsalQuery(effectiveSelectedId as string, {
    skip: !effectiveSelectedId,
  });

  // Transcripts come from their own endpoint (the rehearsal entity carries none).
  const { data: transcripts = [] } = useGetRoleplayRehearsalTranscriptsQuery(
    effectiveSelectedId as string,
    { skip: !effectiveSelectedId },
  );

  // Switching runs must not carry a stale transcript focus across.
  useEffect(() => {
    setTranscriptFocusId(null);
  }, [effectiveSelectedId]);

  const handleViewTranscript = useCallback((testCaseId: string) => {
    setTranscriptFocusId(testCaseId);
    transcriptViewerRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const selectedIsCompleted =
    String(selectedRun?.status ?? "") === RoleplayRehearsalStatus.COMPLETED;

  // Score deltas vs the previous completed rehearsal of this spec.
  const { data: comparisonData } = useGetRoleplayRehearsalComparisonQuery(
    { rehearsalId: effectiveSelectedId as string },
    { skip: !effectiveSelectedId || !selectedIsCompleted },
  );

  const handleCancel = async (rehearsalId: string) => {
    try {
      await cancelRehearsal(rehearsalId).unwrap();
    } catch {
      toast.error(strings.cancelFailed);
    }
  };

  const handleCritique = async () => {
    if (!effectiveSelectedId) return;
    try {
      const response = await critiqueRehearsal(effectiveSelectedId).unwrap();
      dispatch(
        queueProposals(
          (response.proposals ?? []).map(proposal => ({
            ...proposal,
            id: proposal.id ?? roleplayEntityId("proposal"),
          })),
        ),
      );
    } catch {
      toast.error(strings.critiqueFailed);
    }
  };

  // Apply locally, then record the decision server-side (audit trail + the
  // critique history's oscillation guard). Best-effort: a failed PATCH never
  // blocks the local edit.
  const decideProposal = (proposalId: string, decision: "applied" | "rejected") => {
    dispatch(decision === "applied" ? acceptProposal(proposalId) : rejectProposal(proposalId));
    updateProposalStatus({ proposalId, status: decision }).catch(() => undefined);
  };

  const handleAcceptAll = () => {
    pendingProposals.forEach(proposal => decideProposal(proposal.id, "applied"));
  };

  const sortedRehearsals = useMemo(
    () =>
      [...rehearsals].sort((a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
      ),
    [rehearsals],
  );

  if (!specId || !versionId) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto custom-scrollbar pb-6">
      <RehearsalLaunchCard specId={specId} versionId={versionId} />

      {isLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-14 rounded-lg bg-neutral-100" />
          <div className="h-14 rounded-lg bg-neutral-100" />
        </div>
      ) : sortedRehearsals.length === 0 ? (
        <EmptyState title={strings.emptyTitle} subtitle={strings.emptySubtitle} hideActionButton />
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-medium text-typography-900">{strings.title}</h3>
          {sortedRehearsals.map(rehearsal => (
            <RehearsalRunRow
              key={rehearsal.id}
              rehearsal={rehearsal}
              liveProgress={liveStatuses[rehearsal.id]?.progress}
              liveStatus={
                liveStatuses[rehearsal.id] ? String(liveStatuses[rehearsal.id].status) : undefined
              }
              isSelected={rehearsal.id === effectiveSelectedId}
              onSelect={() => setSelectedId(rehearsal.id)}
              onCancel={() => handleCancel(rehearsal.id)}
            />
          ))}
        </div>
      )}

      {selectedRun && selectedRun.results && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-typography-900">{strings.overall}</h3>
            {selectedIsCompleted && (
              <Button
                variant={ButtonVariant.SECONDARY}
                className="h-[34px] px-4 text-sm"
                onClick={handleCritique}
                disabled={isCritiquing}
              >
                {isCritiquing ? strings.critiqueRunning : strings.critique}
              </Button>
            )}
          </div>

          <JudgeScorecard
            results={selectedRun.results}
            comparison={comparisonData?.comparison ?? undefined}
          />

          {(selectedRun.results.test_case_results?.length ?? 0) > 0 && (
            <TestCaseResultsCard
              results={selectedRun.results.test_case_results ?? []}
              testCases={selectedRun.config?.testCases}
              onViewTranscript={handleViewTranscript}
            />
          )}

          {pendingProposals.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-typography-900">{strings.proposals}</h4>
                <Button
                  variant={ButtonVariant.SECONDARY}
                  className="h-[30px] px-3 text-xs"
                  onClick={handleAcceptAll}
                >
                  {strings.acceptAll}
                </Button>
              </div>
              {pendingProposals.map(proposal => (
                <ProposedEditCard
                  key={proposal.id}
                  proposal={proposal}
                  onAccept={() => decideProposal(proposal.id, "applied")}
                  onReject={() => decideProposal(proposal.id, "rejected")}
                />
              ))}
            </div>
          )}

          {selectedRun.reportMarkdown && (
            <div className="rounded-lg border border-border-light bg-white p-4">
              <h4 className="text-sm font-medium text-typography-900">{strings.report}</h4>
              <div className="mt-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={roleplayMarkdownComponents}>
                  {selectedRun.reportMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {transcripts.length > 0 && (
            <div ref={transcriptViewerRef}>
              <RehearsalTranscriptViewer
                transcripts={transcripts}
                testCases={selectedRun.config?.testCases}
                testCaseResults={selectedRun.results.test_case_results}
                activeId={transcriptFocusId ?? undefined}
                onActiveIdChange={setTranscriptFocusId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
