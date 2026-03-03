import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      speaker:
        item.senderId === -1 ? t("transcription.clientLabel") : t("transcription.counsellorLabel"),
      content: item.content,
      startSeconds: item.startSeconds,
      id: item.id || null,
      senderId: item.senderId || null,
      tags: item.tags,
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
        id:
          item?.id !== null
            ? item?.id
            : item.speaker === t("transcription.clientLabel")
              ? user?.id
              : -1,
        content: item.content,
        senderId:
          item?.senderId !== null
            ? item?.senderId
            : item.speaker === t("transcription.clientLabel")
              ? user?.id
              : -1,
        startSeconds: item.startSeconds,
        tags: item.tags,
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
    <div
      className={`relative h-[calc(100vh-140px)] custom-scrollbar p-4 border border-gray-200 rounded-md overflow-y-auto ${className}`}
    >
      <span className="text-typography-900 font-primary text-base font-medium">
        {t("postSim.tabs.annotatedTranscript")}
      </span>
      <hr className="mb-5 mt-3" />
      <TranscriptListing
        transcriptList={transcriptList}
        handleLoadMore={handleLoadMore}
        isLoading={isGetTranscriptLoading}
        hasMore={hasMoreTranscripts}
        scrollContainerRef={scrollContainerRef}
        counsellorName={councellorName}
        agentName={summary?.scenario?.metadata?.name}
      />
    </div>
  );
};

export default SimulationTranscriptTab;
