import { FC, useRef } from "react";

import { useTranslation } from "react-i18next";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { ScribeSessionMode } from "@constants";

import { TranscriptTabProps } from "./types";

const formatTime = (startSeconds: number) => {
  const roundedSeconds = Math.round(startSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const TranscriptTab: FC<TranscriptTabProps> = ({
  transcriptList,
  handleLoadMore,
  isLoading,
  hasMore = true,
  mode,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isDictationMode = mode === ScribeSessionMode.DICTATION;

  return (
    <div className="flex-1 p-4 font-primary">
      <h3 className="font-semibold text-base mb-4">{t("transcription.title")}</h3>
      {transcriptList?.length > 0 ? (
        <div
          ref={scrollContainerRef}
          className="space-y-4 flex-1 mb-[12px] h-[calc(100dvh-250px)] overflow-y-auto"
        >
          <InfiniteScroll
            onInfiniteScroll={handleLoadMore}
            isLoading={isLoading}
            hasMore={hasMore}
            scrollContainerRef={scrollContainerRef}
          >
            {isDictationMode
              ? transcriptList.map((item, index) => (
                  <div
                    key={`dictation-${index}`}
                    className="text-base font-primary leading-relaxed text-typography-900 ph-mask"
                  >
                    {item.content}
                  </div>
                ))
              : transcriptList.map(({ speaker, content, startSeconds }, index: number) => (
                  <div key={`${speaker}-${index}`} className="flex">
                    <span className="mr-3">
                      {typeof startSeconds === "number" ? formatTime(startSeconds) : ""}
                    </span>
                    <div className="flex-1 text-base">
                      <span className="font-semibold">{speaker}: </span>
                      <span className="font-primary ph-mask">{content}</span>
                    </div>
                  </div>
                ))}
          </InfiniteScroll>
        </div>
      ) : (
        <div className="space-y-4 flex-1 mb-[12px]">
          <div className="text-sm text-typography-700">{t("transcription.empty")}</div>
        </div>
      )}
    </div>
  );
};

export default TranscriptTab;
