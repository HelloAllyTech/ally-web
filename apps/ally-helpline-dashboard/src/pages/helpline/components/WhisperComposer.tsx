import { FC, KeyboardEvent, useState } from "react";

import { MessageSquareLock, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { HELPLINE_LIMITS } from "@constants/helpline";

export const WHISPER_COMPOSER_ID = "helpline-whisper-composer";

interface WhisperComposerProps {
  listenerName: string;
  /** Resolves true when the server accepted it; the draft is kept otherwise. */
  onSend: (content: string) => Promise<boolean>;
}

/**
 * Where a monitoring supervisor's reply box would be: a whisper to the
 * listener, which only staff ever see. Styled apart from the listener's own
 * composer (lock icon, tinted) so nobody mistakes it for writing to the talker.
 * Short by intent — a listener mid-conversation reads it between turns, and
 * too many interruptions distract both of them ("Live Observation Variations
 * and Supervisor Presence").
 */
export const WhisperComposer: FC<WhisperComposerProps> = ({ listenerName, onSend }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const trimmed = value.trim();
  const canSend = !sending && trimmed.length > 0 && trimmed.length <= HELPLINE_LIMITS.WHISPER_MAX;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    const ok = await onSend(trimmed);
    setSending(false);
    if (ok) setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    void send();
  };

  return (
    <div
      className="border-t border-border-light bg-status-mauveBg px-4 py-3"
      data-testid="whisper-composer"
    >
      <p className="mb-2 inline-flex items-center gap-1.5 font-primary text-xs font-medium text-status-mauveFg">
        <MessageSquareLock aria-hidden="true" className="h-3.5 w-3.5" />
        {t("helplineWorkspace.whisper.hint", { name: listenerName })}
      </p>
      <label htmlFor={WHISPER_COMPOSER_ID} className="sr-only">
        {t("helplineWorkspace.whisper.label", { name: listenerName })}
      </label>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-border-medium bg-white px-3 pb-1 pt-3 focus-within:ring-2 focus-within:ring-primary-500">
          <AutoExpandableTextarea
            id={WHISPER_COMPOSER_ID}
            value={value}
            onChange={next => setValue(next.slice(0, HELPLINE_LIMITS.WHISPER_MAX))}
            onKeyDown={onKeyDown}
            placeholder={t("helplineWorkspace.whisper.placeholder", { name: listenerName })}
            minHeight={28}
            maxLines={5}
          />
        </div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          aria-label={t("helplineWorkspace.whisper.send")}
          title={t("helplineWorkspace.whisper.send")}
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-typography-900 text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <Send aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
