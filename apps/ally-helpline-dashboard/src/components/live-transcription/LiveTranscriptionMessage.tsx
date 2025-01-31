import { cn } from "@/utils/tailwind";

interface LiveTranscriptionMessageProps {
  content: string;
  isOutgoing?: boolean;
  timestamp?: string;
}

const LiveTranscriptionMessage = ({
  content,
  isOutgoing = false,
  timestamp,
}: LiveTranscriptionMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full animate-message-in opacity-0",
        isOutgoing ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
          isOutgoing
            ? "bg-chat-incoming text-gray-800"
            : "bg-chat-outgoing text-gray-800"
        )}
      >
        <p>{content}</p>
        {timestamp && (
          <span className="mt-1 block text-right text-xs text-gray-500">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
};

export default LiveTranscriptionMessage;