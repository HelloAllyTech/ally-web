import { FC, useEffect, useRef, useState } from "react";

import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { FEATURE_FLAGS_MAP, Toggle } from "@ally-ui-mono/ui-shared";
import {
  useCreateReviewMutation,
  useGetChatHistoryQuery,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { Comment } from "@assets";
import { AskAiTab, ReflectionTab, Button, SkillsTab } from "@components";
import { Permissions, REVIEW_PRIVACY_OPTIONS, ROUTES } from "@constants";
import { FeedbackDialog, SimulationSummary } from "@containers";
import { RootState } from "@store";
import { SessionType, SimulationSummary as SimulationSummaryType } from "@types";

import { SummarySidebarWrapper, SimulationTranscriptTab } from ".";
import { SUMMARY_FEEDBACK_TIMEOUT } from "./constants";
import { SimulationSummarySidebarProps } from "./types";

const SimulationSummarySidebar: FC<SimulationSummarySidebarProps> = ({
  summaryId,
  closeSummarySidebar,
  canShowFeedback = true,
  councellorName,
}) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);

  const hasFeedback = useRef<boolean>(false);
  const startTimeRef = useRef<number | null>(null);

  const navigate = useNavigate();

  const { user, permissions } = useSelector((state: RootState) => state.user);
  const { data: summary } = useGetSimulationSummaryQuery(summaryId);
  const [createReview, { isLoading: isCreateReviewLoading }] = useCreateReviewMutation();
  const [updateReview, { isLoading: isUpdateReviewLoading }] = useUpdateReviewMutation();
  const { data: history } = useGetChatHistoryQuery({ sessionId: summaryId });

  const onSummaryFetch = (summary: SimulationSummaryType) => {
    hasFeedback.current = summary.hasFeedback;
  };

  useEffect(() => {
    if (summaryId) {
      startTimeRef.current = Date.now();
    } else {
      startTimeRef.current = null;
    }
  }, [summaryId]);

  const hasThresholdElapsed = (): boolean => {
    if (startTimeRef.current == null) return false;
    return Date.now() - startTimeRef.current >= SUMMARY_FEEDBACK_TIMEOUT;
  };

  const handleCreateReview = async (status: string) => {
    if (summary?.reviewId) {
      await updateReview({ id: summary.reviewId, status });
    } else {
      await createReview({ scenarioSessionId: summaryId });
    }
  };

  const SidebarTitle = (
    <div className="text-base flex items-center justify-between w-full gap-2">
      <span className="font-semibold font-tertiary text-typography-800">Summary</span>

      {summary?.counselorId === user?.id && (
        <div
          className="flex items-center gap-2"
          style={{
            opacity: isCreateReviewLoading || isUpdateReviewLoading ? 0.5 : 1,
          }}
        >
          <Toggle
            items={REVIEW_PRIVACY_OPTIONS}
            initialValue={summary?.reviewStatus}
            onChange={handleCreateReview}
          />
          {summary?.reviewId && (
            <>
              <div className="border-l border-border h-5" />
              <Button
                onClick={() =>
                  navigate(ROUTES.REVIEW_DETAILS.replace(":reviewId", summary.reviewId))
                }
                variant="secondary"
                className="flex items-center justify-center h-[40px] w-[40px] p-0 shadow-lg"
              >
                <Comment className="w-5 h-5 shrink-0" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  const tabList = [
    {
      id: 1,
      label: "Summary",
      content: (
        <SimulationSummary
          summaryId={summaryId}
          className="max-h-[calc(100vh-150px)]"
          onSummaryFetch={onSummaryFetch}
        />
      ),
    },
    {
      id: 3,
      label: "Transcription",
      content: <SimulationTranscriptTab sessionId={summaryId} councellorName={councellorName} />,
    },
    ...(FEATURE_FLAGS_MAP.SUMMARY_TABS_FLAG
      ? [
          {
            id: 2,
            label: "Ask AI",
            content: <AskAiTab sessionId={summaryId} history={history} />,
          },
          {
            id: 5,
            label: "Skills",
            content: <SkillsTab sessionId={summaryId} />,
          },
          {
            id: 4,
            label: "Reflection",
            content: <ReflectionTab sessionId={summaryId} />,
          },
        ]
      : []),
  ];

  const onSidebarClose = () => {
    const overThirtySeconds = hasThresholdElapsed();

    if (
      canShowFeedback &&
      !hasFeedback.current &&
      overThirtySeconds &&
      permissions?.includes(Permissions.EDIT_SCENARIO_SESSION)
    ) {
      setShowFeedbackDialog(true);
    } else {
      closeSummarySidebar();
    }
  };

  const onCloseFeedbackDialog = () => {
    setShowFeedbackDialog(false);
    closeSummarySidebar();
  };

  return (
    <SummarySidebarWrapper tabList={tabList} onSidebarClose={onSidebarClose} title={SidebarTitle}>
      <FeedbackDialog
        open={showFeedbackDialog}
        onClose={onCloseFeedbackDialog}
        id={summaryId}
        sessionType={SessionType.SIMULATION}
      />
    </SummarySidebarWrapper>
  );
};

export default SimulationSummarySidebar;
