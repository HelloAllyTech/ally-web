import { FC, useEffect, useMemo, useState } from "react";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { useGetTranscriptQuery } from "@api";
import { CallProvider } from "@constants";

import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { CallTranscriptTabProps, Transcript } from "./types";

const CallTranscriptTab: FC<CallTranscriptTabProps> = ({ callSummary }) => {
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<Transcript[]>([]);

  const { data: transcriptData, isLoading: isGetTranscriptLoading } = useGetTranscriptQuery({
    chatId: callSummary?.id,
    offset: transcriptOffset,
    limit: TRANSCRIPT_PAGE_SIZE,
    sortBy:
      callSummary?.details?.callInfo?.provider === CallProvider.WEBRTC
        ? "createdAt"
        : "startSeconds",
  });

  const transcriptTotal = useMemo(() => transcriptData?.count || 0, [transcriptData]);
  const transcript = useMemo(() => transcriptData?.data || [], [transcriptData]);

  // Reset transcript list when call changes
  useEffect(() => {
    setTranscriptOffset(0);
  }, [callSummary?.id]);

  // Append new results when transcriptData changes
  useEffect(() => {
    if (transcript.length > 0) {
      setTranscriptList(prev => [...prev, ...transcript]);
    }
  }, [transcript]);

  const handleLoadMore = () => {
    if (transcriptOffset >= transcriptTotal) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };

  const renderTranscript = (item: Transcript, index: number) => {
    const { content, senderId } = item;
    let speaker = "User";
    if (senderId === callSummary.clientId) {
      speaker = "Client";
    } else if (senderId === callSummary.counselorId) {
      speaker = "Counsellor";
    } else {
      speaker = `User ${senderId}`;
    }

    // TODO: Removing as not used anymore
    // window.handleCommentClick = (comment: string) => {
    //   setSelectedComment(comment === selectedComment ? "" : comment);
    // };

    // Just display the content as plain text, no regex or highlighting
    return (
      <div key={`${senderId}-${index}`} className="flex">
        <div className="flex-1 text-sm">
          <span className="font-semibold">{speaker}: </span>
          <span className="font-['IBM_Plex_Serif']">{content}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-scroll p-4">
      <h3 className="font-semibold text-sm mb-4">Transcript</h3>
      {transcriptList.length > 0 ? (
        <div className="space-y-4 flex-1 mb-[12px] h-[calc(100vh-250px)] overflow-y-auto">
          <InfiniteScroll onInfiniteScroll={handleLoadMore} isLoading={isGetTranscriptLoading}>
            {transcriptList.map((item: Transcript, index: number) => renderTranscript(item, index))}
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

export default CallTranscriptTab;
