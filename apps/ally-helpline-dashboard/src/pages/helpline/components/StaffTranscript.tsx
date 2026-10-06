import { FC, useEffect, useRef } from "react";

import { AlertCircle, Eye, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { StaffChatDto, StaffMessageDto } from "@types";

import { isTalkerVisibleSystemKind, isTranscriptMessage } from "../utils";

import type { PendingStaffMessage } from "../realtime/HelplineRealtimeProvider";

interface StaffTranscriptProps {
  chat: StaffChatDto;
  messages: StaffMessageDto[];
  pending: PendingStaffMessage[];
  myUserId: number;
  talkerTyping: boolean;
  onRetry: (clientMessageId: string) => void;
}

const SEND_ERRORS = ["rate_limited", "too_long", "chat_ended", "not_allowed"];

/**
 * Talker on the left, staff on the right (me unlabelled, anyone else — a
 * previous listener, a supervisor who took over — under their name). System
 * lines come in two visibly different kinds: what the talker also sees (solid,
 * eye) and what only staff see (dashed, lock), so a listener never mistakes a
 * staff-only note for something the talker was told.
 */
export const StaffTranscript: FC<StaffTranscriptProps> = ({
  chat,
  messages,
  pending,
  myUserId,
  talkerTyping,
  onRetry,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const talkerName = chat.talker.displayName || t("helplineWorkspace.chat.talkerFallback");
  const visible = messages.filter(isTranscriptMessage);
  const confirmedClientIds = new Set(
    visible.map(message => message.clientMessageId).filter(Boolean),
  );
  const unconfirmed = pending.filter(item => !confirmedClientIds.has(item.clientMessageId));

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
    if (nearBottom) endRef.current?.scrollIntoView?.({ block: "end" });
  }, [visible.length, unconfirmed.length, talkerTyping]);

  const systemLine = (message: StaffMessageDto) => {
    if (message.type === "RISK") {
      const level = String(message.metadata?.level ?? "");
      const source = String(message.metadata?.source ?? "");
      return (
        <li key={message.id} className="flex justify-center px-2">
          <p className="inline-flex max-w-[90%] items-center gap-1.5 rounded-full border border-dashed border-status-alarmDot bg-status-alarmBg px-3 py-1 text-center font-primary text-xs text-status-alarmFg">
            <Lock aria-hidden="true" className="h-3 w-3 flex-shrink-0" />
            <span className="sr-only">{t("helplineWorkspace.chat.staffOnly")}:</span>
            {t("helplineWorkspace.chat.system.risk", {
              level: level ? t(`helplineWorkspace.risk.${level}`) : "",
              source: source ? t(`helplineWorkspace.riskBanner.source.${source}`) : "",
            })}
          </p>
        </li>
      );
    }
    const kind = message.systemKind ?? "";
    const talkerSees = message.visibleToTalker && isTalkerVisibleSystemKind(kind);
    const knownKinds = [
      "ACCEPTED",
      "RESOURCES",
      "CLOSING",
      "TRANSFERRING",
      "LISTENER_RECONNECTING",
      "LISTENER_BACK",
      "ENDED",
      "TALKER_DISCONNECTED",
      "TALKER_RECONNECTED",
      "TAKEN_OVER",
      "TRANSFERRED",
      "ASSIGNED",
    ];
    const text = knownKinds.includes(kind)
      ? t(`helplineWorkspace.chat.system.${kind}`, {
          name: (message.metadata?.listenerName as string) || chat.listener?.displayName || "",
        })
      : t("helplineWorkspace.chat.system.generic");
    return (
      <li key={message.id} className="flex justify-center px-2">
        <p
          title={
            talkerSees
              ? t("helplineWorkspace.chat.talkerSees")
              : t("helplineWorkspace.chat.staffOnly")
          }
          className={`inline-flex max-w-[90%] items-center gap-1.5 rounded-full px-3 py-1 text-center font-primary text-xs ${
            talkerSees
              ? "bg-background-secondary text-typography-800"
              : "border border-dashed border-border-dark text-typography-700"
          }`}
          data-testid={talkerSees ? "system-talker-visible" : "system-staff-only"}
        >
          {talkerSees ? (
            <Eye aria-hidden="true" className="h-3 w-3 flex-shrink-0" />
          ) : (
            <Lock aria-hidden="true" className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="sr-only">
            {talkerSees
              ? t("helplineWorkspace.chat.talkerSees")
              : t("helplineWorkspace.chat.staffOnly")}
            :
          </span>
          {text}
        </p>
      </li>
    );
  };

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <ol
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={t("helplineWorkspace.chat.transcriptLabel")}
        className="ph-no-capture flex flex-col gap-3"
        data-testid="staff-transcript"
      >
        {visible.map((message, index) => {
          if (message.type !== "TEXT") return systemLine(message);
          const fromTalker = message.senderRole === "TALKER";
          const mine = !fromTalker && message.senderUserId === myUserId;
          const previous = visible[index - 1];
          const startsRun =
            !previous ||
            previous.type !== "TEXT" ||
            previous.senderRole !== message.senderRole ||
            previous.senderUserId !== message.senderUserId;
          const label = fromTalker
            ? talkerName
            : mine
              ? t("helplineWorkspace.chat.you")
              : message.senderName || t("helplineWorkspace.chat.otherStaff");
          return (
            <li
              key={message.id}
              className={`flex flex-col ${fromTalker ? "items-start" : "items-end"}`}
            >
              {startsRun && (!mine || fromTalker) ? (
                <span className="mb-1 font-primary text-xs text-typography-700">{label}</span>
              ) : (
                <span className="sr-only">{label}:</span>
              )}
              <p
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 font-primary text-base ${
                  message.erased ? "italic opacity-70" : ""
                } ${
                  fromTalker
                    ? "rounded-bl-md border border-border-light bg-background-secondary text-typography-900"
                    : mine
                      ? "rounded-br-md bg-primary-500 text-white"
                      : "rounded-br-md bg-primary-100 text-typography-900"
                }`}
              >
                {message.content}
              </p>
            </li>
          );
        })}
        {unconfirmed.map(item => (
          <li key={item.clientMessageId} className="flex flex-col items-end">
            <span className="sr-only">{t("helplineWorkspace.chat.you")}:</span>
            <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary-500 px-4 py-2 font-primary text-base text-white opacity-80">
              {item.content}
            </p>
            {item.status === "pending" ? (
              <span className="mt-1 font-primary text-xs text-typography-700">
                {t("helplineWorkspace.chat.sending")}
              </span>
            ) : (
              <span className="mt-1 inline-flex items-center gap-2 font-primary text-xs text-destructive-700">
                <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
                {t(
                  `helplineWorkspace.chat.sendError.${
                    SEND_ERRORS.includes(item.failure ?? "") ? item.failure : "generic"
                  }`,
                )}
                {item.failure !== "too_long" && item.failure !== "chat_ended" && (
                  <button
                    type="button"
                    onClick={() => onRetry(item.clientMessageId)}
                    className="rounded-full border border-destructive-300 px-2 py-0.5 font-medium hover:bg-destructive-50"
                  >
                    {t("helplineWorkspace.chat.retrySend")}
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>
      {talkerTyping && (
        <p className="mt-3 font-primary text-sm text-typography-700" data-testid="staff-typing">
          {t("helplineWorkspace.chat.typing", { name: talkerName })}
        </p>
      )}
      <div ref={endRef} />
    </div>
  );
};
