import { FC, useEffect, useRef } from "react";

import { AlertCircle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HELPLINE_TALKER_SYSTEM_KINDS } from "@constants/helpline";

import { ResourcesCard } from "./ResourcesCard";

import type { TalkerMessage } from "../talkerReducer";

interface TalkerMessageListProps {
  messages: TalkerMessage[];
  listenerName: string | null;
  typing: boolean;
  onRetry: (clientMessageId: string) => void;
}

const SystemLine: FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex justify-center px-2">
    <p className="max-w-[90%] rounded-full bg-background-secondary px-3 py-1 text-center font-primary text-sm text-typography-800">
      {children}
    </p>
  </li>
);

const isTalkerVisible = (message: TalkerMessage) => {
  if (message.type !== "TEXT" && message.type !== "SYSTEM") return false;
  if (message.type === "SYSTEM" && message.systemKind) {
    return (HELPLINE_TALKER_SYSTEM_KINDS as readonly string[]).includes(message.systemKind);
  }
  return true;
};

/**
 * The talker's view of the conversation: their own bubbles on the right, the
 * listener's on the left under the listener's alias, and service lines centred
 * and styled apart so nothing automated can be mistaken for the listener.
 * Service text is rendered from `systemKind` in the talker's language; only
 * RESOURCES and CLOSING carry org-authored text.
 */
export const TalkerMessageList: FC<TalkerMessageListProps> = ({
  messages,
  listenerName,
  typing,
  onRetry,
}) => {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);
  const name = listenerName || t("helplineTalker.chat.listenerFallback");
  const lastOwnIndex = messages.reduce(
    (last, message, index) => (message.from === "ME" ? index : last),
    -1,
  );

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, typing]);

  const renderService = (message: TalkerMessage) => {
    const nameParam = message.params?.listenerName || name;
    switch (message.systemKind) {
      case "ACCEPTED":
        return (
          <SystemLine key={message.id}>
            {t("helplineTalker.chat.system.accepted", { name: nameParam })}
          </SystemLine>
        );
      case "RESOURCES":
        return (
          <li key={message.id} className="px-1">
            <ResourcesCard
              text={message.content}
              title={t("helplineTalker.chat.system.resourcesTitle")}
            />
          </li>
        );
      case "CLOSING":
        return (
          <li key={message.id} className="flex justify-center px-2">
            <p className="max-w-[90%] whitespace-pre-line break-words rounded-xl border border-border-light bg-background-secondary px-4 py-2 text-center font-primary text-base text-typography-900">
              {message.content}
            </p>
          </li>
        );
      case "TRANSFERRING":
        return (
          <SystemLine key={message.id}>{t("helplineTalker.chat.system.transferring")}</SystemLine>
        );
      case "LISTENER_RECONNECTING":
        return (
          <SystemLine key={message.id}>
            {t("helplineTalker.chat.system.listenerReconnecting")}
          </SystemLine>
        );
      case "LISTENER_BACK":
        return (
          <SystemLine key={message.id}>{t("helplineTalker.chat.system.listenerBack")}</SystemLine>
        );
      case "ENDED":
        return <SystemLine key={message.id}>{t("helplineTalker.chat.system.ended")}</SystemLine>;
      default:
        return message.content ? <SystemLine key={message.id}>{message.content}</SystemLine> : null;
    }
  };

  return (
    <>
      <ol
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("helplineTalker.chat.conversation")}
        className="flex flex-col gap-3"
        data-testid="talker-message-list"
      >
        {messages.map((message, index) => {
          // Defence in depth: the server only ever sends this page TEXT and
          // talker-visible SYSTEM rows. Anything else (a whisper, a staff-only
          // system line) is never shown here, even if one slipped through.
          if (!isTalkerVisible(message)) return null;
          if (message.from === "SERVICE" || message.type === "SYSTEM")
            return renderService(message);

          if (message.from === "ME") {
            const showStatus = index === lastOwnIndex || message.localStatus === "failed";
            return (
              <li key={message.clientMessageId ?? message.id} className="flex flex-col items-end">
                <span className="sr-only">{t("helplineTalker.chat.you")}:</span>
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary-500 px-4 py-2 font-primary text-base text-white">
                  {message.content}
                </p>
                {showStatus && message.localStatus === "pending" && (
                  <span className="mt-1 font-primary text-xs text-typography-700">
                    {t("helplineTalker.chat.sending")}
                  </span>
                )}
                {showStatus && message.localStatus === "sent" && (
                  <span className="mt-1 inline-flex items-center gap-1 font-primary text-xs text-typography-700">
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    {t("helplineTalker.chat.sent")}
                  </span>
                )}
                {message.localStatus === "failed" && message.clientMessageId && (
                  <span className="mt-1 inline-flex flex-wrap items-center justify-end gap-2 font-primary text-xs text-destructive-700">
                    <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
                    {t(
                      `helplineTalker.chat.sendError.${
                        ["rate_limited", "too_long", "chat_ended"].includes(message.failure ?? "")
                          ? message.failure
                          : "generic"
                      }`,
                    )}
                    {message.failure !== "too_long" && message.failure !== "chat_ended" && (
                      <button
                        type="button"
                        onClick={() => onRetry(message.clientMessageId as string)}
                        className="min-h-[40px] rounded-full border border-destructive-300 px-3 font-medium md:min-h-[32px] text-destructive-700 hover:bg-destructive-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {t("helplineTalker.chat.retry")}
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          }

          const previous = messages[index - 1];
          const startsRun = !previous || previous.from !== "LISTENER";
          return (
            <li key={message.id} className="flex flex-col items-start">
              {startsRun ? (
                <span className="mb-1 font-primary text-xs text-typography-700">{name}</span>
              ) : (
                <span className="sr-only">{name}:</span>
              )}
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border border-border-light bg-background-secondary px-4 py-2 font-primary text-base text-typography-900">
                {message.content}
              </p>
            </li>
          );
        })}
      </ol>
      {typing && (
        <p
          className="mt-3 inline-flex items-center gap-2 font-primary text-sm text-typography-700"
          data-testid="talker-typing"
        >
          <span aria-hidden="true" className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-typography-600" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-typography-600 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-typography-600 [animation-delay:300ms]" />
          </span>
          {t("helplineTalker.chat.typing", { name })}
        </p>
      )}
      <div ref={endRef} />
    </>
  );
};
