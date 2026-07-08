import React, { useMemo, useState } from "react";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import {
  RoleplayRehearsalTestCaseSnapshot,
  RoleplayRehearsalTranscript,
  RoleplayTestCaseResult,
} from "@src/types/roleplayStudio";

import { VerdictBadge } from "./VerdictBadge";

interface RehearsalTranscriptViewerProps {
  transcripts: RoleplayRehearsalTranscript[];
  /** Launch-time snapshots (`rehearsal.config.testCases`) for tab titles/conditions. */
  testCases?: RoleplayRehearsalTestCaseSnapshot[];
  /** Verdicts keyed by test_case_id for the case-tab header strip. */
  testCaseResults?: RoleplayTestCaseResult[];
  /** Controlled active tab (falls back to internal state when absent). */
  activeId?: string;
  onActiveIdChange?: (id: string) => void;
}

/** Stable tab id for a transcript: test-case sessions key by case id. */
export const transcriptTabId = (transcript: RoleplayRehearsalTranscript): string =>
  transcript.agentTestCaseId ?? String(transcript.traineeProfile);

const isTraineeRole = (role: string) => {
  const normalized = role.toLowerCase();
  return normalized.includes("trainee") || normalized === "user" || normalized === "counsellor";
};

const formatNotes = (notes?: string | Record<string, string>): string => {
  if (!notes) return "";
  if (typeof notes === "string") return notes;
  return Object.entries(notes)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
};

/**
 * Per-session transcripts as speaker-chip turn lists (visual language from
 * report-content/TranscriptSection) with stateId + stage-direction
 * annotations per turn, plus a judge-notes expander. Test-case sessions get
 * a verdict + condition strip above the turns (the shared Tabs component
 * only takes string labels, so the strip lives in the panel content).
 */
export const RehearsalTranscriptViewer: React.FC<RehearsalTranscriptViewerProps> = ({
  transcripts,
  testCases,
  testCaseResults,
  activeId,
  onActiveIdChange,
}) => {
  const strings = en.roleplayStudio.rehearsal;

  const snapshotFor = (testCaseId?: string): RoleplayRehearsalTestCaseSnapshot | undefined =>
    testCaseId ? testCases?.find(snapshot => snapshot.id === testCaseId) : undefined;

  const tabItems = useMemo(
    () =>
      transcripts.map(transcript => ({
        id: transcriptTabId(transcript),
        label: transcript.agentTestCaseId
          ? (testCases?.find(snapshot => snapshot.id === transcript.agentTestCaseId)?.title ??
            transcript.agentTestCaseId)
          : (strings.profiles[transcript.traineeProfile as keyof typeof strings.profiles] ??
            String(transcript.traineeProfile)),
      })),
    [transcripts, testCases],
  );

  // Controlled-with-fallback: a provided activeId wins; tab clicks update both.
  // Guard the internal id against tab churn — when the run switches, a stale
  // internalActiveId (a tab id from the previous run) must fall back to the
  // first tab rather than leave nothing selected.
  const [internalActiveId, setInternalActiveId] = useState<string>(tabItems[0]?.id ?? "");
  const internalIsValid = tabItems.some(item => item.id === internalActiveId);
  const effectiveActiveId =
    activeId ?? (internalIsValid ? internalActiveId : (tabItems[0]?.id ?? ""));
  const handleTabChange = (id: string) => {
    setInternalActiveId(id);
    onActiveIdChange?.(id);
  };

  const active =
    transcripts.find(transcript => transcriptTabId(transcript) === effectiveActiveId) ??
    transcripts[0];

  if (!active) return null;

  const notes = formatNotes(active.judgeNotes);
  const activeSnapshot = snapshotFor(active.agentTestCaseId);
  const activeResult = active.agentTestCaseId
    ? testCaseResults?.find(result => result.test_case_id === active.agentTestCaseId)
    : undefined;

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h4 className="text-sm font-medium text-typography-900">{strings.transcripts}</h4>
      {tabItems.length > 1 && (
        <Tabs
          items={tabItems}
          activeId={effectiveActiveId || tabItems[0]?.id}
          onChange={handleTabChange}
          showCount={false}
          className="mt-1 mb-2 border-b border-border-light"
        />
      )}

      {active.agentTestCaseId && (
        <div
          className="mt-2 flex items-center gap-2 rounded-md bg-neutral-50 px-3 py-2"
          data-testid="test-case-transcript-header"
        >
          {activeResult && <VerdictBadge verdict={activeResult.verdict} />}
          {activeSnapshot?.condition && (
            <span className="truncate text-xs text-typography-600">
              {strings.condition}: {activeSnapshot.condition}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 py-3 max-h-[420px] overflow-y-auto custom-scrollbar">
        {active.transcript.map(turn => {
          const trainee = isTraineeRole(turn.role);
          return (
            <div
              key={`${transcriptTabId(active)}-${turn.turnIndex}-${turn.role}`}
              className="flex gap-3"
            >
              <span className="w-8 shrink-0 pt-0.5 text-xs text-typography-600">
                #{turn.turnIndex}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-medium ${trainee ? "text-primary-500" : "text-typography-900"}`}
                  >
                    {turn.role}
                  </span>
                  {turn.stateId && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-typography-700">
                      {strings.state}: {turn.stateId}
                    </span>
                  )}
                </div>
                {turn.stageDirection && (
                  <span className="text-xs italic text-typography-600">
                    {strings.stageDirection}: {turn.stageDirection}
                  </span>
                )}
                <span className="text-sm font-normal text-typography-900">{turn.content}</span>
              </div>
            </div>
          );
        })}
      </div>

      {notes && (
        <details className="mt-2 rounded-md border border-border-light p-3">
          <summary className="cursor-pointer text-sm font-medium text-typography-900">
            {strings.judgeNotes}
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-typography-800">{notes}</p>
        </details>
      )}
    </div>
  );
};
