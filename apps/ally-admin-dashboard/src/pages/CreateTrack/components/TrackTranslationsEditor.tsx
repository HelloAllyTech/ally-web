import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useGetTrackTranslationQuery,
  useGetTrackTranslationsQuery,
  usePublishTrackTranslationMutation,
  useReviewTrackTranslationMutation,
  useSetTrackLanguagesMutation,
  useSetTrackTranslationMediaMutation,
  useTranslateTrackMutation,
  useUnpublishTrackTranslationMutation,
  useUpdateTrackTranslationFieldsMutation,
} from "@api";
import { TooltipIcon, WarningAlt } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { useTrackTranslationsSocket } from "@hooks";
import {
  TrackItemType,
  TrackTranslationField,
  TrackTranslationFallbackReason,
  TrackTranslationFieldEdit,
  TrackTranslationJobStatus,
  TrackTranslationProgress,
  TrackTranslationStatus,
  TrackTranslationSummary,
} from "@types";

const SOURCE_LANGUAGE_CODE = "en";

const STATUS_LABEL: Record<TrackTranslationStatus, string> = {
  [TrackTranslationStatus.NOT_STARTED]: "Not started",
  [TrackTranslationStatus.TRANSLATING]: "Translating…",
  [TrackTranslationStatus.READY_FOR_REVIEW]: "In review",
  [TrackTranslationStatus.PUBLISHED]: "Published",
  [TrackTranslationStatus.FAILED]: "Failed",
};

const STATUS_CLASS: Record<TrackTranslationStatus, string> = {
  [TrackTranslationStatus.NOT_STARTED]: "bg-neutral-100 text-typography-600",
  [TrackTranslationStatus.TRANSLATING]: "bg-primary-50 text-primary-700",
  [TrackTranslationStatus.READY_FOR_REVIEW]: "bg-warning-50 text-warning-700",
  [TrackTranslationStatus.PUBLISHED]: "bg-success-50 text-success-700",
  [TrackTranslationStatus.FAILED]: "bg-destructive-50 text-destructive-700",
};

const FALLBACK_LABEL: Record<TrackTranslationFallbackReason, string> = {
  [TrackTranslationFallbackReason.VIDEO_NOT_LOCALISED]:
    "Video plays in English — add a dubbed URL below to change that",
  [TrackTranslationFallbackReason.SCENARIO_NOT_TRANSLATED]:
    "Roleplay runs in English — translate the linked simulation to change that",
  [TrackTranslationFallbackReason.CASE_NOT_TRANSLATED]: "Cases are English-only for now",
};

/** Human label for a field's `kind`, so a trainer knows what they are editing. */
const KIND_LABEL: Record<string, string> = {
  TITLE: "Title",
  DESCRIPTION: "Description",
  HTML: "Article body",
  PROSE: "Text",
  LABEL: "Option",
  SHORT_ANSWER: "Marking key",
  RUBRIC: "Grading rubric",
  SPEAKER: "Speaker",
  BLANK_TEMPLATE: "Fill-in sentence",
};

const labelClass = "text-sm font-medium text-typography-800";
const inputClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400";

interface TrackTranslationsEditorProps {
  /** Null before the course has been saved once — there is nothing to translate. */
  trackId: string | null;
  /** True when the form has edits the trainer has not saved yet. */
  isDirty: boolean;
}

/**
 * "Languages" panel of the course builder.
 *
 * Two halves: pick the languages the course should be available in and watch
 * them translate, then switch the editor into any one of them to read the AI
 * output and correct it.
 *
 * The publish gate is the reason this screen exists. Machine translation is
 * good enough to draft a course and not good enough to grade one unreviewed, so
 * a language cannot go live until every field that feeds scoring has been
 * confirmed by a human.
 */
