"use client";

import { FC, FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Send } from "@carbon/icons-react";

import { TextChatTranslations } from "./types";
import { TEXT_CHAT_MAX_MESSAGE_LENGTH, TextChatMessage } from "./useTextChat";

// Show the remaining-characters hint only near the cap: a counter on every
// keystroke is noise in a conversation, but hitting a silent wall is worse.
const REMAINING_HINT_THRESHOLD = 200;
const COMPOSER_MAX_HEIGHT_PX = 140;
// How close to the bottom still counts as "following along" — within this, a
// new message scrolls into view; further up, the learner is re-reading and is
// left where they are.
const STICK_TO_BOTTOM_PX = 120;

export interface TextChatPanelProps {
  messages: TextChatMessage[];
  isClientTyping: boolean;
  onSend: (text: string) => void;
  onRetry: (id: string) => void;
  clientName?: string;
  clientAvatarUrl?: string | null;
  /** Session ending or reconnecting: nothing can be sent right now. */
  disabled?: boolean;
  translations?: TextChatTranslations;
}

const initialsOf = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("") || "?";

const TypingDots: FC = () => (
  <span aria-hidden className="flex items-center gap-1">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </span>
);

/**
 * The conversation surface of a text-chat roleplay: the client's messages on
 * the left, the learner's on the right, and a composer pinned underneath.
 * Everything else on the session screen (timer, sidebar, score, end session)
 * is the same as a voice call.
 */
export const TextChatPanel: FC<TextChatPanelProps> = ({
  messages,
  isClientTyping,
  onSend,
  onRetry,
  clientName,
  clientAvatarUrl,
  disabled = false,
  translations,
}) => {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);

  const t = {
    panelLabel: translations?.panelLabel ?? "Text chat",
    inChat: translations?.inChat ?? "In the chat",
    typing: translations?.typing ?? "typing…",
    emptyState:
      translations?.emptyState ?? "You're connected. Send a message to start the conversation.",
    inputLabel: translations?.inputLabel ?? "Your message",
    placeholder: translations?.placeholder ?? "Type a message…",
    send: translations?.send ?? "Send",
    notSent: translations?.notSent ?? "Not sent",
    retry: translations?.retry ?? "Retry",
    charactersLeft: translations?.charactersLeft ?? "characters left",
    you: translations?.you ?? "You",
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Follow the conversation unless the learner has scrolled up to re-read.
  // Their own message always brings them back down.
  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const last = messages[messages.length - 1];
    if (followingRef.current || last?.role === "learner") {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, isClientTyping]);

  const onScroll = () => {
    const log = logRef.current;
    if (!log) return;
    followingRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < STICK_TO_BOTTOM_PX;
  };

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: an IME (Hindi, Tamil, Kannada… keyboards) uses Enter to
    // confirm a word. Sending on that Enter would post half a word.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const remaining = TEXT_CHAT_MAX_MESSAGE_LENGTH - draft.length;

  return (
    <section
      data-testid="text-chat-panel"
      aria-label={t.panelLabel}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 font-['Roboto']"
    >
      <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        {clientAvatarUrl ? (
          <img
            src={clientAvatarUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[14px] font-medium text-white"
          >
            {initialsOf(clientName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-white font-['IBM_Plex_Serif']">
            {clientName}
          </p>
          <p
            data-testid="text-chat-status"
            className="text-[12px] text-gray-400"
            aria-live="polite"
          >
            {isClientTyping ? t.typing : t.inChat}
          </p>
        </div>
      </header>

      <div
        ref={logRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        data-testid="text-chat-log"
        className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {messages.length === 0 && !isClientTyping && (
          <p
            data-testid="text-chat-empty"
            className="m-auto max-w-[320px] text-center text-[13px] text-gray-400"
          >
            {t.emptyState}
          </p>
        )}

        {messages.map(message => {
          const isLearner = message.role === "learner";
          return (
            <div
              key={message.id}
              data-testid={`text-chat-message-${message.role}`}
              className={`flex flex-col gap-1 ${isLearner ? "items-end" : "items-start"}`}
            >
              <span className="sr-only">{isLearner ? t.you : clientName}:</span>
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-[14px] leading-relaxed text-white sm:max-w-[75%] ${
                  isLearner ? "rounded-br-sm bg-primary-600" : "rounded-bl-sm bg-gray-800"
                } ${message.status === "sending" ? "opacity-70" : ""}`}
              >
                {message.text}
              </p>
              {message.status === "failed" && (
                <p
                  data-testid="text-chat-message-failed"
                  role="alert"
                  className="flex items-center gap-2 text-[12px] text-red-300"
                >
                  {t.notSent}
                  <button
                    type="button"
                    onClick={() => onRetry(message.id)}
                    disabled={disabled}
                    className="font-medium text-white underline underline-offset-2 disabled:opacity-50"
                  >
                    {t.retry}
                  </button>
                </p>
              )}
            </div>
          );
        })}

        {isClientTyping && (
          <div data-testid="text-chat-typing" className="flex items-start">
            <span className="sr-only">
              {clientName} {t.typing}
            </span>
            <span className="rounded-2xl rounded-bl-sm bg-gray-800 px-4 py-3">
              <TypingDots />
            </span>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-gray-800 p-2 sm:p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="text-chat-composer" className="sr-only">
            {t.inputLabel}
          </label>
          <textarea
            id="text-chat-composer"
            ref={textareaRef}
            data-testid="text-chat-input"
            value={draft}
            onChange={event => {
              setDraft(event.target.value);
              resize(event.target);
            }}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            maxLength={TEXT_CHAT_MAX_MESSAGE_LENGTH}
            disabled={disabled}
            rows={1}
            className="custom-scrollbar max-h-[140px] min-h-[44px] flex-1 resize-none rounded-xl border border-gray-800 bg-gray-950 px-3 py-[10px] text-[14px] text-white placeholder:text-gray-500 outline-none focus:border-primary-500 disabled:opacity-50"
          />
          <button
            type="submit"
            data-testid="text-chat-send"
            aria-label={t.send}
            disabled={disabled || draft.trim().length === 0}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={20} />
          </button>
        </div>
        {remaining <= REMAINING_HINT_THRESHOLD && (
          <p data-testid="text-chat-remaining" className="mt-1 px-1 text-[11px] text-gray-400">
            {remaining} {t.charactersLeft}
          </p>
        )}
      </form>
    </section>
  );
};
