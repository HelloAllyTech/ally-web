import { FC, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { useGetTranscriptQuery } from "@api";

import { TranscriptTab } from ".";
import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { CallTranscriptTabProps, Transcript } from "./types";

const CallTranscriptTab: FC<CallTranscriptTabProps> = ({ callSummary }) => {
  const { t } = useTranslation();
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<Transcript[]>([]);

  const { data: transcriptData, isLoading: isGetTranscriptLoading } = useGetTranscriptQuery(
    {
      chatId: callSummary?.id,
      offset: transcriptOffset,
      limit: TRANSCRIPT_PAGE_SIZE,
      sortBy: "startSeconds",
    },
    { skip: !callSummary?.id },
  );

  const transcriptTotal = useMemo(() => transcriptData?.count || 0, [transcriptData]);

  const transcript = useMemo(() => {
    return transcriptData?.data?.map(item => ({
      speaker:
        item.senderId === callSummary.clientId
          ? t("transcription.clientLabel")
          : t("transcription.counsellorLabel"),
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

  const mode = callSummary.details?.callInfo?.mode || (transcriptData as any)?.mode;

  return (
    <TranscriptTab
      transcriptList={transcriptList}
      handleLoadMore={handleLoadMore}
      isLoading={isGetTranscriptLoading}
      mode={mode}
    />
  );
};

export default CallTranscriptTab;
