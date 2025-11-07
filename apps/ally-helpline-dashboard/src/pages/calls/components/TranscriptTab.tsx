import { FC } from "react";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";

import { TranscriptTabProps } from "./types";

const TranscriptTab: FC<TranscriptTabProps> = ({ transcriptList, handleLoadMore, isLoading }) => {
  return (
    <div className="flex-1 overflow-y-scroll p-4">
      <h3 className="font-semibold text-sm mb-4">Transcript</h3>
      {transcriptList?.length > 0 ? (
        <div className="space-y-4 flex-1 mb-[12px] h-[calc(100vh-250px)] overflow-y-auto">
          <InfiniteScroll onInfiniteScroll={handleLoadMore} isLoading={isLoading}>
            {transcriptList.map(({ speaker, content }, index: number) => (
              <div key={`${speaker}-${index}`} className="flex">
                <div className="flex-1 text-sm">
                  <span className="font-semibold">{speaker}: </span>
                  <span className="font-primary">{content}</span>
                </div>
              </div>
            ))}
          </InfiniteScroll>
        </div>
      ) : (
        <div className="space-y-4 flex-1 mb-[12px]">
          <div className="text-sm text-gray-500">No transcript available</div>
        </div>
      )}
    </div>
  );
};

export default TranscriptTab;
