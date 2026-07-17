import { useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { Table, TableBody, TableRow, TableCell } from "@ally-ui-mono/ui-shared";
import { useGetChatHistoryQuery } from "@api";
import { AskAiIcon, Refresh, SendArrow, UpArrow } from "@assets";
import { Button, CharacterCount } from "@components";
import { useSendMessage } from "@hooks";
import { initSession } from "@reducer";
import { RootState } from "@store";
import { ChatMessagePayload, Citation } from "@types";

type Message = { role: string; content: string; citations?: Citation[] };

/** Parse content into text, citation [m:ss], and bold **text** segments in one pass */
type ContentSegment =
  | { type: "text"; value: string }
  | { type: "citation"; timestamp: string }
  | { type: "bold"; value: string };

const parseContentSegments = (text: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  const citationOrBoldPattern = /\[(\d{1,2}:\d{2})\]|\*\*(.+?)\*\*/g;
  let previousMatchEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = citationOrBoldPattern.exec(text)) !== null) {
    if (match.index > previousMatchEnd) {
      segments.push({ type: "text", value: text.slice(previousMatchEnd, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "citation", timestamp: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: "bold", value: match[2] });
    }
    previousMatchEnd = citationOrBoldPattern.lastIndex;
  }
  if (previousMatchEnd < text.length) {
    segments.push({ type: "text", value: text.slice(previousMatchEnd) });
  }
  return segments.length ? segments : [{ type: "text", value: text }];
};

const MAX_MESSAGE_LENGTH = 2000;

const ChatHistorySkeleton = () => (
  <div className="flex flex-col gap-3 w-full">
    {/* AI message skeleton */}
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] flex items-start gap-3">
        <div className="w-5 h-5 shrink-0 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex flex-col gap-1.5 py-2">
          <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
    {/* User message skeleton */}
    <div className="flex w-full justify-end">
      <div className="max-w-[80%] px-4 py-2.5 rounded-full bg-gray-100">
        <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
    {/* AI message skeleton */}
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] flex items-start gap-3">
        <div className="w-5 h-5 shrink-0 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex flex-col gap-1.5 py-2">
          <div className="h-3 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

