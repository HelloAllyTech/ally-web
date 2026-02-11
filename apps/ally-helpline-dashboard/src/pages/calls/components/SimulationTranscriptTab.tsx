import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useSelector } from "react-redux";

import { useGetSimulationTranscriptQuery } from "@api";
import { TranscriptListing } from "@components";
import { RootState } from "@store";
import { SimulationTranscriptMessage } from "@types";

import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { SimulationTranscriptTabProps } from "./types";

const SimulationTranscriptTab: FC<SimulationTranscriptTabProps> = ({
  sessionId,
  className,
  councellorName,
  summary,
}) => {
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
  const [hasMoreTranscripts, setHasMoreTranscripts] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { user } = useSelector((state: RootState) => state.user);

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
      id: item.id || null,
      senderId: item.senderId || null,
    }));
  }, [transcriptData]);

  // Reset transcript list when sessionId changes
  useEffect(() => {
    setTranscriptList([]);
    setTranscriptOffset(0);
    setHasMoreTranscripts(true);
  }, [sessionId]);

  // Append new results when transcriptData changes
  useEffect(() => {
    if (transcript?.length > 0) {
      const mappedTranscript = transcript.map(item => ({
        id: item?.id !== null ? item?.id : item.speaker === "Client" ? user?.id : -1,
        content: item.content,
        senderId:
          item?.senderId !== null ? item?.senderId : item.speaker === "Client" ? user?.id : -1,
        startSeconds: item.startSeconds,
      }));

      // Update hasMoreTranscripts based on the number of items returned
      setHasMoreTranscripts(transcript.length >= TRANSCRIPT_PAGE_SIZE);

      setTranscriptList(prev => {
        // If offset is 0, replace the list (fresh fetch)
        if (transcriptOffset === 0) {
          return mappedTranscript;
        }

        // Check for duplicates before appending
        const existingIds = new Set(prev.map(item => `${item.id}-${item.startSeconds}`));
        const newItems = mappedTranscript.filter(
          item => !existingIds.has(`${item.id}-${item.startSeconds}`),
        );

        // Only append if there are new items
        if (newItems.length > 0) {
          return [...prev, ...newItems];
        }
        return prev;
      });
    } else if (transcript?.length === 0) {
      // No more transcripts available
      setHasMoreTranscripts(false);
    }
  }, [transcript, user?.id]);

  const handleLoadMore = () => {
    // Don't load more if we're already loading or if there are no more transcripts
    if (isGetTranscriptLoading || !hasMoreTranscripts) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };

  return (
    <div className={`h-full ${className}`}>
      <div className="relative h-[calc(100%-140px)] ">
        <TranscriptListing
          transcriptList={transcriptList}
          handleLoadMore={handleLoadMore}
          isLoading={isGetTranscriptLoading}
          hasMore={hasMoreTranscripts}
          scrollContainerRef={scrollContainerRef}
          className="h-full overflow-y-auto !pt-0 custom-scrollbar mt-1 "
          counsellorName={councellorName}
          agentName={summary?.scenario?.metadata?.name}
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t  to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default SimulationTranscriptTab;
