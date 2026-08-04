import React, { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetLanguagesQuery,
  useGetLlmModelsQuery,
  useGetPromptTranslationsQuery,
  useRetranslatePromptMutation,
  useRetranslatePromptLanguageMutation,
  useSetTranslationRuntimeModelMutation,
} from "@api";
import { PROMPT_LLM_MODEL_OPTIONS, providerForModel } from "@constants";
import { PromptTranslation, PromptTranslationStatus } from "@types";

interface Props {
  promptId: string;
  /** Current (form) value of the opt-in flag. */
  translationEnabled: boolean;
  /** Flip the opt-in flag on the parent form (auto-saved like any edit). */
  onToggleEnabled: (value: boolean) => void;
}

/** Poll cadence while a translation is still in flight. */
const POLL_MS = 4000;
/** A row stuck `translating`/`pending` past this is treated as timed out (the
 *  background job likely died) so it never spins forever. */
const STUCK_MS = 3 * 60 * 1000;

/** UI view state, incl. the synthetic "timedout" (not a stored status). */
type RowView = PromptTranslationStatus | "timedout";

const VIEW_STYLES: Record<RowView, string> = {
  ready: "bg-green-100 text-green-800",
  translating: "bg-blue-100 text-blue-800",
  pending: "bg-neutral-100 text-neutral-700",
  failed: "bg-red-100 text-red-800",
  timedout: "bg-amber-100 text-amber-800",
};

const VIEW_LABEL: Record<RowView, string> = {
  ready: "Ready",
  translating: "Translating…",
  pending: "Queued",
  failed: "Failed",
  timedout: "Timed out",
};

/** In-flight (still expected to change on its own) vs stuck (won't). */
const isInFlight = (s: PromptTranslationStatus) => s === "pending" || s === "translating";

const isStuck = (row: PromptTranslation): boolean => {
  if (!isInFlight(row.status) || !row.updatedAt) return false;
  return Date.now() - Date.parse(row.updatedAt) > STUCK_MS;
};

/** What to show: a stuck in-flight row reads as "timed out". */
const rowView = (row: PromptTranslation): RowView => (isStuck(row) ? "timedout" : row.status);

/**
 * Read-only view of a prompt's auto-generated translations. Bodies are NOT
 * editable here — they are kept aligned to the English source; the only actions
 * are the opt-in toggle and (re)translate. Rendered only for main_agent /
 * branching prompts.
 */