export const TrackTranslationsEditor: FC<TrackTranslationsEditorProps> = ({ trackId, isDirty }) => {
  const [editingLanguageId, setEditingLanguageId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<TrackTranslationProgress | null>(null);

  const { data, isFetching, refetch } = useGetTrackTranslationsQuery(trackId ?? "", {
    skip: !trackId,
  });

  const { data: detail, isFetching: isFetchingDetail } = useGetTrackTranslationQuery(
    { id: trackId ?? "", languageId: editingLanguageId ?? 0 },
    { skip: !trackId || editingLanguageId === null },
  );

  const [setLanguages, { isLoading: isSavingLanguages }] = useSetTrackLanguagesMutation();
  const [translateTrack, { isLoading: isStartingRun }] = useTranslateTrackMutation();
  const [updateFields, { isLoading: isSavingFields }] = useUpdateTrackTranslationFieldsMutation();
  const [reviewTranslation] = useReviewTrackTranslationMutation();
  const [setMedia] = useSetTrackTranslationMediaMutation();
  const [publish] = usePublishTrackTranslationMutation();
  const [unpublish] = useUnpublishTrackTranslationMutation();

  /* --------------------------- Live progress ---------------------------- */

  const handleProgress = useCallback(
    (payload: TrackTranslationProgress) => {
      if (payload.trackId !== trackId) return;
      setProgress(payload);
      // Refetch on the terminal events so statuses and counts settle without
      // the trainer reloading.
      if (
        payload.status === TrackTranslationJobStatus.COMPLETED ||
        payload.status === TrackTranslationJobStatus.FAILED ||
        payload.status === TrackTranslationJobStatus.LANGUAGE_COMPLETED
      ) {
        void refetch();
      }
    },
    [trackId, refetch],
  );

  useTrackTranslationsSocket({ onProgress: handleProgress });

  // A language switch discards nothing — drafts are per-language.
  useEffect(() => setDrafts({}), [editingLanguageId]);

  const summaries = data?.languages ?? [];
  const selectedIds = useMemo(
    () => new Set(summaries.map(summary => summary.languageId)),
    [summaries],
  );

  /* ---------------------------- Language set ---------------------------- */

  const handleToggleLanguage = async (languageId: number) => {
    if (!trackId) return;
    const next = new Set(selectedIds);
    if (next.has(languageId)) next.delete(languageId);
    else next.add(languageId);

    try {
      await setLanguages({ id: trackId, languageIds: [...next] }).unwrap();
      if (editingLanguageId === languageId && !next.has(languageId)) {
        setEditingLanguageId(null);
      }
    } catch (error) {
      // The backend refuses to remove a published language — surface its reason
      // verbatim rather than a generic failure.
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not update the course languages.";
      toast.error(message);
    }
  };

  const handleTranslate = async (languageId?: number) => {
    if (!trackId) return;
    try {
      await translateTrack({
        id: trackId,
        ...(languageId ? { languageIds: [languageId] } : {}),
      }).unwrap();
      toast.success("Translation started — you can keep working while it runs.");
    } catch {
      toast.error("Could not start translation.");
    }
  };

  const handlePublish = async (summary: TrackTranslationSummary) => {
    if (!trackId) return;
    try {
      await publish({ id: trackId, languageId: summary.languageId }).unwrap();
      toast.success(`${summary.languageLabel} is now available to learners.`);
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not publish this language.";
      toast.error(message);
    }
  };

  const handleUnpublish = async (summary: TrackTranslationSummary) => {
    if (!trackId) return;
    await unpublish({ id: trackId, languageId: summary.languageId });
    toast.success(`${summary.languageLabel} is no longer offered — learners see English.`);
  };

  /* ------------------------------- Editing ------------------------------ */

  const draftKey = (scope: string, entityId: string, path: string) =>
    `${scope}|${entityId}|${path}`;

  const handleDraftChange = (scope: string, entityId: string, path: string, value: string) => {
    setDrafts(previous => ({ ...previous, [draftKey(scope, entityId, path)]: value }));
  };

  const handleSaveDrafts = async () => {
    if (!trackId || editingLanguageId === null) return;
    const edits: TrackTranslationFieldEdit[] = Object.entries(drafts).map(([key, value]) => {
      const [scope, entityId, ...rest] = key.split("|");
      return {
        scope: scope as TrackTranslationFieldEdit["scope"],
        ...(entityId ? { entityId } : {}),
        path: rest.join("|"),
        value,
      };
    });
    if (!edits.length) return;

    try {
      await updateFields({ id: trackId, languageId: editingLanguageId, edits }).unwrap();
      setDrafts({});
      toast.success(`Saved ${edits.length} correction${edits.length === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Could not save your corrections.");
    }
  };

  const handleConfirmAll = async () => {
    if (!trackId || editingLanguageId === null) return;
    const result = await reviewTranslation({
      id: trackId,
      languageId: editingLanguageId,
    }).unwrap();
    toast.success(`Confirmed ${result.reviewed} field${result.reviewed === 1 ? "" : "s"}.`);
  };

  const handleMediaChange = async (trackItemId: string, url: string) => {
    if (!trackId || editingLanguageId === null) return;
    await setMedia({
      id: trackId,
      languageId: editingLanguageId,
      trackItemId,
      url: url.trim() || null,
    });
  };

  /* -------------------------------- Render ------------------------------ */

  if (!trackId) {
    return (
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-typography-900">Languages</h2>
        <p className="mt-2 text-sm text-typography-600">
          Save this course as a draft first. Translation works from the saved English content, so
          there is nothing to translate yet.
        </p>
      </div>
    );
  }

  const editingSummary = summaries.find(summary => summary.languageId === editingLanguageId);
  const draftCount = Object.keys(drafts).length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-semibold text-typography-900">Languages</h2>
          <Tooltip
            label="You author in English. Ally translates into each language you pick here, then you review and publish it. Learners choose from the published languages."
            align="bottom"
          >
            <button type="button" className="cursor-pointer inline-flex items-center">
              <TooltipIcon />
            </button>
          </Tooltip>
        </div>
        <p className="mt-1 text-sm text-typography-600">
          English is always available. Pick the other languages this course should be offered in —
          each one starts translating as soon as you add it.
        </p>
      </div>

      {isDirty && (
        <div className="flex gap-2 rounded-md border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800">
          <WarningAlt className="w-4 h-4 flex-shrink-0 mt-0.5" />
          You have unsaved changes to the English content. Save the course first — translation works
          from the saved version.
        </div>
      )}

      {/* ------------------------- Language picker ------------------------ */}
      <div className="flex flex-wrap gap-2">
        {(data?.availableLanguages ?? []).map(language => {
          const isSelected = selectedIds.has(language.languageId);
          return (
            <button
              key={language.languageId}
              type="button"
              disabled={isSavingLanguages || isFetching}
              onClick={() => handleToggleLanguage(language.languageId)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                isSelected
                  ? "border-primary-400 bg-primary-50 text-primary-700"
                  : "border-border-light text-typography-600 hover:border-primary-300"
              }`}
            >
              {language.label}
            </button>
          );
        })}
      </div>

      {/* --------------------------- Live progress ----------------------- */}
      {progress && progress.status !== TrackTranslationJobStatus.COMPLETED && (
        <div className="rounded-md border border-primary-200 bg-primary-50 p-3 text-xs text-primary-800">
          {progress.language ? `${progress.language}: ` : ""}
          {progress.fieldsTotal
            ? `translated ${progress.fieldsCompleted ?? 0} of ${progress.fieldsTotal} fields`
            : STATUS_LABEL[TrackTranslationStatus.TRANSLATING]}
          {progress.total > 1 && ` · language ${progress.completed} of ${progress.total}`}
          {progress.error && <span className="text-destructive-700"> — {progress.error}</span>}
        </div>
      )}

      {/* ------------------------- Per-language rows --------------------- */}
      {summaries.length > 0 && (
        <div className="flex flex-col divide-y divide-border-light rounded-md border border-border-light">
          {summaries.map(summary => (
            <div key={summary.languageId} className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-typography-900">
                  {summary.languageLabel}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_CLASS[summary.status]}`}
                >
                  {STATUS_LABEL[summary.status]}
                </span>
                <span className="text-xs text-typography-500">
                  {summary.translatedFields}/{summary.totalFields} translated
                </span>
                {summary.pendingScoringReview > 0 && (
                  <span className="text-xs text-warning-700">
                    {summary.pendingScoringReview} graded field
                    {summary.pendingScoringReview === 1 ? "" : "s"} to confirm
                  </span>
                )}
                {summary.sourceChanged > 0 && (
                  <span className="text-xs text-destructive-700">
                    {summary.sourceChanged} out of date
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    className="!h-9 !px-3 text-sm"
                    onClick={() => setEditingLanguageId(summary.languageId)}
                    disabled={summary.translatedFields === 0}
                  >
                    Review
                  </Button>
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    className="!h-9 !px-3 text-sm"
                    onClick={() => handleTranslate(summary.languageId)}
                    disabled={
                      isStartingRun || summary.status === TrackTranslationStatus.TRANSLATING
                    }
                  >
                    Re-translate
                  </Button>
                  {summary.status === TrackTranslationStatus.PUBLISHED ? (
                    <Button
                      variant={ButtonVariant.SECONDARY}
                      className="!h-9 !px-3 text-sm"
                      onClick={() => handleUnpublish(summary)}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Tooltip
                      label={summary.blockedReason ?? "Make this language available to learners"}
                      align="bottom"
                    >
                      {/* The tooltip carries the blocked reason, so a disabled
                          Publish always explains itself. */}
                      <span className="inline-flex">
                        <Button
                          variant={ButtonVariant.PRIMARY}
                          className="!h-9 !px-3 text-sm"
                          onClick={() => handlePublish(summary)}
                          disabled={!summary.canPublish}
                        >
                          Publish
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>

              {summary.error && <p className="text-xs text-destructive-700">{summary.error}</p>}

              {summary.fallbackItems.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {summary.fallbackItems.map(fallback => (
                    <li
                      key={`${fallback.trackItemId}-${fallback.reason}`}
                      className="text-xs text-typography-500"
                    >
                      {fallback.itemTitle} — {FALLBACK_LABEL[fallback.reason]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------- The editor ------------------------- */}
      {summaries.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-border-light pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className={labelClass} htmlFor="translation-language">
              Editing in
            </label>
            <select
              id="translation-language"
              className={`${inputClass} w-auto`}
              value={editingLanguageId ?? SOURCE_LANGUAGE_CODE}
              onChange={event =>
                setEditingLanguageId(
                  event.target.value === SOURCE_LANGUAGE_CODE ? null : Number(event.target.value),
                )
              }
            >
              <option value={SOURCE_LANGUAGE_CODE}>English (source)</option>
              {summaries.map(summary => (
                <option key={summary.languageId} value={summary.languageId}>
                  {summary.languageLabel}
                </option>
              ))}
            </select>

            {editingLanguageId !== null && (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant={ButtonVariant.SECONDARY}
                  className="!h-9 !px-3 text-sm"
                  onClick={handleConfirmAll}
                  disabled={!editingSummary?.pendingScoringReview}
                >
                  Confirm all as-is
                </Button>
                <Button
                  variant={ButtonVariant.PRIMARY}
                  className="!h-9 !px-3 text-sm"
                  onClick={handleSaveDrafts}
                  disabled={!draftCount || isSavingFields}
                >
                  {draftCount
                    ? `Save ${draftCount} correction${draftCount === 1 ? "" : "s"}`
                    : "Save"}
                </Button>
              </div>
            )}
          </div>

          {editingLanguageId === null ? (
            <p className="text-sm text-typography-600">
              Switch the dropdown to a language to read what Ally produced and correct anything that
              reads wrong. Your corrections are never overwritten by a later translation run.
            </p>
          ) : isFetchingDetail ? (
            <p className="text-sm text-typography-500">Loading {detail?.label ?? "translation"}…</p>
          ) : (
            <div className="flex flex-col gap-6">
              <FieldGroup
                heading="Course"
                scope="track"
                entityId={detail?.track.id ?? ""}
                fields={detail?.track.fields ?? []}
                drafts={drafts}
                onChange={handleDraftChange}
              />

              {(detail?.sections ?? []).map((section, sectionIndex) => (
                <div key={section.id} className="flex flex-col gap-4">
                  <FieldGroup
                    heading={`Section ${sectionIndex + 1}`}
                    scope="section"
                    entityId={section.id}
                    fields={section.fields}
                    drafts={drafts}
                    onChange={handleDraftChange}
                  />
                  {section.items.map((item, itemIndex) => (
                    <div key={item.id} className="ml-4 flex flex-col gap-2">
                      <FieldGroup
                        heading={`${sectionIndex + 1}.${itemIndex + 1} · ${item.type}`}
                        scope="item"
                        entityId={item.id}
                        fields={item.fields}
                        drafts={drafts}
                        onChange={handleDraftChange}
                      />
                      {item.type === TrackItemType.VIDEO && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-typography-600">
                            Localised video URL (optional — blank means learners see the English
                            cut)
                          </label>
                          <input
                            className={inputClass}
                            defaultValue={item.media?.url ?? ""}
                            placeholder="https://…"
                            onBlur={event => handleMediaChange(item.id, event.target.value)}
                          />
                        </div>
                      )}
                      {item.deferredTo && (
                        <p className="text-xs text-typography-500">
                          This component's content is translated with the linked{" "}
                          {item.deferredTo.kind === "SCENARIO" ? "simulation" : "case"}, not here.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface FieldGroupProps {
  heading: string;
  scope: "track" | "section" | "item";
  entityId: string;
  fields: TrackTranslationField[];
  drafts: Record<string, string>;
  onChange: (scope: string, entityId: string, path: string, value: string) => void;
}

/** English on the left, the editable translation on the right. */
const FieldGroup: FC<FieldGroupProps> = ({
  heading,
  scope,
  entityId,
  fields,
  drafts,
  onChange,
}) => {
  if (!fields.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-typography-800">{heading}</h3>
      <div className="flex flex-col divide-y divide-border-light rounded-md border border-border-light">
        {fields.map(field => {
          const key = `${scope}|${entityId}|${field.path}`;
          const value = drafts[key] ?? field.translated ?? "";
          return (
            <div key={field.path} className="grid grid-cols-2 gap-3 p-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-typography-500">
                    {KIND_LABEL[field.kind] ?? field.kind}
                  </span>
                  {field.scoring && (
                    <Tooltip
                      label="This text decides what counts as a correct answer. It must be confirmed before this language can be published."
                      align="bottom"
                    >
                      <span className="rounded-full bg-warning-50 px-1.5 py-0.5 text-[10px] text-warning-700">
                        affects scoring
                      </span>
                    </Tooltip>
                  )}
                  {field.needsReview && (
                    <span className="rounded-full bg-warning-100 px-1.5 py-0.5 text-[10px] text-warning-800">
                      needs confirming
                    </span>
                  )}
                  {field.edited && (
                    <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] text-primary-700">
                      your wording
                    </span>
                  )}
                  {field.sourceChanged && (
                    <Tooltip
                      label="The English changed after this was written. Your wording was kept — check it still matches."
                      align="bottom"
                    >
                      <span className="rounded-full bg-destructive-50 px-1.5 py-0.5 text-[10px] text-destructive-700">
                        English changed
                      </span>
                    </Tooltip>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-xs text-typography-600">{field.english}</p>
              </div>
              <textarea
                className={`${inputClass} min-h-[64px] resize-y`}
                value={value}
                placeholder="Not translated yet"
                onChange={event => onChange(scope, entityId, field.path, event.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