const InitialScreen = ({
  handleSend,
  disabled,
}: {
  handleSend: (card: string) => void;
  disabled: boolean;
}) => {
  const { t } = useTranslation();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const promptCards = [
    t("askAi.cards.responseEffectiveness"),
    t("askAi.cards.pacingPresence"),
    t("askAi.cards.missedClientCues"),
    t("askAi.cards.therapeuticTechniques"),
  ];

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="flex flex-col items-start gap-5">
        <div className="font-base font-secondary text-4xl">
          <span className="text-typography-600">{t("askAi.initial.titlePrefix")}</span>
          <span className="text-typography-800">{t("askAi.initial.titleSuffix")}</span>
        </div>
        <div className="text-sm font-primary text-typography-700">
          {t("askAi.initial.subtitle")}
        </div>
        <div className="flex gap-5">
          {promptCards.map(card => (
            <div
              key={card}
              className="text-sm font-primary mb-2 border rounded-md p-5 shadow-sm w-[163px] h-[162px] flex flex-col relative hover:scale-105 hover:shadow-lg transition-all duration-300"
              onMouseEnter={() => setHoveredCard(card)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <span className="flex-1">{card}</span>
              <button
                className={`absolute bottom-3 right-3 !rounded-full !p-1 !h-8 !w-8 flex items-center justify-center disabled:opacity-60 disabled:bg-typography-500 ${hoveredCard === card ? "bg-primary-500" : "bg-typography-500"}`}
                onClick={() => handleSend(card)}
                disabled={disabled}
              >
                <SendArrow className="w-5 h-5 shrink-0" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
const CitationsTable = ({
  citations,
  councellorName,
  agentName,
}: {
  citations: Citation[];
  councellorName: string;
  agentName: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-3 border border-gray-200 rounded-md overflow-hidden border-primary-100">
      <div className="text-base font-primary px-3 py-2 bg-[#E2F2FF80] w-full">
        {t("askAi.transcriptReferences")}
      </div>
      <Table className="w-full text-xs font-primary">
        <TableBody className="text-base">
          {citations.map((citation, idx) => (
            <TableRow key={idx} className="w-full" data-citation-row={idx}>
              <TableCell className="px-3 w-[8%] min-w-[50px] py-2 align-top text-typography-800">
                {citation.timestamp}
              </TableCell>
              <TableCell className="text-typography-900 w-[92%] font-primary">
                <span className="font-medium pr-1">
                  {citation.senderId === -1
                    ? `${agentName} (${t("transcription.aiClientSuffix")})`
                    : councellorName}
                  :
                </span>
                {citation.content}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ChatBubble = ({
  message,
  councellorName,
  agentName,
}: {
  message: Message;
  councellorName: string;
  agentName: string;
}) => {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const citations = message.citations ?? [];

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-[20px] ${isUser ? "bg-primary-50" : ""}`}>
        <div className="flex items-start gap-3">
          {!isUser && <AskAiIcon className="w-8 h-8 shrink-0 mt-0.5" />}
          <div className="flex flex-col gap-1">
            {message.content.split("\n").map((line, lineIndex) => {
              const segments = parseContentSegments(line);
              return (
                <span key={lineIndex} className="text-base font-primary break-words">
                  {segments.map((seg, segIndex) =>
                    seg.type === "text" ? (
                      <span key={segIndex}>{seg.value}</span>
                    ) : seg.type === "bold" ? (
                      <strong key={segIndex} className="font-semibold">
                        {seg.value}
                      </strong>
                    ) : (
                      <span className="text-primary-600 font-medium hover:text-primary-700 cursor-pointer bg-transparent border-none p-0">
                        [{seg.timestamp}]
                      </span>
                    ),
                  )}
                </span>
              );
            })}
            {citations.length > 0 && (
              <CitationsTable
                citations={citations}
                councellorName={councellorName || t("transcription.youLabel")}
                agentName={agentName}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AskAiInput = ({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasDisabledRef = useRef(disabled);
  const [messageLength, setMessageLength] = useState(0);

  useEffect(() => {
    if (wasDisabledRef.current && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
    wasDisabledRef.current = disabled;
  }, [disabled]);

  const handleSend = () => {
    if (disabled) return;
    const text = inputRef.current?.value?.trim() ?? "";
    if (!text) return;
    onSend(text);
    if (inputRef.current) {
      inputRef.current.value = "";
      setMessageLength(0);
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageLength(e.target.value.length);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="absolute bottom-[16px] right-[16px] left-[16px] p-[6px] flex items-end gap-2 border border-gray-300 rounded-[32px] shadow-lg bg-white">
      <CharacterCount value={messageLength} maxLength={MAX_MESSAGE_LENGTH} />
      <textarea
        ref={inputRef}
        onChange={handleChange}
        className="flex-1 w-full p-2 px-3 outline-none resize-none disabled:opacity-60 font-primary text-sm custom-scrollbar max-h-[120px] overflow-y-auto"
        onKeyDown={handleKeyDown}
        placeholder={t("askAi.inputPlaceholder", { max: MAX_MESSAGE_LENGTH })}
        disabled={disabled}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={1}
      />
      <Button
        variant="primary"
        type="button"
        className="!rounded-full !p-2 !h-10 !w-10 flex items-center justify-center disabled:opacity-60 shrink-0"
        onClick={handleSend}
        disabled={disabled || messageLength === 0}
      >
        <UpArrow />
      </Button>
    </div>
  );
};

export const AskAiTab = ({
  sessionId,
  councellorName,
  agentName,
}: {
  sessionId: string;
  councellorName?: string;
  agentName?: string;
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionExists = useSelector((state: RootState) => state.chatHistory.sessions[sessionId]);
  const { messages, streamingMessage, isStreaming, error, sendMessage, retryLastMessage } =
    useSendMessage(sessionId);
  const { data: history, isLoading: isHistoryLoading } = useGetChatHistoryQuery({ sessionId });

  useEffect(() => {
    if (sessionExists) return;
    if (history?.length) {
      const initial: ChatMessagePayload[] = history.map(msg => ({
        role: msg.role,
        content: msg.content,
        citations: msg.citations,
      }));
      dispatch(initSession({ sessionId, messages: initial }));
    }
  }, [history, sessionId, sessionExists, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-gradient-to-br from-primary-500 to-primary-100 p-1">
      <div className="relative flex min-h-0 w-full flex-1 flex-col rounded-lg">
        <div className="w-full shrink-0 p-4 font-primary text-lg font-semibold text-white">
          {t("postSim.tabs.askAi")}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-t-lg rounded-b-md bg-white p-3 pb-20 custom-scrollbar">
          {isHistoryLoading ? (
            <ChatHistorySkeleton />
          ) : messages.length === 0 ? (
            <InitialScreen handleSend={sendMessage} disabled={isStreaming} />
          ) : (
            messages.map((msg, index) => (
              <ChatBubble
                key={`${msg.role}-${index}`}
                message={msg}
                councellorName={councellorName}
                agentName={agentName}
              />
            ))
          )}
          {streamingMessage && (
            <ChatBubble
              message={streamingMessage}
              councellorName={councellorName}
              agentName={agentName}
            />
          )}
          {error && (
            <div className="flex w-full justify-start">
              <button
                onClick={retryLastMessage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-sm font-primary hover:bg-red-100 transition-colors"
              >
                <Refresh className="w-4 h-4" />
                {t("common.somethingWentWrong")} {t("common.retry")}
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <AskAiInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
};
