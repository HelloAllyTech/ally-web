import { FC } from "react";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";

import { TranscriptTabProps } from "./types";

const formatTime = (startSeconds: number) => {
  const roundedSeconds = Math.round(startSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const TranscriptTab: FC<TranscriptTabProps> = ({ transcriptList, handleLoadMore, isLoading }) => {
  return (
    <div className="flex-1 overflow-y-scroll p-4">
      <h3 className="font-semibold text-base mb-4">Transcript</h3>
      {transcriptList?.length > 0 ? (
        <div className="space-y-4 flex-1 mb-[12px] h-[calc(100vh-250px)] overflow-y-auto">
          <InfiniteScroll onInfiniteScroll={handleLoadMore} isLoading={isLoading}>
            {transcriptList.map(({ speaker, content, startSeconds }, index: number) => (
              <div key={`${speaker}-${index}`} className="flex">
                <span className="mr-3">{startSeconds ? formatTime(startSeconds) : ""}</span>
                <div className="flex-1 text-base">
                  <span className="font-semibold">{speaker}: </span>
                  <span className="font-primary">{content}</span>
                </div>
              </div>
            ))}
          </InfiniteScroll>
        </div>
      ) : (
        <div className="space-y-4 flex-1 mb-[12px]">
          <div className="text-sm text-typography-700">No transcript available</div>
        </div>
      )}
    </div>
  );
};

export default TranscriptTab;
