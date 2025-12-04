export interface TranscriptItemRowProps {
  item: TranscriptItem;
  isActive: boolean;
  isPast: boolean;
  senderLabel: string;
  onSeek: (time: number) => void;
  activeRef: React.RefObject<HTMLDivElement | null> | null;
}

export interface TranscriptItem {
  id: number;
  content: string;
  senderId: number;
  startSeconds: number;
  endSeconds: number | null;
}

export const TranscriptItemRow: React.FC<TranscriptItemRowProps> = ({
  item,
  isActive,
  isPast,
  senderLabel,
  onSeek,
  activeRef,
}) => (
  <div
    ref={activeRef}
    onClick={() => onSeek(item.startSeconds)}
    className={`flex pl-2 gap-4 cursor-pointer transition-opacity duration-200 ${
      isPast || isActive ? "opacity-100" : "opacity-50"
    } ${isActive ? "border-l border-l-primary-500" : ""}`}
  >
    <div className="w-10 pt-0.5 flex-shrink-0">
      <span className={`text-sm font-medium ${isActive ? "text-brand-600" : "text-gray-400"}`}>
        {item.startSeconds.toFixed(2)}
      </span>
    </div>

    <div className="flex-1">
      <p className={`text-base leading-relaxed ${isActive ? "text-gray-900" : "text-gray-600"}`}>
        <span className="font-bold">{senderLabel}:</span>{" "}
        <span className={`${isActive ? "bg-primary-100" : "bg-transparent"} px-1`}>
          {item.content}
        </span>
      </p>
    </div>
  </div>
);