const PromptTranslationsSection: React.FC<Props> = ({
  promptId,
  translationEnabled,
  onToggleEnabled,
}) => {
  const { data: languages } = useGetLanguagesQuery({});
  // Poll only while something is genuinely in flight — the background translate
  // job doesn't notify the client, so without this a completed/failed run keeps
  // showing "Translating…" until a manual refresh. Polling stops once every row
  // is settled (ready/failed) or stuck (timed out), so it never runs forever.
  const [pollMs, setPollMs] = useState(0);
  const { data: translations, isFetching } = useGetPromptTranslationsQuery(promptId, {
    skip: !promptId || !translationEnabled,
    pollingInterval: pollMs,
  });
  useEffect(() => {
    const active = (translations ?? []).some(r => isInFlight(r.status) && !isStuck(r));
    setPollMs(active ? POLL_MS : 0);
  }, [translations]);
  const [retranslateAll, { isLoading: isRetranslatingAll }] = useRetranslatePromptMutation();
  const [retranslateLanguage] = useRetranslatePromptLanguageMutation();
  const [setRuntimeModel] = useSetTranslationRuntimeModelMutation();
  const { data: llmModels } = useGetLlmModelsQuery();
  const [busyLanguageId, setBusyLanguageId] = useState<number | null>(null);

  // Model options for the per-language runtime override (which model runs the
  // main agent when a translated body is served). Backend registry when
  // available, else the static fallback used elsewhere in the studio.
  const modelOptions = useMemo(() => {
    if (llmModels?.length) {
      return llmModels.map(m => ({ value: m.model, label: m.label }));
    }
    return PROMPT_LLM_MODEL_OPTIONS.flatMap(g =>
      g.models.map(m => ({ value: m.value, label: m.label })),
    );
  }, [llmModels]);
  // Bodies collapsed by default so the panel stays short as languages grow.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const languageLabel = useMemo(() => {
    const map = new Map<number, string>();
    (languages ?? []).forEach(l => {
      if (typeof l.id === "number") map.set(l.id, l.label);
    });
    return (id: number) => map.get(id) ?? `Language ${id}`;
  }, [languages]);

  const sortedRows = useMemo(
    () =>
      [...(translations ?? [])].sort((a, b) =>
        languageLabel(a.languageId).localeCompare(languageLabel(b.languageId)),
      ),
    [translations, languageLabel],
  );

  const handleRetranslateAll = async () => {
    try {
      await retranslateAll(promptId).unwrap();
      toast.success("Re-translation started for all languages.");
    } catch {
      toast.error("Could not start re-translation.");
    }
  };

  const handleRetranslateLanguage = async (row: PromptTranslation) => {
    setBusyLanguageId(row.languageId);
    try {
      await retranslateLanguage({
        id: promptId,
        languageId: row.languageId,
      }).unwrap();
      toast.success(`Re-translated ${languageLabel(row.languageId)}.`);
    } catch {
      toast.error(`Could not re-translate ${languageLabel(row.languageId)}.`);
    } finally {
      setBusyLanguageId(null);
    }
  };

  // Empty model = inherit the prompt's own model. Provider is derived so the
  // runtime doesn't have to infer it.
  const handleRuntimeModelChange = async (row: PromptTranslation, model: string) => {
    try {
      await setRuntimeModel({
        id: promptId,
        languageId: row.languageId,
        model,
        provider: model ? (providerForModel(model) ?? "") : "",
      }).unwrap();
      toast.success(`Runtime model updated for ${languageLabel(row.languageId)}.`);
    } catch {
      toast.error(`Could not update the runtime model for ${languageLabel(row.languageId)}.`);
    }
  };

  return (
    <div className="w-full space-y-3 pt-2">
      {/* Opt-in toggle */}
      <label className="flex items-center gap-2 text-sm text-typography-800">
        <input
          type="checkbox"
          checked={translationEnabled}
          onChange={e => onToggleEnabled(e.target.checked)}
          className="h-4 w-4 accent-primary-500"
        />
        Auto-translate this prompt into the supported Indian languages
      </label>

      {!translationEnabled && (
        <p className="text-sm leading-5 text-typography-600">
          Enable to generate read-only translations of this English source. They re-generate
          automatically whenever the English body changes.
        </p>
      )}

      {translationEnabled && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-typography-700">
              Read-only — kept aligned with the English source.
            </span>
            <button
              onClick={handleRetranslateAll}
              disabled={isRetranslatingAll}
              className="inline-flex px-2 py-1 rounded text-sm bg-neutral-100 text-typography-800 hover:bg-neutral-200 disabled:opacity-50 transition-colors border border-border-light"
            >
              {isRetranslatingAll ? "Starting…" : "Re-translate all"}
            </button>
          </div>

          {isFetching && !sortedRows.length ? (
            <p className="text-sm text-typography-600">Loading translations…</p>
          ) : sortedRows.length === 0 ? (
            <p className="text-sm text-typography-600">
              No translations yet — they will generate shortly, or use “Re-translate all”.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedRows.map(row => {
                const view = rowView(row);
                return (
                  <div
                    key={row.id}
                    className="rounded-md border border-border-light bg-neutral-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => row.translatedPrompt && toggleExpanded(row.id)}
                        disabled={!row.translatedPrompt}
                        className="flex items-center gap-2 text-left disabled:cursor-default"
                      >
                        <span
                          className={`text-typography-500 transition-transform ${
                            expandedIds.has(row.id) ? "rotate-90" : ""
                          } ${row.translatedPrompt ? "" : "opacity-0"}`}
                          aria-hidden
                        >
                          ▸
                        </span>
                        <span className="text-sm font-medium text-typography-900">
                          {languageLabel(row.languageId)}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs ${VIEW_STYLES[view]}`}
                        >
                          {VIEW_LABEL[view]}
                        </span>
                      </button>
                      <button
                        onClick={() => handleRetranslateLanguage(row)}
                        disabled={busyLanguageId === row.languageId}
                        className="inline-flex px-2 py-0.5 rounded text-xs bg-neutral-100 text-typography-800 hover:bg-neutral-200 disabled:opacity-50 transition-colors border border-border-light"
                      >
                        {busyLanguageId === row.languageId ? "Retrying…" : "Retry"}
                      </button>
                    </div>

                    {view === "failed" && row.error && (
                      <p className="mt-1 text-xs text-red-700">{row.error}</p>
                    )}

                    {view === "timedout" && (
                      <p className="mt-1 text-xs text-amber-700">
                        Translation is taking longer than expected — it may have stalled. Use Retry
                        to run it again.
                      </p>
                    )}

                    {view === "ready" && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-typography-600">Run agent with:</label>
                        <select
                          value={row.runtimeModel ?? ""}
                          onChange={e => handleRuntimeModelChange(row, e.target.value)}
                          className="rounded border border-border-light bg-white px-2 py-0.5 text-xs text-typography-800"
                          title="Which model runs the main agent when this translated prompt is used for this language"
                        >
                          <option value="">Inherit (prompt default)</option>
                          {modelOptions.map(m => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {row.translatedPrompt && expandedIds.has(row.id) && (
                      <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-white px-2 py-2 text-xs text-neutral-800 custom-scrollbar border border-border-light select-all">
                        {row.translatedPrompt}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PromptTranslationsSection;
