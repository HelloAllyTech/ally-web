import { FC, KeyboardEvent } from "react";

import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { HELPLINE_LIMITS } from "@constants/helpline";

export const STAFF_COMPOSER_ID = "helpline-staff-composer";

interface StaffComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onTyping: () => void;
  /** Why the listener can't reply right now; the box is disabled and says so. */
  disabledReason: string | null;
}

/** Enter sends (not mid-IME-composition), Shift+Enter is a new line. */
export const StaffComposer: FC<StaffComposerProps> = ({
  value,
  onChange,
  onSend,
  onTyping,
  disabledReason,
}) => {
  const { t } = useTranslation();
  const disabled = Boolean(disabledReason);
  const trimmed = value.trim();
  const canSend = !disabled && trimmed.length > 0 && trimmed.length <= HELPLINE_LIMITS.MESSAGE_MAX;
  const remaining = HELPLINE_LIMITS.MESSAGE_MAX - value.length;

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (canSend) onSend();
  };

  if (disabledReason) {
    return (
      <div
        className="border-t border-border-light bg-background-secondary px-4 py-3"
        data-testid="composer-disabled"
      >
        <p className="font-primary text-sm text-typography-800">{disabledReason}</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border-light bg-white px-4 py-3">
      <label htmlFor={STAFF_COMPOSER_ID} className="sr-only">
        {t("helplineWorkspace.chat.composerLabel")}
      </label>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-border-medium px-3 pb-1 pt-3 focus-within:ring-2 focus-within:ring-primary-500">
          <AutoExpandableTextarea
            id={STAFF_COMPOSER_ID}
            value={value}
            onChange={next => {
              onChange(next.slice(0, HELPLINE_LIMITS.MESSAGE_MAX));
              onTyping();
            }}
            onKeyDown={onKeyDown}
            placeholder={t("helplineWorkspace.chat.composerPlaceholder")}
            minHeight={28}
            maxLines={8}
          />
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label={t("helplineWorkspace.chat.send")}
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Send aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      {value.length >= HELPLINE_LIMITS.MESSAGE_COUNTER_FROM && (
        <p
          className={`mt-1 text-right font-primary text-xs ${remaining <= 0 ? "text-destructive-700" : "text-typography-700"}`}
        >
          {t("helplineWorkspace.chat.charactersLeft", { count: Math.max(0, remaining) })}
        </p>
      )}
    </div>
  );
};
