import { FC } from "react";

import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { GuestChatDto } from "@types";

import { ResourcesCard } from "./ResourcesCard";
import { TalkerButton } from "./TalkerButton";
import { TalkerComposer } from "./TalkerComposer";
import { TalkerMessageList } from "./TalkerMessageList";
import { useFocusOnMount } from "./useFocusOnMount";

import type { TalkerMessage } from "../talkerReducer";

interface ConversationScreenProps {
  mode: "waiting" | "chat";
  chat: GuestChatDto;
  messages: TalkerMessage[];
  listenerTyping: boolean;
  resourcesText: string | null;
  estimatedWaitMinutes: number | null;
  isReconnecting: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (value: string) => boolean;
  onTyping: () => void;
  onRetry: (clientMessageId: string) => void;
  onLeave: () => void;
}

/** "You're next in line" / "You're 3rd in line" — ordinal where the language has one. */
const PositionLine: FC<{ position: number | null }> = ({ position }) => {
  const { t } = useTranslation();
  if (!position || position < 1) return null;
  return (
    <p
      className="font-primary text-lg font-medium text-typography-900"
      data-testid="queue-position"
    >
      {position === 1
        ? t("helplineTalker.waiting.next")
        : t("helplineTalker.waiting.position", { count: position, ordinal: true })}
    </p>
  );
};

/**
 * The in-stream resources card is already in the conversation. Same test the message list uses to
 * draw it: a SYSTEM line of kind RESOURCES (it is always talker-visible).
 */
const hasResourcesInStream = (messages: TalkerMessage[]) =>
  messages.some(message => message.type === "SYSTEM" && message.systemKind === "RESOURCES");

/**
 * Waiting and chatting share one layout — header, a scrolling conversation, a
 * composer pinned to the bottom — so the talker's own messages typed in the
 * queue are simply still there when the listener joins.
 */
export const ConversationScreen: FC<ConversationScreenProps> = ({
  mode,
  chat,
  messages,
  listenerTyping,
  resourcesText,
  estimatedWaitMinutes,
  isReconnecting,
  draft,
  onDraftChange,
  onSend,
  onTyping,
  onRetry,
  onLeave,
}) => {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const listenerName = chat.listenerName || t("helplineTalker.chat.listenerFallback");
  // The waiting screen carries a static "If you need help right now" card so a talker is never
  // without numbers. Once the org's resources have arrived in the stream (they carry the org's own
  // text), the same numbers twice only push the conversation down — the stream's card stays.
  const showStaticResources = !hasResourcesInStream(messages);

  return (
    <>
      {isReconnecting && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-warning-200 bg-warning-50 px-4 py-2 font-primary text-sm text-warning-900"
          data-testid="talker-reconnecting"
        >
          <WifiOff aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
          <span className="mx-auto max-w-2xl flex-1">{t("helplineTalker.chat.reconnecting")}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
          {mode === "waiting" ? (
            <>
              <section
                className="rounded-2xl border border-border-light bg-white p-4"
                aria-labelledby="talker-waiting-title"
              >
                <h1
                  id="talker-waiting-title"
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-secondary text-2xl text-typography-900 focus:outline-none"
                >
                  {t("helplineTalker.waiting.title")}
                </h1>
                <div aria-live="polite" className="mt-2 flex flex-col gap-1">
                  <PositionLine position={chat.queuePosition} />
                  {estimatedWaitMinutes !== null && (
                    <p
                      className="font-primary text-base text-typography-800"
                      data-testid="queue-estimate"
                    >
                      {estimatedWaitMinutes < 1
                        ? t("helplineTalker.waiting.estimateUnderMinute")
                        : t("helplineTalker.waiting.estimate", {
                            count: Math.round(estimatedWaitMinutes),
                          })}
                    </p>
                  )}
                </div>
                <p className="mt-3 font-primary text-base text-typography-800">
                  {t("helplineTalker.waiting.body")}
                </p>
                <TalkerButton variant="secondary" className="mt-4" onClick={onLeave}>
                  {t("helplineTalker.waiting.leave")}
                </TalkerButton>
              </section>
              {showStaticResources && <ResourcesCard text={resourcesText} />}
            </>
          ) : (
            <h1 ref={headingRef} tabIndex={-1} className="sr-only">
              {t("helplineTalker.chat.withListener", { name: listenerName })}
            </h1>
          )}

          <TalkerMessageList
            messages={messages}
            listenerName={chat.listenerName}
            typing={mode === "chat" && listenerTyping}
            onRetry={onRetry}
          />
        </div>
      </div>

      <TalkerComposer
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
        onTyping={onTyping}
        hint={mode === "waiting" ? t("helplineTalker.waiting.composerHint") : undefined}
      />
    </>
  );
};
