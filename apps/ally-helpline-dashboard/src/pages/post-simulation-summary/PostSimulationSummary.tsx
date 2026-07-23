import { FC, useEffect, useRef, useState } from "react";

import { differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Tabs } from "@ally-ui-mono/ui-shared";
import {
  useCreateReviewMutation,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { BackCircle, Comment } from "@assets";
import {
  AskAiTab,
  Button,
  NextChallengeCard,
  ReflectionTab,
  SessionRatingTrigger,
  ShareForReview,
  SkillsTab,
  ToggleSwitch,
} from "@components";
import { REVIEW_PRIVACY_OPTIONS_VALUES, ROUTES } from "@constants";
import {
  FeedbackDialog,
  ShortSessionUI,
  SimulationSummary,
  useSimulationSummaryPolling,
} from "@containers";
import { useNextChallenge } from "@hooks";
import { pageType, SessionType, ShareForReviewsInput } from "@types";

import { UpNextTab } from "./components";
import { SimulationTranscriptTab } from "../calls/components";
import { containerVariants } from "../learn/constants";

export const PostSimulationSummary: FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const {
    data: summary,
    isLoading,
    refetch,
  } = useGetSimulationSummaryQuery(
    { sessionId: sessionId ?? "", languageCode: i18n.language },
    { skip: !sessionId },
  );
  const { summaryData, retryMaxReached, isShortSession } = useSimulationSummaryPolling(
    sessionId,
    i18n.language,
  );
  const [createReview] = useCreateReviewMutation();
  const [updateReview] = useUpdateReviewMutation();
  const nextChallenge = useNextChallenge(summary);

  const tabList = [
    {
      id: 1,
      label: t("postSim.tabs.sessionReview"),
      content: (
        <SimulationSummary
          sessionId={sessionId ?? ""}
          summaryData={summaryData}
          retryMaxReached={retryMaxReached}
          className="h-full min-h-0 flex flex-col overflow-hidden"
        />
      ),
    },
    {
      id: 4,
      label: t("postSim.tabs.askAi"),
      content: <AskAiTab sessionId={sessionId} agentName={summary?.scenario?.metadata?.name} />,
    },
    {
      id: 2,
      label: t("postSim.tabs.annotatedTranscript"),
      content: (
        <SimulationTranscriptTab
          sessionId={sessionId}
          className="w-full"
          agentName={summary?.scenario?.metadata?.name}
        />
      ),
    },
    {
      id: 5,
      label: t("postSim.tabs.skillsDemonstrated"),
      content: <SkillsTab sessionId={sessionId} retryMaxReached={retryMaxReached} />,
    },
    {
      id: 6,
      label: t("postSim.tabs.deeperReflection"),
      content: <ReflectionTab sessionId={sessionId} />,
    },
    ...(summary?.scenarioPathSessionItemId || summary?.caseSessionItemId
      ? [
          {
            id: 3,
            label: t("postSim.tabs.upNext"),
            content: (
              <UpNextTab
                sessionId={sessionId}
                pageType={summary?.scenarioPathSessionItemId ? pageType.TRACK : pageType.CASE}
                metaData={summary?.metadata}
              />
            ),
          },
        ]
      : []),
  ];

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hasFeedback, setHasFeedback] = useState<boolean>(false);

  useEffect(() => {
    if (summary?.hasFeedback) setHasFeedback(true);
  }, [summary?.hasFeedback]);

  const [selectedTab, setSelectedTab] = useState<number>(tabList?.[0].id);
  const [shareForReview, setShareForReview] = useState<boolean>(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const feedbackDialogEvaluatedRef = useRef<boolean>(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // When the trainer has disabled the AI feedback summary for this scenario,
  // we skip the evaluation surface entirely. Default to enabled when the flag
  // is missing (legacy scenarios).
  const feedbackEnabled = summary?.scenario?.metadata?.enableFeedback !== false;

  useEffect(() => {
    if (summaryData && !isLoading && !feedbackDialogEvaluatedRef.current) {
      feedbackDialogEvaluatedRef.current = true;
      if (!summary?.hasFeedback) {
        setFeedbackOpen(true);
      }
    }
  }, [summaryData, isLoading, summary]);

  // Feedback-disabled flow: as soon as the scenario config loads, either prompt
  // for the star rating (if not yet given) or go straight to the role-play list.
  useEffect(() => {
    if (!summary || feedbackEnabled) return;
    if (summary.hasFeedback) {
      navigate(ROUTES.LEARN);
    } else {
      setFeedbackOpen(true);
    }
  }, [summary, feedbackEnabled, navigate]);

  const handleCreateReview = async (status: string, note?: string) => {
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
        const params: ShareForReviewsInput = {
          scenarioSessionId: sessionId ?? "",
          status,
          note: normalizedNote,
        };
        await createReview(params).unwrap();
      }
    } catch (err: any) {
      toast.error(err?.data?.message ?? t("common.somethingWentWrong"));
    }
  };

  const handleToggleChange = (value: string) => {
    if (value === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW) {
      setShareForReview(true);
    } else {
      handleCreateReview(value);
    }
  };

  const getTabContent = () => tabList.find(tab => tab.id === selectedTab)?.content;

  const handleStarSelect = (rating: number) => {
    setRating(rating);
    setFeedbackOpen(true);
  };

  const flushPendingNavigation = () => {
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  };

  const handleFeedbackClose = () => {
    setFeedbackOpen(false);
    setRating(null);
    flushPendingNavigation();
  };

  const handleFeedbackSubmitted = () => {
    setHasFeedback(true);
    setFeedbackOpen(false);
    setRating(null);
    refetch();
    flushPendingNavigation();
  };

  const guardExit = (nav: () => void) => {
    if (!hasFeedback) {
      pendingNavigationRef.current = nav;
      setFeedbackOpen(true);
    } else {
      nav();
    }
  };

  const displayRating = rating ?? summary?.sessionFeedback?.rating ?? 0;

  // Wait for the scenario config to resolve before deciding what to render.
  // Otherwise feedbackEnabled defaults to true during loading and the full
  // evaluation summary flashes on scenarios where the trainer disabled it.
  if (isLoading) {
    return (
      <div className="flex h-[100dvh] min-h-0 w-full items-center justify-center overflow-hidden bg-white" />
    );
  }

  // Feedback disabled: render only the star-rating dialog; submitting or
  // dismissing it returns the learner to the role-play list.
  if (summary && !feedbackEnabled) {
    return (
      <div className="flex h-[100dvh] min-h-0 w-full flex-col items-center overflow-hidden bg-white">
        <FeedbackDialog
          open={feedbackOpen}
          onClose={() => navigate(ROUTES.LEARN)}
          onSubmitComplete={() => navigate(ROUTES.LEARN)}
          id={sessionId ?? ""}
          sessionType={SessionType.SIMULATION}
          initialRating={summary?.sessionFeedback?.rating}
          initialComment={summary?.sessionFeedback?.feedback}
          initialTags={summary?.sessionFeedback?.tags}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 w-full flex-col items-center overflow-hidden bg-white pb-10">
      <FeedbackDialog
        open={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        id={sessionId ?? ""}
        sessionType={SessionType.SIMULATION}
      />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-6 self-center px-4 pb-8 sm:pb-16 sm:px-6 items-center"
      >
        <div className="mt-8 flex w-full shrink-0 items-center justify-between">
          <div className="flex items-center gap-2 text-black text-2xl sm:text-4xl font-normal text-left font-secondary">
            <button onClick={() => guardExit(() => navigate(-1))}>
              <BackCircle />
            </button>
            {t("postSim.titlePrefix")} <em>{t("common.summary")}</em>
            {!isShortSession && (
              <SessionRatingTrigger value={displayRating} onSelect={handleStarSelect} size="sm" />
            )}
          </div>
          {!isShortSession && (
            <div className="flex justify-center gap-2 items-center">
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
                  <button
                    onClick={() =>
                      navigate(
                        ROUTES.SIMULATION_REVIEW_DETAILS.replace(":reviewId", summary.reviewId),
                      )
                    }
                    className="flex items-center justify-center h-[40px] w-[40px] p-0 relative"
                  >
                    <Comment className="w-6 h-6 shrink-0" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {isShortSession ? (
          <ShortSessionUI className="flex-1" summaryData={summaryData} />
        ) : (
          <>
            <ShareForReview
              isOpen={shareForReview}
              onClose={() => {
                setShareForReview(false);
              }}
              summaryDetails={summary}
              onNoteChange={(note: string) => {
                handleCreateReview(REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW, note);
              }}
              tag={t("postSim.titlePrefix")}
            />
            <Tabs
              items={tabList.map(tab => ({ id: String(tab.id), label: tab.label }))}
              activeId={String(selectedTab)}
              onChange={id => setSelectedTab(Number(id))}
              className="w-full shrink-0 border-b border-[#DBDBDB] font-primary"
              showCount={false}
            />
            <div
              className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
              data-testid="post-sim-tab-panel"
            >
              {getTabContent()}
            </div>
            {!isLoading && !summary?.scenarioPathSessionItemId && !summary?.caseSessionItemId && (
              <div className="flex flex-col items-center gap-3 fixed bottom-0 left-0 right-0 bg-white p-[20px]">
                {nextChallenge && (
                  <div className="w-full max-w-4xl px-4 sm:px-6">
                    <NextChallengeCard recommendation={nextChallenge} />
                  </div>
                )}
                <Button onClick={() => navigate(ROUTES.LEARN)}>
                  {t("postSim.common.tryAnother")}
                </Button>
              </div>
            )}
          </>
        )}
      </motion.div>
      <FeedbackDialog
        open={feedbackOpen}
        onClose={handleFeedbackClose}
        onSubmitComplete={handleFeedbackSubmitted}
        id={sessionId ?? ""}
        sessionType={SessionType.SIMULATION}
        initialRating={summary?.sessionFeedback?.rating}
        initialComment={summary?.sessionFeedback?.feedback}
        initialTags={
          rating === null || rating === summary?.sessionFeedback?.rating
            ? summary?.sessionFeedback?.tags
            : undefined
        }
      />
    </div>
  );
};
