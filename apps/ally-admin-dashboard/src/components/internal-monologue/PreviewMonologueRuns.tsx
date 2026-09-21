import React, { useEffect, useState } from "react";

import {
  useGetPreviewMonologuesQuery,
  useGetScenarioLanguagesQuery,
  useLazyGetPreviewMonologueRunQuery,
} from "@api";
import { en } from "@constants";
import { PreviewMonologueRunSummary } from "@types";
import { formatRelativeTime, formatTimestamp } from "@utils";

import { InternalMonologuePanel } from "./InternalMonologuePanel";

interface PreviewMonologueRunsProps {
  scenarioId: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * One run in the left rail.
 *
 * Carries when, who, which language and whether it was a draft version —
 * the axes a curator actually varies between previews, so two runs can be told
 * apart without opening both (Stacks: "Compare Prompt Variations Using Batch
 * Run Visualization"). Turn count doubles as the honest signal of a run that
 * produced nothing.
 */
const RunRow: React.FC<{
  run: PreviewMonologueRunSummary;
  isSelected: boolean;
  languageLabel?: string;
  onSelect: () => void;
}> = ({ run, isSelected, languageLabel, onSelect }) => {
  const t = en.previewMonologueRuns;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={formatTimestamp(run.startedAt)}
      className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
        isSelected
          ? "border-primary-500 bg-primary-50"
          : "border-border-light bg-white hover:bg-gray-50"
      }`}
    >
      <p className="text-xs font-medium text-typography-900">{formatRelativeTime(run.startedAt)}</p>
      <p className="mt-0.5 text-[11px] text-typography-600">
        {run.endedAt ? t.turns(run.turnCount) : t.inProgress}
        {run.startedByName ? ` · ${t.ranBy(run.startedByName)}` : ""}
      </p>
      {(languageLabel || run.scenarioVersionId) && (
        <p className="mt-0.5 text-[11px] text-typography-600">
          {[languageLabel, run.scenarioVersionId ? t.draftVersion : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </button>
  );
};

/**
 * Browse the internal monologues recorded from this simulation's previews.
 *
 * Admin previews are ephemeral everywhere else in the platform — no session
 * row, and every ingest processor drops `preview-%` — so without this the only
 * chance to read a run was live, while also playing the counsellor. Reading it
 * afterwards is the point: prompt tuning is not something you can do while
 * holding up your half of the conversation.
 */
export const PreviewMonologueRuns: React.FC<PreviewMonologueRunsProps> = ({
  scenarioId,
  isOpen,
  onClose,
}) => {
  const t = en.previewMonologueRuns;
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Resolved here rather than passed in: a language id means nothing to a
  // reader, and every caller would otherwise have to fetch the same list.
  const { data: languages } = useGetScenarioLanguagesQuery({ active: true }, { skip: !isOpen });
  const languageName = (languageId: number | null) =>
    languages?.find(language => language.id === languageId)?.label;

  const {
    data: runs,
    isLoading,
    isError,
  } = useGetPreviewMonologuesQuery({ scenarioId }, { skip: !isOpen });

  const [fetchRun, { data: selectedRun, isFetching: isFetchingRun }] =
    useLazyGetPreviewMonologueRunQuery();

  // Open on the newest run that recorded something. The literal newest is
  // often a run still in flight or one that ended before the client formed a
  // thought, and landing the reader on an empty pane teaches them nothing.
  useEffect(() => {
    if (!isOpen || selectedRunId || !runs?.length) return;
    setSelectedRunId((runs.find(run => run.turnCount > 0) ?? runs[0]).id);
  }, [isOpen, runs, selectedRunId]);

  useEffect(() => {
    if (selectedRunId) fetchRun({ runId: selectedRunId });
  }, [selectedRunId, fetchRun]);

  useEffect(() => {
    if (!isOpen) setSelectedRunId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const renderList = () => {
    if (isLoading) return <p className="p-3 text-xs text-typography-600">{t.loading}</p>;
    if (isError) return <p className="p-3 text-xs text-error-500">{t.failed}</p>;
    if (!runs?.length) return <p className="p-3 text-xs text-typography-600">{t.empty}</p>;

    return runs.map(run => (
      <RunRow
        key={run.id}
        run={run}
        isSelected={run.id === selectedRunId}
        languageLabel={languageName?.(run.languageId)}
        onSelect={() => setSelectedRunId(run.id)}
      />
    ));
  };

  const renderReader = () => {
    if (!selectedRunId) {
      return (
        <p className="flex h-full items-center justify-center text-xs text-typography-600">
          {t.pickRun}
        </p>
      );
    }
    if (isFetchingRun && !selectedRun) {
      return (
        <p className="flex h-full items-center justify-center text-xs text-typography-600">
          {t.loading}
        </p>
      );
    }
    const selected = runs?.find(run => run.id === selectedRunId);
    if (selected && selected.turnCount === 0) {
      // "Nothing recorded" and "still going" look identical in the data and
      // mean opposite things to someone deciding whether to wait.
      return (
        <p className="flex h-full items-center justify-center text-xs text-typography-600">
          {selected.endedAt ? t.noTurns : t.stillRunning}
        </p>
      );
    }
    // `turns` puts the panel in stored mode — same component, same rendering as
    // the live preview, so a run reads identically whenever you open it.
    return <InternalMonologuePanel turns={selectedRun?.turns ?? []} className="h-full" />;
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <div className="flex h-[85vh] w-full max-w-[1100px] flex-col rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-border-light px-5 py-4">
            <div>
              <h2 className="text-base font-medium text-typography-900">{t.title}</h2>
              <p className="mt-0.5 text-xs text-typography-600">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-typography-600 hover:text-typography-900"
            >
              {t.close}
            </button>
          </header>

          <div className="flex min-h-0 flex-1">
            <div className="custom-scrollbar flex w-[260px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-border-light p-3">
              {renderList()}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-3">{renderReader()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
