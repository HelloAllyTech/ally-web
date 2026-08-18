"use client";

// Stateful form, so client-only — and exported from the ui-shared barrel that
// `apps/ally-web`'s server components import, which makes the directive
// required rather than optional. See ArtifactLabelPalette for the same note.

import { FC, useState } from "react";

import {
  Button,
  ComposedModal,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextArea,
} from "../../primitives";

/**
 * Matches ally-be's `ROADMAP_LIMITS.DESCRIPTION_MAX` (src/product-roadmap/constants/
 * product-roadmap.constants.ts) — the backend rejects anything longer, so the form must
 * never let a user type past the point where submit would 400.
 */
export const BUG_REPORT_DESCRIPTION_MAX = 1000;

export interface BugReportFormLabels {
  title: string;
  prompt: string;
  placeholder: string;
  submit: string;
  submitting: string;
  cancel: string;
  rateLimitedError: string;
  genericError: string;
}

export const DEFAULT_BUG_REPORT_LABELS: BugReportFormLabels = {
  title: "Report a problem",
  prompt: "What were you trying to do?",
  placeholder: "Describe what you were doing when the problem happened",
  submit: "Send report",
  submitting: "Sending…",
  cancel: "Cancel",
  rateLimitedError: "You've submitted a few reports recently — please try again in a bit.",
  genericError: "Something went wrong sending that. Please try again.",
};

/**
 * Thrown (or rejected with) by the caller's `onSubmit` to distinguish a 429 from any other
 * failure, without this component knowing anything about the caller's API client.
 */
export interface BugReportSubmitError {
  rateLimited?: boolean;
}

const isRateLimited = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as BugReportSubmitError).rateLimited === true;

export interface BugReportFormProps {
  open: boolean;
  /** Dismiss with no side effect — backdrop click, close icon, Cancel. */
  onClose: () => void;
  /**
   * Performs the actual network call. Resolves on success. On failure, reject with a
   * `BugReportSubmitError` (or anything with `rateLimited: true`) so a 429 gets its own
   * message instead of the generic one.
   */
  onSubmit: (description: string) => Promise<void>;
  /**
   * Called once `onSubmit` resolves. The caller owns what "one-time confirmation" looks
   * like in its own app (toast, snackbar, inline banner) and is expected to close the form
   * from here — this component does not show its own success state or close itself, so
   * there is exactly one place per app that decides what a submitted report looks like.
   */
  onSuccess: () => void;
  /** Defaults to `BUG_REPORT_DESCRIPTION_MAX`, mirroring the backend limit. */
  maxLength?: number;
  /** Override any subset of the copy — e.g. to route it through the app's own i18n. */
  labels?: Partial<BugReportFormLabels>;
}

/**
 * The "Report a problem" form shared by every consumer-facing app.
 *
 * Deliberately just one field: a guided free-text prompt, no severity/category picker, no
 * attachments. `context` (screen, device, os, app version, timestamp) is captured entirely
 * by the caller and is never shown here — the user is never asked to confirm metadata they
 * didn't type. See ally-be's `POST /v1/product-roadmap/bug-reports` for the contract this
 * feeds.
 */
export const BugReportForm: FC<BugReportFormProps> = ({
  open,
  onClose,
  onSubmit,
  onSuccess,
  maxLength = BUG_REPORT_DESCRIPTION_MAX,
  labels: labelOverrides,
}) => {
  const labels = { ...DEFAULT_BUG_REPORT_LABELS, ...labelOverrides };
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = description.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= maxLength && !submitting;

  const handleClose = () => {
    if (submitting) return;
    setDescription("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setDescription("");
      onSuccess();
    } catch (err) {
      setError(isRateLimited(err) ? labels.rateLimitedError : labels.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ComposedModal open={open} onClose={handleClose} size="sm">
      <ModalHeader title={labels.title} />
      <ModalBody>
        <TextArea
          id="bug-report-description"
          labelText={labels.prompt}
          placeholder={labels.placeholder}
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxCount={maxLength}
          enableCounter
          rows={5}
          disabled={submitting}
        />
        {error && (
          <InlineNotification
            kind="error"
            title={error}
            hideCloseButton
            lowContrast
            className="mt-3"
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={handleClose} disabled={submitting}>
          {labels.cancel}
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? <InlineLoading description={labels.submitting} /> : labels.submit}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
