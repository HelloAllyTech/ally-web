import { useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { AskAiIcon, UpArrow } from "@assets";
import { Button } from "@components";
import { RootState } from "@store";
import { sendMessage } from "@utils";

type Message = { role: "user" | "assistant"; content: string };

const ChatBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] px-4 py-2.5 rounded-full ${isUser ? "bg-primary-50" : ""}`}>
        <div className="flex items-center gap-2">
          {!isUser && <AskAiIcon />}
          <p className="text-sm font-primary break-words">{message.content}</p>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSend = () => {
    if (disabled) return;
    const text = inputRef.current?.value?.trim() ?? "";
    if (!text) return;
    onSend(text);
    if (inputRef.current) inputRef.current.value = "";
  };
  return (
    <div className="absolute bottom-[16px] right-[16px] left-[16px] p-1 flex border border-gray-300 rounded-full shadow-lg">
      <input
        ref={inputRef}
        type="text"
        className="w-full p-2 px-3 outline-none rounded-full disabled:opacity-60"
        onKeyDown={e => e.key === "Enter" && handleSend()}
        placeholder="Ask AI"
        disabled={disabled}
      />
      <Button
        variant="primary"
        type="button"
        className="!rounded-full !p-2 !h-10 !w-10 flex items-center justify-center disabled:opacity-60"
        onClick={handleSend}
        disabled={disabled}
      >
        <UpArrow />
      </Button>
    </div>
  );
};

export const AskAiTab = ({ sessionId }: { sessionId: string }) => {
  const dispatch = useDispatch();
  const messages = useSelector((state: RootState) => state.chat.messages) as Message[];
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSend = async (text: string) => {
    setIsStreaming(true);
    try {
      await sendMessage(text, sessionId, dispatch);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="p-1 rounded-lg w-full h-full bg-gradient-to-br from-primary-500 to-primary-100">
      <div className="flex flex-col w-full h-full rounded-lg relative">
        <div className="p-4 w-full text-white font-semibold text-lg font-primary">Ask AI</div>
        <div className="flex-1 bg-white rounded-t-lg rounded-b-md custom-scrollbar overflow-y-auto px-3 pb-20 flex flex-col gap-3">
          {messages.map((msg, index) => (
            <ChatBubble key={`${msg.role}-${index}`} message={msg} />
          ))}
        </div>
        <AskAiInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
};
