import { FC, RefObject } from "react";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { useTranslation } from "react-i18next";
import { SimulationTranscriptMessage } from "@types";

interface TranscriptListingProps {
  transcriptList: SimulationTranscriptMessage[];
  handleLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  scrollContainerRef?: RefObject<HTMLElement>;
  counsellorName?: string;
  agentName?: string;
  className?: string;
}

const categoryColoeMap = {
  POSITIVE: "bg-[#C8E6C9] text-[#18441B]",
  NEGATIVE: "bg-[#FFD9D4] text-[#390002]",
  NEUTRAL: "bg-[#E0E0E0] text-[#333333]",
};

const convertSecondsToTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toFixed(0).toString().padStart(2, "0")}`;
};

const TranscriptItem = ({
  transcript,
  index,
  agentName,
  counsellorName,
}: {
  agentName: string;
  counsellorName: string;
  transcript: SimulationTranscriptMessage;
  index: number;
}) => {
  const { t } = useTranslation();
  const isAIClient = transcript.senderId === -1;
  const speakerName = isAIClient
    ? agentName
      ? `${agentName} (${t("transcription.aiClientSuffix")})`
      : t("transcription.aiAgentName")
    : counsellorName || t("transcription.youName");

  return (
    <div
      key={`${transcript.id}-${transcript.startSeconds}-${index}`}
      className={`flex gap-4 p-4 border ${isAIClient ? "border-[#7E57C2] bg-[#F5F3FA]" : "border-[#6188C9] bg-[#f7fcff]"} rounded-lg`}
    >
      <div className="text-neutral-600 text-sm font-medium shrink-0 min-w-[36px] pt-[2px]">
        {convertSecondsToTime(transcript.startSeconds ?? 0)}
      </div>

      <div className="flex-1">
        <div
          className={`font-semibold text-base ${isAIClient ? "text-[#7E57C2]" : "text-[#0957D0]"}`}
        >
          {speakerName}
        </div>
        {transcript?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 my-1">
            {transcript?.tags?.map(tag => (
              <div
                key={tag.tagId}
                className={`text-typography-900 px-1 text-xs rounded-[2px] text-base leading-relaxed ${categoryColoeMap[tag.category]}`}
              >
                {tag.label}
              </div>
            ))}
          </div>
        )}
        <div className="text-typography-900 text-base leading-relaxed">{transcript.content}</div>
      </div>
    </div>
  );
};

const TranscriptListing: FC<TranscriptListingProps> = ({
  transcriptList,
  handleLoadMore,
  isLoading,
  hasMore = true,
  scrollContainerRef,
  counsellorName,
  agentName,
  className = "",
}) => {
  const { t } = useTranslation();
  const TranscriptSkeleton = () => (
    <div className="flex flex-col gap-6 w-full">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="flex gap-4 animate-pulse">
          <div className="h-6 w-14 bg-gray-200 rounded shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-gray-200 rounded shrink-0" />
            </div>
            <div className="h-6 flex-1 bg-gray-200 rounded" />
            {index % 2 === 0 && <div className="h-6 w-4/5 bg-gray-200 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading && transcriptList.length === 0) {
    return (
      <div className={`flex flex-col pt-10 -mt-10 gap-4 font-primary ${className}`}>
        <TranscriptSkeleton />
      </div>
    );
  }

  if (transcriptList.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full w-full">
        <div className="text-xxl font-primary text-typography-700">{t("transcription.empty")}</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef as RefObject<HTMLDivElement>}
      className={`flex flex-col pt-10 -mt-10 gap-4 font-primary ${className}`}
    >
      <InfiniteScroll
        onInfiniteScroll={handleLoadMore}
        isLoading={isLoading}
        hasMore={hasMore}
        scrollContainerRef={scrollContainerRef}
      >
        {transcriptList?.map((transcript, index) => (
          <TranscriptItem
            key={`${transcript.id}-${transcript.startSeconds}-${index}`}
            transcript={transcript}
            agentName={agentName}
            counsellorName={counsellorName}
            index={index}
          />
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default TranscriptListing;
