import { FC, useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { useGetChatHistoryQuery } from "@api";
import { AskAiIcon, Refresh } from "@assets";
import { useSendMessage } from "@hooks";
import { initSession } from "@reducer";
import { RootState } from "@store";
import { ChatMessagePayload, SimulationSummary as SimulationSummaryType } from "@types";

import { DebriefReplyInput } from "./DebriefReplyInput";
import { SupervisorNote } from "./SupervisorNote";

const NoteSkeleton = () => (
  <div className="flex w-full gap-3">
    <div className="mt-1 h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200" />
    <div className="flex flex-1 flex-col gap-2 py-1">
      <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-11/12 animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-gray-200" />
    </div>
  </div>
);

/**
 * A reply in the conversation the note opened. Deliberately plainer than the
 * note itself: the note is the thing being read, the replies are a
 * conversation about it.
 */
const ReplyBubble = ({ role, content }: { role: string; content: string }) => {
  const isLearner = role === "user";
  return (
    <div className={`flex w-full ${isLearner ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-[20px] px-4 py-2.5 ${isLearner ? "bg-primary-50" : ""}`}>
        <div className="flex items-start gap-3">
          {!isLearner && <AskAiIcon className="mt-0.5 h-8 w-8 shrink-0" />}
          <div className="flex flex-col gap-1">
            {content.split("\n").map((line, index) => (
              <span key={index} className="break-words font-primary text-base">
                {line}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DebriefTabProps {
  sessionId: string;
  summaryData?: SimulationSummaryType;
  /** True once polling gave up — used to stop showing "still writing". */
  retryMaxReached: boolean;
  onOpenMoment?: (messageId: string) => void;
}

/**
 * The landing surface after a practice session: Ally's debrief note, which the
 * learner can reply to. The note and the replies are one continuous thread
 * rather than a summary with a chat bolted beneath it, because the note ends by
 * inviting a reply — the conversation is the point, not a secondary feature.
 */
export const DebriefTab: FC<DebriefTabProps> = ({
  sessionId,
  summaryData,
  retryMaxReached,
  onOpenMoment,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const threadEndRef = useRef<HTMLDivElement>(null);

  const sessionExists = useSelector((state: RootState) => state.chatHistory.sessions[sessionId]);
  const { messages, streamingMessage, isStreaming, error, sendMessage, retryLastMessage } =
    useSendMessage(sessionId);
  const { data: history, isLoading: isHistoryLoading } = useGetChatHistoryQuery({ sessionId });

  useEffect(() => {
    if (sessionExists) return;
    if (history?.length) {
      const initial: ChatMessagePayload[] = history.map(message => ({
        role: message.role,
        content: message.content,
        citations: message.citations,
      }));
      dispatch(initSession({ sessionId, messages: initial }));
    }
  }, [history, sessionId, sessionExists, dispatch]);

  useEffect(() => {
    // Only chase the bottom once there is a conversation to follow. Scrolling
    // on first paint would skip past the note, which is the thing they came to
    // read.
    if (messages.length || streamingMessage) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage]);

  const summary = summaryData?.details?.summary;
  const note = summary?.feedback?.supervisorNote;
  const errorMessage = summary?.errorMessage;
  // Nothing has landed yet and polling is still going: the evaluation runs
  // asynchronously after the session ends, so "empty" here means "not yet".
  const isGenerating = !note && !errorMessage && !retryMaxReached;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-gradient-to-br from-primary-500 to-primary-100 p-1">
      <div className="relative flex min-h-0 w-full flex-1 flex-col rounded-lg">
        <div className="w-full shrink-0 p-4 font-primary text-lg font-semibold text-white">
          {t("postSim.debrief.header")}
        </div>
        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto rounded-t-lg rounded-b-md bg-white p-4 pb-24">
          {isGenerating ? (
            <div className="flex flex-col gap-3">
              <NoteSkeleton />
              <p className="font-primary text-sm text-typography-700">
                {t("postSim.debrief.generating")}{" "}
                <span className="text-typography-600">
                  {t("postSim.debrief.generatingHint")}
                </span>
              </p>
            </div>
          ) : note ? (
            <SupervisorNote note={note} onOpenMoment={onOpenMoment} />
          ) : (
            // Generation failed, or this session predates the debrief note.
            // Say so plainly rather than showing an empty panel — the learner
            // should never be left wondering whether feedback is still coming.
            <p className="font-primary text-base text-typography-800">
              {errorMessage || t("postSim.debrief.failed")}
            </p>
          )}

          {note && !messages.length && !isHistoryLoading && (
            <p className="font-primary text-sm text-typography-600">
              {t("postSim.debrief.replyPrompt")}
            </p>
          )}

          {messages.map((message, index) => (
            <ReplyBubble key={`${message.role}-${index}`} role={message.role} content={message.content} />
          ))}
          {streamingMessage && (
            <ReplyBubble role={streamingMessage.role} content={streamingMessage.content} />
          )}
          {error && (
            <div className="flex w-full justify-start">
              <button
                onClick={retryLastMessage}
                className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 font-primary text-sm text-red-600 transition-colors hover:bg-red-100"
              >
                <Refresh className="h-4 w-4" />
                {t("common.somethingWentWrong")} {t("common.retry")}
              </button>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>
        {/* Replying only makes sense once there is a note to reply to. */}
        {note && <DebriefReplyInput onSend={sendMessage} disabled={isStreaming} />}
      </div>
    </div>
  );
};
