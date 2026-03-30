import { FC, useEffect, useMemo, useState } from "react";

import { useGetSimulationTranscriptQuery } from "@api";

import { TranscriptTab } from ".";
import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { SimulationTranscriptTabProps, Transcript } from "./types";

const SimulationTranscriptTab: FC<SimulationTranscriptTabProps> = ({ sessionId }) => {
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<Transcript[]>([]);

  const { data: transcriptData, isLoading: isGetTranscriptLoading } =
    useGetSimulationTranscriptQuery({
      sessionId,
      offset: transcriptOffset,
      limit: TRANSCRIPT_PAGE_SIZE,
      sortBy: "createdAt",
    });

  const transcript = useMemo(() => {
    return transcriptData?.messages?.map(item => ({
      speaker: item.senderId === -1 ? "Client" : "Counsellor",
      content: item.content,
      startSeconds: item.startSeconds,
    }));
  }, [transcriptData]);

  // Reset transcript list when sessionId changes
  useEffect(() => {
    setTranscriptOffset(0);
  }, [sessionId]);

  // Append new results when transcriptData changes
  useEffect(() => {
    if (transcript?.length > 0) {
      setTranscriptList(prev => [...prev, ...transcript]);
    }
  }, [transcript]);

  const handleLoadMore = () => {
    if (transcriptOffset >= transcript?.length) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };

  return (
    <TranscriptTab
      transcriptList={transcriptList}
      handleLoadMore={handleLoadMore}
      isLoading={isGetTranscriptLoading}
    />
  );
};

export default SimulationTranscriptTab;
