import { FC, useEffect, useMemo, useState } from "react";

import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP, Toggle } from "@ally-ui-mono/ui-shared/index";
import {
  useCreateReviewMutation,
  useGetSimulationSummaryQuery,
  useGetSimulationTranscriptQuery,
  useUpdateReviewMutation,
} from "@api";
import { Transcription, Button } from "@components";
import { REVIEW_PRIVACY_OPTIONS, ROUTES } from "@constants";
import { RootState } from "@store";
import { SimulationTranscriptMessage } from "@types";

import { TRANSCRIPT_PAGE_SIZE } from "./constants";
import { SimulationTranscriptTabProps } from "./types";

const SimulationTranscriptTab: FC<SimulationTranscriptTabProps> = ({ sessionId, className }) => {
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
  const { user } = useSelector((state: RootState) => state.user);
  const { data: summary } = useGetSimulationSummaryQuery(sessionId);
  const [createReview, { isLoading: isCreateReviewLoading }] = useCreateReviewMutation();
  const [updateReview, { isLoading: isUpdateReviewLoading }] = useUpdateReviewMutation();
  const navigate = useNavigate();

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

      setTranscriptList(prev => {
        // If offset is 0, replace the list (fresh fetch)
        if (transcriptOffset === 0) {
          return mappedTranscript;
        }
        // Otherwise append for pagination
        return [...prev, ...mappedTranscript];
      });
    }
  }, [transcript, transcriptOffset]);

  const handleCreateReview = async (status: string) => {
    if (summary.reviewId) {
      await updateReview({ id: summary.reviewId, status });
    } else {
      await createReview({ scenarioSessionId: sessionId });
    }
  };
  const handleLoadMore = () => {
    if (transcriptOffset >= transcript?.length) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
  };

  return (
    <div className={`h-full ${className}`}>
      <div className="relative h-[calc(100%-170px)]">
        <Transcription
          transcriptList={transcriptList}
          userId={user?.id}
          handleLoadMore={handleLoadMore}
          isLoading={isGetTranscriptLoading}
          className="h-full overflow-y-auto !pt-0 custom-scrollbar mt-1 pb-16"
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>
      {FEATURE_FLAGS_MAP.PEER_REVIEW_FLAG && (
        <>
          <div
            className="flex flex-row justify-center gap-2 align-center rounded-full border-[0.5px] p-2 shadow-[2.13px_2.84px_7.81px_0px_#A09E9E1A]"
            style={{
              opacity: isCreateReviewLoading || isUpdateReviewLoading ? 0.5 : 1,
            }}
          >
            <Toggle
              items={REVIEW_PRIVACY_OPTIONS}
              initialValue={summary.reviewStatus}
              onChange={handleCreateReview}
            />
            {summary.reviewId && (
              <Button
                onClick={() =>
                  navigate(ROUTES.REVIEW_DETAILS.replace(":reviewId", summary.reviewId))
                }
                variant="secondary"
                className="flex justify-center h-[40px]"
              >
                Show Comments
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SimulationTranscriptTab;
