import React, { useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useGetLanguagesQuery,
  useGetPromptTranslationsQuery,
  useRetranslatePromptMutation,
  useRetranslatePromptLanguageMutation,
} from "@api";
import { PromptTranslation, PromptTranslationStatus } from "@types";

interface Props {
  promptId: string;
  /** Current (form) value of the opt-in flag. */
  translationEnabled: boolean;
  /** Flip the opt-in flag on the parent form (auto-saved like any edit). */
  onToggleEnabled: (value: boolean) => void;
}

const STATUS_STYLES: Record<PromptTranslationStatus, string> = {
  ready: "bg-green-100 text-green-800",
  translating: "bg-blue-100 text-blue-800",
  pending: "bg-neutral-100 text-neutral-700",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<PromptTranslationStatus, string> = {
  ready: "Ready",
  translating: "Translating…",
  pending: "Queued",
  failed: "Failed",
};

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
  const { data: translations, isFetching } = useGetPromptTranslationsQuery(promptId, {
    skip: !promptId || !translationEnabled,
  });
  const [retranslateAll, { isLoading: isRetranslatingAll }] = useRetranslatePromptMutation();
  const [retranslateLanguage] = useRetranslatePromptLanguageMutation();
  const [busyLanguageId, setBusyLanguageId] = useState<number | null>(null);
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
              {sortedRows.map(row => (
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
                        className={`inline-flex px-2 py-0.5 rounded text-xs ${STATUS_STYLES[row.status]}`}
                      >
                        {STATUS_LABEL[row.status]}
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

                  {row.status === "failed" && row.error && (
                    <p className="mt-1 text-xs text-red-700">{row.error}</p>
                  )}

                  {row.translatedPrompt && expandedIds.has(row.id) && (
                    <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-white px-2 py-2 text-xs text-neutral-800 custom-scrollbar border border-border-light select-all">
                      {row.translatedPrompt}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PromptTranslationsSection;
