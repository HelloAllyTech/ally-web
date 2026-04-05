import { FC, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { useGetAudioUrlQuery, useGetSimulationTranscriptQuery } from "@api";
import { TranscriptListing } from "@components";
import { RootState } from "@store";
import { SimulationTranscriptMessage } from "@types";

import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { SimulationTranscriptTabProps } from "./types";

const SimulationTranscriptTab: FC<SimulationTranscriptTabProps> = ({
  sessionId,
  className,
  councellorName,
  agentName,
}) => {
  const { t } = useTranslation();
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
  const [hasMoreTranscripts, setHasMoreTranscripts] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  /** Blocks stacking multiple load-more calls before the in-flight fetch finishes (prevents batched offset 0→40). */
  const pagingLockRef = useRef(false);
  const wasTranscriptFetchingRef = useRef(false);

  const { user } = useSelector((state: RootState) => state.user);

  const {
    data: transcriptData,
    isFetching: isTranscriptFetching,
    isLoading: isTranscriptLoading,
  } = useGetSimulationTranscriptQuery({
    sessionId,
    offset: transcriptOffset,
    limit: TRANSCRIPT_PAGE_SIZE,
    sortBy: "createdAt",
  });

  const { data: audioUrlData } = useGetAudioUrlQuery({ sessionId });

  const transcriptQueryBusy = isTranscriptFetching || isTranscriptLoading;

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
    pagingLockRef.current = false;
    wasTranscriptFetchingRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (wasTranscriptFetchingRef.current && !transcriptQueryBusy) {
      pagingLockRef.current = false;
    }
    wasTranscriptFetchingRef.current = transcriptQueryBusy;
  }, [transcriptQueryBusy]);

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

      let appendHadNoNewRows = false;
      setTranscriptList(prev => {
        if (transcriptOffset === 0) {
          return mappedTranscript;
        }

        const existingIds = new Set(prev.map(item => `${item.id}-${item.startSeconds}`));
        const newItems = mappedTranscript.filter(
          item => !existingIds.has(`${item.id}-${item.startSeconds}`),
        );

        if (newItems.length > 0) {
          return [...prev, ...newItems];
        }

        appendHadNoNewRows = mappedTranscript.length > 0;
        return prev;
      });

      if (transcriptOffset === 0) {
        setHasMoreTranscripts(transcript.length >= TRANSCRIPT_PAGE_SIZE);
      } else if (appendHadNoNewRows) {
        setHasMoreTranscripts(false);
      } else {
        setHasMoreTranscripts(transcript.length >= TRANSCRIPT_PAGE_SIZE);
      }
    } else if (transcript?.length === 0) {
      // No more transcripts available
      setHasMoreTranscripts(false);
    }

    if (transcriptOffset > 0 && transcript && transcript.length > 0) {
      pagingLockRef.current = false;
    }
  }, [transcript, transcriptOffset, user?.id, t]);

  const handleLoadMore = () => {
    if (!hasMoreTranscripts || transcriptQueryBusy || pagingLockRef.current) return;
    pagingLockRef.current = true;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };

  return (
    <div
      ref={scrollContainerRef}
      className={`relative flex h-full min-h-0 flex-col overflow-y-auto border border-gray-200 rounded-md p-2 custom-scrollbar ${className}`}
    >
      <span className="text-typography-900 font-primary text-base font-medium">
        {t("postSim.tabs.annotatedTranscript")}
      </span>
      <hr className="mb-5 mt-2 border-border-light" />
      <TranscriptListing
        transcriptList={transcriptList}
        handleLoadMore={handleLoadMore}
        isLoading={transcriptQueryBusy}
        hasMore={hasMoreTranscripts}
        scrollContainerRef={scrollContainerRef}
        counsellorName={councellorName}
        agentName={agentName}
        audioUrl={audioUrlData?.presignedUrl}
      />
    </div>
  );
};

export default SimulationTranscriptTab;
