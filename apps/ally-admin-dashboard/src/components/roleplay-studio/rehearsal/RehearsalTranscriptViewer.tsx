import React, { useMemo, useState } from "react";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { RoleplayRehearsalTranscript } from "@src/types/roleplayStudio";

interface RehearsalTranscriptViewerProps {
  transcripts: RoleplayRehearsalTranscript[];
}

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
 * Per-profile transcripts as speaker-chip turn lists (visual language from
 * report-content/TranscriptSection) with stateId + stage-direction
 * annotations per turn, plus a judge-notes expander.
 */
export const RehearsalTranscriptViewer: React.FC<RehearsalTranscriptViewerProps> = ({
  transcripts,
}) => {
  const strings = en.roleplayStudio.rehearsal;
  const tabItems = useMemo(
    () =>
      transcripts.map(transcript => ({
        id: String(transcript.traineeProfile),
        label:
          strings.profiles[transcript.traineeProfile as keyof typeof strings.profiles] ??
          String(transcript.traineeProfile),
      })),
    [transcripts],
  );

  const [activeProfile, setActiveProfile] = useState<string>(tabItems[0]?.id ?? "");
  const active =
    transcripts.find(transcript => String(transcript.traineeProfile) === activeProfile) ??
    transcripts[0];

  if (!active) return null;

  const notes = formatNotes(active.judgeNotes);

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h4 className="text-sm font-medium text-typography-900">{strings.transcripts}</h4>
      {tabItems.length > 1 && (
        <Tabs
          items={tabItems}
          activeId={activeProfile || tabItems[0]?.id}
          onChange={setActiveProfile}
          showCount={false}
          className="mt-1 mb-2 border-b border-border-light"
        />
      )}

      <div className="flex flex-col gap-3 py-3 max-h-[420px] overflow-y-auto custom-scrollbar">
        {active.transcript.map(turn => {
          const trainee = isTraineeRole(turn.role);
          return (
            <div
              key={`${active.traineeProfile}-${turn.turnIndex}-${turn.role}`}
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
