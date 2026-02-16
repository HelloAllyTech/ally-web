import { useRef, useState } from "react";

import { AskAiIcon, UpArrow } from "@assets";
import { Button } from "@components";

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

const AskAiInput = ({ onSend }: { onSend: (text: string) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSend = () => {
    const text = inputRef.current?.value?.trim() ?? "";
    if (!text) return;
    onSend(text);
    if (inputRef.current) inputRef.current.value = "";
  };
  return (
    <div className="absolute bottom-3 right-2 left-2 p-1 flex border border-gray-300 rounded-full">
      <input
        ref={inputRef}
        type="text"
        className="w-full p-2 outline-none rounded-full"
        onKeyDown={e => e.key === "Enter" && handleSend()}
        placeholder="Ask AI"
      />
      <Button
        variant="primary"
        type="button"
        className="!rounded-full !p-2 !h-10 !w-10 flex items-center justify-center"
        onClick={handleSend}
      >
        <UpArrow />
      </Button>
    </div>
  );
};

export const AskAiTab = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (text: string) => {
    setMessages(prev => [...prev, { role: "user", content: text }]);
    // TODO: Add API call to ask AI
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: "Hello, how can I help you today?" },
    ]);
  };

  return (
    <div className="p-1 rounded-lg w-full h-full bg-gradient-to-br from-primary-500 to-primary-100">
      <div className="flex flex-col gap-4 w-full h-full rounded-lg bg-white relative">
        <div className="bg-gradient-to-br from-primary-500 to-primary-100 p-4 w-full text-white font-semibold text-lg font-primary">
          Ask AI
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-20 flex flex-col gap-3">
          {messages.map((msg, index) => (
            <ChatBubble key={`${msg.role}-${index}`} message={msg} />
          ))}
        </div>
        <AskAiInput onSend={handleSend} />
      </div>
    </div>
  );
};
