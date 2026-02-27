import { useEffect, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";
import { useDispatch, useSelector } from "react-redux";

import { useGetChatHistoryQuery } from "@api";
import { AskAiIcon, Refresh, SendArrow, UpArrow } from "@assets";
import { Button, CharacterCount } from "@components";
import { chatCards } from "@constants";
import { useSendMessage } from "@hooks";
import { initSession } from "@reducer";
import { RootState } from "@store";
import { ChatMessagePayload } from "@types";

type Message = { role: string; content: string };

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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="flex flex-col justify-center h-full gap-5 px-10">
      <div className="font-base font-secondary text-4xl">
        <span className="text-typography-600">What would you like</span>
        <span className="text-typography-800"> feedback on?</span>
      </div>
      <div className="text-sm font-primary text-typography-700">
        Select a prompt or ask your own.
      </div>
      <div className="flex gap-5">
        {chatCards.map(card => (
          <div
            key={card}
            className="text-sm font-primary mb-2 border rounded-md p-5 shadow-sm w-40 h-40 flex flex-col relative hover:scale-105 hover:shadow-lg transition-all duration-300"
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
  );
};
const ChatBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-[20px] ${isUser ? "bg-primary-50" : ""}`}>
        <div className="flex items-start gap-3">
          {!isUser && <AskAiIcon className="w-8 h-8 shrink-0 mt-0.5" />}
          <div className="prose prose-sm max-w-none text-sm font-primary break-words prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
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
        placeholder="Ask a question about the session.... (0/2000)"
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

export const AskAiTab = ({ sessionId }: { sessionId: string }) => {
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
      }));
      dispatch(initSession({ sessionId, messages: initial }));
    }
  }, [history, sessionId, sessionExists, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <div className="p-1 rounded-lg w-full h-[calc(100vh-250px)] bg-gradient-to-br from-primary-500 to-primary-100">
      <div className="flex flex-col w-full h-full rounded-lg relative">
        <div className="p-4 w-full text-white font-semibold text-lg font-primary">Ask AI</div>
        <div className="flex-1 bg-white rounded-t-lg rounded-b-md custom-scrollbar overflow-y-auto p-3 pb-20 flex flex-col gap-3">
          {isHistoryLoading ? (
            <ChatHistorySkeleton />
          ) : messages.length === 0 ? (
            <InitialScreen handleSend={sendMessage} disabled={isStreaming} />
          ) : (
            messages.map((msg, index) => <ChatBubble key={`${msg.role}-${index}`} message={msg} />)
          )}
          {streamingMessage && <ChatBubble message={streamingMessage} />}
          {error && (
            <div className="flex w-full justify-start">
              <button
                onClick={retryLastMessage}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-sm font-primary hover:bg-red-100 transition-colors"
              >
                <Refresh className="w-4 h-4" />
                Something went wrong. Tap to retry.
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
