import { FC, useId, useState } from "react";

import { useTranslation } from "react-i18next";

interface PostInputProps {
  maxLength: number;
  placeholder: string;
  /** Accessible name for the textarea. */
  ariaLabel: string;
  submitLabel: string;
  isSubmitting?: boolean;
  initialValue?: string;
  autoFocus?: boolean;
  rows?: number;
  /** Resolve `true` on success — the input then clears (or the caller unmounts it). */
  onSubmit: (content: string) => Promise<boolean>;
  onCancel?: () => void;
}

/**
 * Plain-text composer used for new posts, replies and inline edits. A
 * character counter tracks `maxLength`; submit is disabled when the text is
 * blank or over the limit.
 */
export const PostInput: FC<PostInputProps> = ({
  maxLength,
  placeholder,
  ariaLabel,
  submitLabel,
  isSubmitting = false,
  initialValue = "",
  autoFocus = false,
  rows = 3,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const counterId = useId();
  const [value, setValue] = useState(initialValue);

  const isOverLimit = value.length > maxLength;
  const canSubmit = value.trim().length > 0 && !isOverLimit && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const ok = await onSubmit(value.trim());
    if (ok) setValue("");
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        aria-label={ariaLabel}
        aria-describedby={counterId}
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className="w-full resize-y rounded-[12px] border border-border-light bg-white px-3 py-2 text-sm text-typography-800 outline-none focus:border-primary-400"
      />
      <div className="flex items-center justify-between gap-3">
        <span
          id={counterId}
          aria-live="polite"
          className={`text-xs ${isOverLimit ? "text-destructive-500" : "text-typography-500"}`}
        >
          {t("tracks2.discussion.charCount", { count: value.length, max: maxLength })}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-typography-700 hover:bg-neutral-100"
            >
              {t("tracks2.discussion.cancel")}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-full bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
