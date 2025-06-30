import { useState } from "react";
import { SendIcon } from "@/assets/icons";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const MessageInput = ({ onSend, disabled = false }: MessageInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="relative h-fit">
        <textarea
          value={message}
          disabled={disabled}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 h-auto min-h-[82px] focus:border-[#84A5F0] focus:border-2 max-h-[100px] custom-scrollbar w-full outline-none border rounded-lg pr-9 p-4"
          rows={2}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          autoComplete="off"
        />
        <button
          type="submit"
          className={`absolute right-0 bottom-0 mr-[21px] mb-[20px] pt-3 pl-5 ${
            disabled ? "cursor-not-allowed" : ""
          }`}
          disabled={disabled}
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
};
export default MessageInput;
