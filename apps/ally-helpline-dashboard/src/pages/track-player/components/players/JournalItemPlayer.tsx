import { FC, useCallback, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSaveJournalDraftMutation, useSubmitJournalMutation } from "@api";
import { Cloud, RoundCheckmark, CrossRedBackground, TickGreenBackground } from "@assets";
import { useDebounce } from "@hooks";
import { StartJournalItemPayload, TrackItemCompletionResult } from "@types";

interface JournalItemPlayerProps {
  payload: StartJournalItemPayload;
  alreadyCompleted: boolean;
  onCompleted: (result: TrackItemCompletionResult) => void;
}

const AUTOSAVE_DELAY = 1000;

/**
 * Journal item: one card per prompt with a debounced draft autosave (mirrors
 * the ReflectionTab pattern) and a Submit that completes the item once every
 * required prompt is answered.
 */
export const JournalItemPlayer: FC<JournalItemPlayerProps> = ({
  payload,
  alreadyCompleted,
  onCompleted,
}) => {
  const { t } = useTranslation();
  const { prompts, savedResponses } = payload;

  const initial = prompts.map(
    prompt => savedResponses.find(r => r.promptId === prompt.id)?.response ?? "",
  );
  const [responses, setResponses] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyCompleted);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  const [saveJournalDraft] = useSaveJournalDraftMutation();
  const [submitJournal, { isLoading: isSubmitting }] = useSubmitJournalMutation();

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      await saveJournalDraft({
        itemId: payload.trackItemProgressId,
        responses: prompts.map((prompt, i) => ({
          promptId: prompt.id,
          response: responsesRef.current[i] ?? "",
        })),
      }).unwrap();
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
    setSaving(false);
  }, [payload.trackItemProgressId, prompts, saveJournalDraft]);

  const debouncedPersist = useDebounce(persist, AUTOSAVE_DELAY);

  const updateResponse = (index: number, value: string) => {
    setResponses(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (!submitted) debouncedPersist();
  };

  const allRequiredAnswered = prompts.every(
    (prompt, i) => !prompt.required || (responses[i] ?? "").trim().length > 0,
  );

  const handleSubmit = async () => {
    if (!allRequiredAnswered || isSubmitting || submitted) return;
    try {
      await persist();
      const result = await submitJournal({ itemId: payload.trackItemProgressId }).unwrap();
      setSubmitted(true);
      onCompleted(result);
    } catch {
      toast.error(t("common.somethingWentWrong"));
    }
  };

  const renderAutosave = () => {
    if (submitted) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-success-800">
          <TickGreenBackground className="h-4 w-4" />
          {t("tracks2.journal.submitted")}
        </span>
      );
    }
    if (saving) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
          <Cloud />
          {t("tracks2.journal.saving")}
        </span>
      );
    }
    if (saveFailed) {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-destructive-500">
          <CrossRedBackground className="h-4 w-4" />
          {t("tracks2.journal.saveFailed")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-sm text-neutral-500">
        <RoundCheckmark color="#9CA3AF" />
        {t("tracks2.journal.saved")}
      </span>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <div className="flex justify-end">{renderAutosave()}</div>
          {prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className="rounded-[16px] border border-border-light bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="pt-1 text-base font-medium leading-relaxed text-typography-900">
                  {prompt.prompt}
                  {prompt.required && (
                    <span className="ml-1 text-xs font-normal text-destructive-500">
                      ({t("tracks2.journal.required")})
                    </span>
                  )}
                </p>
              </div>
              <textarea
                value={responses[index] ?? ""}
                onChange={e => updateResponse(index, e.target.value)}
                placeholder={prompt.placeholder ?? t("tracks2.journal.placeholder")}
                disabled={submitted}
                rows={4}
                className="w-full resize-y rounded-[10px] border border-border-light bg-neutral-50 px-3 py-2 text-base text-typography-900 outline-none transition-colors focus:border-primary-400 disabled:opacity-70"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-center border-t border-border-light bg-white px-4 py-3">
        {submitted ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-success-800">
            <TickGreenBackground className="h-4 w-4" />
            {t("tracks2.journal.submitted")}
          </span>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allRequiredAnswered || isSubmitting}
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
          >
            {t("tracks2.journal.submit")}
          </button>
        )}
      </div>
    </div>
  );
};
