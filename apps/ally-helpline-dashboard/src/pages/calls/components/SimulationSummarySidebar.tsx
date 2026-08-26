import { FC, useEffect, useMemo, useRef, useState } from "react";

import { differenceInMinutes } from "date-fns";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useCreateReviewMutation,
  useGetAvailableLanguagesQuery,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { Comment } from "@assets";
import { AskAiTab, SessionRatingTrigger, ToggleSwitch, ShareForReview } from "@components";
import { Permissions, REVIEW_PRIVACY_OPTIONS_VALUES, ROUTES } from "@constants";
import { FeedbackDialog, SimulationSummary, useSimulationSummaryPolling } from "@containers";
import { RootState } from "@store";
import { SessionType, ShareForReviewsInput } from "@types";

import { SummarySidebarWrapper, SimulationTranscriptTab } from ".";
import { SimulationSummarySidebarProps } from "./types";

const SimulationSummarySidebar: FC<SimulationSummarySidebarProps> = ({
  summaryId,
  closeSummarySidebar,
  canShowFeedback = true,
  councellorName,
}) => {
  const { t, i18n } = useTranslation();
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const [shareForReview, setShareForReview] = useState<boolean>(false);

  const hasFeedback = useRef<boolean>(false);
  const openedFromCloseGuardRef = useRef<boolean>(false);

  const [rating, setRating] = useState<number | null>(null);

  const navigate = useNavigate();

  const { user, permissions } = useSelector((state: RootState) => state.user);
  const { data: summary, refetch } = useGetSimulationSummaryQuery(
    { sessionId: summaryId, languageCode: i18n.language },
    { skip: !summaryId },
  );
  const { summaryData, retryMaxReached, isShortSession } = useSimulationSummaryPolling(
    summaryId,
    i18n.language,
  );
  const [createReview, { isLoading: isCreateReviewLoading }] = useCreateReviewMutation();
  const [updateReview, { isLoading: isUpdateReviewLoading }] = useUpdateReviewMutation();

  const { data: availableLanguages } = useGetAvailableLanguagesQuery({});
  const originalLanguageCode = useMemo(() => {
    const languageId = summary?.metadata?.languageId;
    if (!languageId) return "en";
    const matchedLanguage = availableLanguages?.find(
      language => language.language_id === languageId,
    );
    return matchedLanguage?.value?.split("-")[0] ?? "en";
  }, [summary?.metadata?.languageId, availableLanguages]);

  useEffect(() => {
    if (summaryData) {
      hasFeedback.current = summaryData.hasFeedback;
    }
  }, [summaryData]);

  const handleCreateReview = async ({
    note,
    scenarioSessionId,
    status,
  }: {
    note?: string;
    scenarioSessionId?: string;
    status: string;
  }) => {
    const normalizedNote = note?.trim() || null;
    const isExpired = differenceInMinutes(new Date(), new Date(summary?.reviewCreatedAt)) >= 10;
    try {
      if (summary?.reviewId) {
        const params: ShareForReviewsInput = {
          scenarioSessionId: summary.reviewId,
          status,
        };
        if (status !== REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN && !isExpired)
          params.note = normalizedNote;
        await updateReview(params).unwrap();
      } else {
        const params: { scenarioSessionId: string; status: string; note?: string } = {
          scenarioSessionId: scenarioSessionId,
          status,
          note: normalizedNote,
        };

        await createReview(params).unwrap();
      }
    } catch (err: any) {
      const message =
        err?.data?.message ?? err?.message ?? "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  const handleToggleChange = (value: string) => {
    if (value === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW) {
      setShareForReview(true);
    } else {
      handleCreateReview({ status: value });
    }
  };

  const displayRating = rating ?? summary?.sessionFeedback?.rating ?? 0;

  const handleStarSelect = (star: number) => {
    setRating(star);
    openedFromCloseGuardRef.current = false;
    setShowFeedbackDialog(true);
  };

  const SidebarTitle = (
    <div className="text-base flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold font-tertiary text-typography-800">
          {t("common.summary", "Summary")}
        </span>
        {!isShortSession && (
          <SessionRatingTrigger value={displayRating} onSelect={handleStarSelect} size="sm" />
        )}
      </div>

      {!isShortSession && summary?.counselorId === user?.id && (
        <div
          className="flex items-center gap-2 font-primary font-medium"
          style={{
            opacity: isCreateReviewLoading || isUpdateReviewLoading ? 0.5 : 1,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-primary font-normal text-sm">
              {t("postSim.common.shareForReview")}
            </span>
            <ToggleSwitch
              enabled={summary?.reviewStatus === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW}
              onChange={(value: boolean) => {
                handleToggleChange(
                  value
                    ? REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW
                    : REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN,
                );
              }}
            />
          </div>
          {summary?.reviewId && (
            <>
              <div className="border-l border-border h-5" />
              <Tooltip label="Comments" align="top">
                <button
                  onClick={() =>
                    navigate(
                      ROUTES.SIMULATION_REVIEW_DETAILS?.replace(":reviewId", summary.reviewId),
                    )
                  }
                  className="flex items-center justify-center h-[40px] w-[40px] p-0 relative"
                >
                  <Comment className="w-6 h-6 shrink-0" />
                  {/* <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{TODO: Add count of unread messages}</div> */}
                </button>
              </Tooltip>
            </>
          )}
        </div>
      )}
      <ShareForReview
        isOpen={shareForReview}
        onClose={() => {
          setShareForReview(false);
        }}
        summaryDetails={summary}
        onNoteChange={(note: string) => {
          handleCreateReview({
            scenarioSessionId: summaryId,
            note: note,
            status: REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW,
          });
        }}
        tag="Simulation"
      />
    </div>
  );

  const tabList = [
    {
      id: 3,
      label: t("postSim.tabs.annotatedTranscript", "Annotated Transcript"),
      content: (
        <SimulationTranscriptTab
          sessionId={summaryId}
          councellorName={councellorName}
          agentName={summary?.scenario?.metadata?.name}
          originalLanguageCode={originalLanguageCode}
          className=" px-4 pt-[10px]"
        />
      ),
    },
    {
      id: 2,
      label: t("postSim.tabs.askAi", "Ask AI"),
      content: (
        <AskAiTab
          sessionId={summaryId}
          councellorName={councellorName}
          agentName={summary?.scenario?.metadata?.name}
        />
      ),
    },
    {
      id: 1,
      label: t("postSim.tabs.sessionReview", "Session Review"),
      content: (
        <SimulationSummary
          sessionId={summaryId}
          summaryData={summaryData}
          retryMaxReached={retryMaxReached}
          className="h-full min-h-0 flex flex-col overflow-hidden"
        />
      ),
    },
  ];

  const onSidebarClose = () => {
    if (
      // Short sessions never render the feedback UI (SummarySidebarWrapper drops
      // {children} — the FeedbackDialog — in the short-session branch), so the
      // close guard must skip them; otherwise it opens a dialog that isn't
      // mounted and the drawer can never be closed.
      !isShortSession &&
      canShowFeedback &&
      !hasFeedback.current &&
      permissions?.includes(Permissions.EDIT_SCENARIO_SESSION)
    ) {
      openedFromCloseGuardRef.current = true;
      setShowFeedbackDialog(true);
    } else {
      closeSummarySidebar();
    }
  };

  const onCloseFeedbackDialog = () => {
    setShowFeedbackDialog(false);
    setRating(null);
    if (openedFromCloseGuardRef.current) closeSummarySidebar();
  };

  const onFeedbackSubmitted = () => {
    hasFeedback.current = true;
    refetch();
    setShowFeedbackDialog(false);
    setRating(null);
    if (openedFromCloseGuardRef.current) closeSummarySidebar();
  };

  return (
    <SummarySidebarWrapper
      isShortSession={isShortSession}
      summaryData={summaryData}
      tabList={tabList}
      onSidebarClose={onSidebarClose}
      title={SidebarTitle}
    >
      <FeedbackDialog
        open={showFeedbackDialog}
        onClose={onCloseFeedbackDialog}
        onSubmitComplete={onFeedbackSubmitted}
        id={summaryId}
        sessionType={SessionType.SIMULATION}
        initialRating={rating ?? summary?.sessionFeedback?.rating}
        initialComment={summary?.sessionFeedback?.feedback}
        initialTags={
          rating === null || rating === summary?.sessionFeedback?.rating
            ? summary?.sessionFeedback?.tags
            : undefined
        }
      />
    </SummarySidebarWrapper>
  );
};

export default SimulationSummarySidebar;
