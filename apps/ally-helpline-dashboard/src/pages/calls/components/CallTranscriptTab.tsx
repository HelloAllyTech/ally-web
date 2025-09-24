import { FC, useEffect, useMemo, useState } from "react";

import { useGetTranscriptQuery } from "@api";

import { TranscriptTab } from ".";
import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { CallTranscriptTabProps, Transcript } from "./types";

const CallTranscriptTab: FC<CallTranscriptTabProps> = ({ callSummary }) => {
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<Transcript[]>([]);

  const { data: transcriptData, isLoading: isGetTranscriptLoading } = useGetTranscriptQuery({
    chatId: callSummary?.id,
    offset: transcriptOffset,
    limit: TRANSCRIPT_PAGE_SIZE,
    sortBy: "startSeconds",
  });

  const transcriptTotal = useMemo(() => transcriptData?.count || 0, [transcriptData]);

  const transcript = useMemo(() => {
    return transcriptData?.data?.map(item => ({
      speaker: item.senderId === callSummary.clientId ? "Client" : "Counsellor",
      content: item.content,
    }));
  }, [transcriptData, callSummary]);

  // Reset transcript list when call changes
  useEffect(() => {
    setTranscriptOffset(0);
  }, [callSummary?.id]);

  // Append new results when transcriptData changes
  useEffect(() => {
    if (transcript?.length > 0) {
      setTranscriptList(prev => [...prev, ...transcript]);
    }
  }, [transcript]);

  const handleLoadMore = () => {
    if (transcriptOffset >= transcriptTotal) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };

  // TODO: Removing as not used anymore
  // window.handleCommentClick = (comment: string) => {
  //   setSelectedComment(comment === selectedComment ? "" : comment);
  // };

  return (
    <TranscriptTab
      transcriptList={transcriptList}
      handleLoadMore={handleLoadMore}
      isLoading={isGetTranscriptLoading}
    />
  );
};

export default CallTranscriptTab;
