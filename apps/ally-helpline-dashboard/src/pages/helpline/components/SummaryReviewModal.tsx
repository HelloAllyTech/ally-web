import { FC, useEffect, useId, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { HELPLINE_TIMINGS } from "@constants/helpline";
import type { ListenerSettingsDto, SummaryDto } from "@types";

interface SummaryReviewModalProps {
  open: boolean;
  fields: ListenerSettingsDto["summaryFields"];
  /** The FINAL summary from the cache; arrives over SUMMARY_UPDATED a few seconds after the end. */
  finalSummary: SummaryDto | null;
  saving: boolean;
  onSave: (fields: Record<string, string>) => void;
  onSkip: () => void;
  /** Asked once, halfway through the wait, in case the socket event was missed. */
  onRefetch?: () => void;
}

const emptyFields = (fields: ListenerSettingsDto["summaryFields"]) =>
  Object.fromEntries(fields.map(field => [field.key, ""]));

/**
 * After a chat ends: the FINAL summary the copilot drafted, one editable box
 * per org summary field. Until the draft arrives it says so (a skeleton, at
 * most ~20 s), then offers empty fields — a slow model must never trap the
 * listener here. "Skip for now" is always available.
 */
export const SummaryReviewModal: FC<SummaryReviewModalProps> = ({
  open,
  fields,
  finalSummary,
  saving,
  onSave,
  onSkip,
  onRefetch,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const [values, setValues] = useState<Record<string, string>>(() => emptyFields(fields));
  const [timedOut, setTimedOut] = useState(false);
  const [touched, setTouched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const drafting = !finalSummary && !timedOut;

  useEffect(() => {
    if (!open) return undefined;
    setTimedOut(false);
    setTouched(false);
    panelRef.current?.focus();
    const refetchTimer = setTimeout(
      () => onRefetch?.(),
      HELPLINE_TIMINGS.FINAL_SUMMARY_WAIT_MS / 2,
    );
    const timeoutTimer = setTimeout(
      () => setTimedOut(true),
      HELPLINE_TIMINGS.FINAL_SUMMARY_WAIT_MS,
    );
    return () => {
      clearTimeout(refetchTimer);
      clearTimeout(timeoutTimer);
    };
    // onRefetch is a fresh closure each render; the timers belong to this opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fill from the draft when it lands — unless the listener has started typing.
  useEffect(() => {
    if (!open || touched) return;
    setValues({ ...emptyFields(fields), ...(finalSummary?.fields ?? {}) });
  }, [open, finalSummary, fields, touched]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={event => {
        if (event.key === "Escape" && !saving) onSkip();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ph-no-capture flex max-h-[90dvh] w-full max-w-xl flex-col rounded-2xl bg-white font-primary shadow-lg focus:outline-none"
        data-testid="summary-review"
      >
        <div className="border-b border-border-light p-5">
          <h2 id={titleId} className="text-xl font-medium text-typography-900">
            {t("helplineWorkspace.summary.title")}
          </h2>
          <p className="mt-1 text-sm text-typography-800">{t("helplineWorkspace.summary.intro")}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {fields.length === 0 ? (
            <p className="text-sm text-typography-700">{t("helplineWorkspace.summary.noFields")}</p>
          ) : drafting ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-4"
              data-testid="summary-drafting"
            >
              <p className="text-sm text-typography-700">
                {t("helplineWorkspace.summary.drafting")}
              </p>
              {fields.map(field => (
                <div key={field.key} className="flex flex-col gap-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-background-tertiary" />
                  <div className="h-16 animate-pulse rounded-lg bg-background-secondary" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {!finalSummary && (
                <p className="rounded-lg bg-background-secondary p-2 text-sm text-typography-800">
                  {t("helplineWorkspace.summary.draftTimeout")}
                </p>
              )}
              {fields.map(field => {
                const id = `summary-field-${field.key}`;
                return (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label htmlFor={id} className="text-sm font-medium text-typography-900">
                      {field.label}
                    </label>
                    {field.description && (
                      <p id={`${id}-hint`} className="text-xs text-typography-700">
                        {field.description}
                      </p>
                    )}
                    <textarea
                      id={id}
                      rows={3}
                      value={values[field.key] ?? ""}
                      aria-describedby={field.description ? `${id}-hint` : undefined}
                      onChange={event => {
                        setTouched(true);
                        setValues(current => ({ ...current, [field.key]: event.target.value }));
                      }}
                      className="rounded-lg border border-border-medium px-3 py-2 text-sm text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border-light p-4">
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="min-h-[40px] rounded-full border border-border-medium px-4 text-sm text-typography-900 hover:bg-background-secondary disabled:opacity-60"
          >
            {t("helplineWorkspace.summary.skip")}
          </button>
          <button
            type="button"
            onClick={() => onSave(values)}
            disabled={saving || drafting || fields.length === 0}
            className="min-h-[40px] rounded-full bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? t("helplineWorkspace.summary.saving") : t("helplineWorkspace.summary.save")}
          </button>
        </div>
      </div>
    </div>
  );
};
