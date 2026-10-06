import { FC, KeyboardEvent, useEffect, useId, useRef } from "react";

import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HELPLINE_LIMITS } from "@constants/helpline";

interface TalkerComposerProps {
  value: string;
  onChange: (value: string) => void;
  /** Return true when the message was accepted for sending (the box then clears). */
  onSend: (value: string) => boolean;
  onTyping?: () => void;
  disabled?: boolean;
  hint?: string;
}

const MAX_HEIGHT_PX = 160;

/**
 * Enter sends, Shift+Enter is a new line — except while an input method is
 * composing (Hindi, Marathi, Tamil and Kannada keyboards commit a word with
 * Enter), when Enter must be left to the IME. The counter appears only near the
 * 2,000-character limit. The draft is owned by the page, so it survives the
 * waiting → chat transition and a dropped connection.
 */
export const TalkerComposer: FC<TalkerComposerProps> = ({
  value,
  onChange,
  onSend,
  onTyping,
  disabled,
  hint,
}) => {
  const { t } = useTranslation();
  const id = useId();
  const hintId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const trimmedLength = value.trim().length;
  const remaining = HELPLINE_LIMITS.MESSAGE_MAX - value.length;
  const canSend = !disabled && trimmedLength > 0 && trimmedLength <= HELPLINE_LIMITS.MESSAGE_MAX;

  const send = () => {
    if (!canSend) return;
    if (onSend(value)) onChange("");
    textareaRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    // keyCode 229 is how some Android keyboards report an in-progress composition.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    send();
  };

  return (
    <div className="border-t border-border-light bg-white">
      <div className="mx-auto max-w-2xl px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
        {hint && (
          <p id={hintId} className="mb-2 font-primary text-sm text-typography-700">
            {hint}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor={id} className="sr-only">
            {t("helplineTalker.chat.composerLabel")}
          </label>
          <textarea
            id={id}
            ref={textareaRef}
            rows={1}
            value={value}
            maxLength={HELPLINE_LIMITS.MESSAGE_MAX}
            disabled={disabled}
            placeholder={t("helplineTalker.chat.composerPlaceholder")}
            aria-describedby={hint ? hintId : undefined}
            onChange={event => {
              onChange(event.target.value);
              onTyping?.();
            }}
            onKeyDown={onKeyDown}
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-border-medium bg-white px-4 py-2.5 font-primary text-base text-typography-900 placeholder:text-typography-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:bg-background-secondary"
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label={t("helplineTalker.chat.send")}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Send aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {value.length >= HELPLINE_LIMITS.MESSAGE_COUNTER_FROM && (
          <p
            className={`mt-1 text-right font-primary text-xs ${remaining <= 0 ? "text-destructive-700" : "text-typography-700"}`}
            aria-live="polite"
          >
            {t("helplineTalker.chat.charactersLeft", { count: Math.max(0, remaining) })}
          </p>
        )}
      </div>
    </div>
  );
};
