import { FC, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP, Toggle } from "@ally-ui-mono/ui-shared";
import {
  useCreateReviewMutation,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { Comment } from "@assets";
import {
  AskAiTab,
  ReflectionTab,
  Button,
  SkillsTab,
  ToggleSwitch,
  ShareForReview,
} from "@components";
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
  const { t } = useTranslation();
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const [shareForReview, setShareForReview] = useState<boolean>(false);
  const [reviewStatus, setReviewStatus] = useState<string>("HIDDEN");

  const hasFeedback = useRef<boolean>(false);
  const startTimeRef = useRef<number | null>(null);

  const navigate = useNavigate();

  const { user, permissions } = useSelector((state: RootState) => state.user);
  const { data: summary } = useGetSimulationSummaryQuery(summaryId);
  const [createReview, { isLoading: isCreateReviewLoading }] = useCreateReviewMutation();
  const [updateReview, { isLoading: isUpdateReviewLoading }] = useUpdateReviewMutation();

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

  useEffect(() => {
    if (summary?.reviewStatus != null) {
      setReviewStatus(summary.reviewStatus);
    }
  }, [summary?.reviewStatus]);

  const hasThresholdElapsed = (): boolean => {
    if (startTimeRef.current == null) return false;
    return Date.now() - startTimeRef.current >= SUMMARY_FEEDBACK_TIMEOUT;
  };
  const handleCreateReview = async ({
    note,
    scenarioSessionId,
  }: {
    note?: string;
    scenarioSessionId: string;
  }) => {
    try {
      if (summary?.reviewId) {
        await updateReview({
          id: summary.reviewId,
          updateReviewInput: { note: note, status: reviewStatus },
        }).unwrap();
      } else {
        await createReview({
          scenarioSessionId: scenarioSessionId,
          note: note,
          status: reviewStatus,
        }).unwrap();
      }
    } catch (err: any) {
      const message =
        err?.data?.message ?? err?.message ?? "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  const handleToggleChange = (value: string) => {
    setReviewStatus(value);
    setShareForReview(value === "IN_REVIEW");
  };
  const SidebarTitle = (
    <div className="text-base flex items-center justify-between w-full gap-2">
      <span className="font-semibold font-tertiary text-typography-800">
        {t("common.summary", "Summary")}
      </span>

      {summary?.counselorId === user?.id && (
        <div
          className="flex items-center gap-2 font-primary font-medium"
          style={{
            opacity: isCreateReviewLoading || isUpdateReviewLoading ? 0.5 : 1,
          }}
        >
          {FEATURE_FLAGS_MAP.SHARE_FOR_REVIEW_FLAG ? (
            <div className="flex items-center gap-2">
              <span className="font-primary font-medium text-sm">Share for review</span>
              <ToggleSwitch
                enabled={reviewStatus === "IN_REVIEW"}
                onChange={(value: boolean) => {
                  handleToggleChange(value ? "IN_REVIEW" : "HIDDEN");
                }}
              />
            </div>
          ) : (
            <Toggle
              items={REVIEW_PRIVACY_OPTIONS(t)}
              initialValue={summary?.reviewStatus}
              onChange={() => {}}
            />
          )}
          {summary?.reviewId && (
            <>
              <div className="border-l border-border h-5" />
              <Button
                onClick={() =>
                  navigate(ROUTES.REVIEW_DETAILS.replace(":reviewId", summary.reviewId))
                }
                variant="secondary"
                className="flex items-center justify-center h-[40px] w-[40px] p-0 shadow-lg relative"
              >
                <Comment className="w-5 h-5 shrink-0" />
                {/* <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{TODO: Add count of unread messages}</div> */}
              </Button>
            </>
          )}
        </div>
      )}
      <ShareForReview
        isOpen={FEATURE_FLAGS_MAP.SHARE_FOR_REVIEW_FLAG && shareForReview}
        onClose={() => {
          setShareForReview(false);
        }}
        summaryDetails={summary}
        onNoteChange={(note: string) => {
          handleCreateReview({ scenarioSessionId: summaryId, note: note });
        }}
      />
    </div>
  );

  const tabList = [
    {
      id: 1,
      label: t("postSim.tabs.sessionReview", "Session Review"),
      content: (
        <SimulationSummary
          summaryId={summaryId}
          className="max-h-[calc(100vh-150px)]"
          onSummaryFetch={onSummaryFetch}
        />
      ),
    },
    ...(FEATURE_FLAGS_MAP.SUMMARY_TABS_FLAG && summary?.counselorId === user?.id
      ? [
          {
            id: 2,
            label: t("postSim.tabs.askAi", "Ask AI"),
            content: <AskAiTab sessionId={summaryId} />,
          },
        ]
      : []),
    {
      id: 3,
      label: t("postSim.tabs.annotatedTranscript", "Annotated Transcript"),
      content: <SimulationTranscriptTab sessionId={summaryId} councellorName={councellorName} />,
    },
    ...(FEATURE_FLAGS_MAP.SUMMARY_TABS_FLAG
      ? [
          {
            id: 5,
            label: t("postSim.tabs.skillsDemonstrated", "Skills Demonstrated"),
            content: <SkillsTab sessionId={summaryId} />,
          },
          {
            id: 4,
            label: t("postSim.tabs.deeperReflection", "Deeper Reflection"),
            content: <ReflectionTab sessionId={summaryId} className="flex-col" />,
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
