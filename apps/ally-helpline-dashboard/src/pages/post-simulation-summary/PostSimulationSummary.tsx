import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Tabs } from "@ally-ui-mono/ui-shared";
import {
  useCreateReviewMutation,
  useGetAvailableLanguagesQuery,
  useGetLearnTrackDetailQuery,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { ArrowRight, BackCircle, Comment } from "@assets";
import {
  Button,
  DebriefTab,
  NextChallengeCard,
  SessionRatingTrigger,
  ShareForReview,
  ToggleSwitch,
} from "@components";
import { buildTrackRoute, REVIEW_PRIVACY_OPTIONS_VALUES, ROUTES } from "@constants";
import {
  FeedbackDialog,
  ShortSessionUI,
  TechnicalInterruptionUI,
  useSimulationSummaryPolling,
} from "@containers";
import { useContinueTrack, useNextChallenge } from "@hooks";
import {
  ActiveTrackContext,
  SessionType,
  ShareForReviewsInput,
  TranscriptFocusRequest,
} from "@types";
import { readTrackContext, resolveFeedbackTabs } from "@utils";

import { StreakMoment } from "./components";
import { SimulationTranscriptTab } from "../calls/components";
import { containerVariants } from "../learn/constants";

/**
 * Stable ids so a tab keeps its identity as the roleplay's sub-toggles change
 * which of them are present. Tab ORDER is the array order below — Debrief
 * first, because the note is the thing the learner came back for.
 */
const TAB_IDS = {
  DEBRIEF: 6,
  TRANSCRIPT: 2,
} as const;

export const PostSimulationSummary: FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<number>(TAB_IDS.DEBRIEF);

  const {
    data: summary,
    isLoading,
    refetch,
  } = useGetSimulationSummaryQuery(
    { sessionId: sessionId ?? "", languageCode: i18n.language },
    { skip: !sessionId },
  );
  const {
    summaryData,
    retryMaxReached,
    isShortSession,
    isTechnicalInterruption,
    checkAgain,
    isCheckingAgain,
  } = useSimulationSummaryPolling(sessionId, i18n.language);
  // Neither a too-short session nor a technically-interrupted one has enough
  // of a real conversation to rate, share for review, or count toward a
  // streak — same reasoning that already applied to isShortSession alone.
  const hideEvaluationChrome = isShortSession || isTechnicalInterruption;
  const [createReview] = useCreateReviewMutation();
  const [updateReview] = useUpdateReviewMutation();
  const nextChallenge = useNextChallenge(summary);

  // Track 2.0: if this roleplay was launched from within a track, keep the
  // learner anchored to that course instead of surfacing an unrelated
  // recommendation — see the breadcrumb + bottom CTA below.
  const [trackContext] = useState<ActiveTrackContext | null>(() => readTrackContext());
  const { data: trackDetail } = useGetLearnTrackDetailQuery(
    { trackId: trackContext?.trackId ?? "" },
    { skip: !trackContext },
  );
  const continueTrack = useContinueTrack(trackContext);

  // A "See this moment" chip both switches to the transcript and asks it to
  // scroll to that message. The counter makes each click a distinct request, so
  // clicking the same chip again scrolls back to the moment after the reader
  // has wandered off it.
  const [momentRequest, setMomentRequest] = useState<TranscriptFocusRequest | null>(null);
  const momentRequestCountRef = useRef(0);

  const handleOpenMoment = useCallback((messageId: string) => {
    momentRequestCountRef.current += 1;
    setMomentRequest({ messageId, requestId: momentRequestCountRef.current });
    setSelectedTab(TAB_IDS.TRANSCRIPT);
  }, []);

  const { data: availableLanguages } = useGetAvailableLanguagesQuery({});
  const originalLanguageCode = useMemo(() => {
    const languageId = summary?.metadata?.languageId;
    if (!languageId) return "en";
    const matchedLanguage = availableLanguages?.find(
      language => language.language_id === languageId,
    );
    return matchedLanguage?.value?.split("-")[0] ?? "en";
  }, [summary?.metadata?.languageId, availableLanguages]);

  // Which post-session tabs this roleplay shows. The backend sends this
  // already resolved; the fallback in resolveFeedbackTabs only covers a
  // response cached from before these toggles existed.
  const feedbackTabs = resolveFeedbackTabs(summary?.scenario?.metadata);

  // Exactly two tabs, one per surviving toggle. Skills Demonstrated and the
  // legacy "Up next" tab were both dropped on 2026-08-31: Skills had been off
  // platform-wide since 2026-08-24, and Up next only ever appeared for legacy
  // pathway/case sessions (Track 2.0 gets the breadcrumb + continue CTA
  // below instead, via useContinueTrack).
  const tabList = [
    ...(feedbackTabs.debrief
      ? [
          {
            id: TAB_IDS.DEBRIEF,
            label: t("postSim.tabs.debrief"),
            content: (
              <DebriefTab
                sessionId={sessionId ?? ""}
                summaryData={summaryData}
                retryMaxReached={retryMaxReached}
                checkAgain={checkAgain}
                isCheckingAgain={isCheckingAgain}
                // Anchors and cited timestamps only become chips when there is
                // a transcript tab to open; otherwise they render as plain
                // prose.
                onOpenMoment={feedbackTabs.transcript ? handleOpenMoment : undefined}
                agentName={summary?.scenario?.metadata?.name}
              />
            ),
          },
        ]
      : []),
    ...(feedbackTabs.transcript
      ? [
          {
            id: TAB_IDS.TRANSCRIPT,
            label: t("postSim.tabs.transcript"),
            content: (
              <SimulationTranscriptTab
                sessionId={sessionId}
                className="w-full"
                agentName={summary?.scenario?.metadata?.name}
                originalLanguageCode={originalLanguageCode}
                focusMessage={momentRequest}
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

  // Debrief is the default landing tab, but a roleplay can switch it off — in
  // which case fall through to whichever tab is actually first.
  useEffect(() => {
    if (!tabList.length) return;
    if (!tabList.some(tab => tab.id === selectedTab)) {
      setSelectedTab(tabList[0].id);
    }
  }, [tabList, selectedTab]);

  const [shareForReview, setShareForReview] = useState<boolean>(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const feedbackDialogEvaluatedRef = useRef<boolean>(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // Both tabs off means the author wants no post-session evaluation surface at
  // all — the wholesale opt-out that the retired `enableFeedback` master
  // switch used to express, now said by the two toggles themselves. There is
  // nothing left to show but the star rating.
  const feedbackEnabled = feedbackTabs.debrief || feedbackTabs.transcript;

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
    // The page scrolls, the tabs do not. This was a viewport-locked shell where
    // every tab panel got whatever height the header, streak banner and footer
    // left over — about four lines of the debrief note on a laptop — and each
    // tab then scrolled internally. One scrollbar, full-length content.
    <div className="flex min-h-[100dvh] w-full flex-col items-center bg-white pb-10">
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
        className="relative flex w-full max-w-4xl flex-1 flex-col gap-6 self-center px-4 pb-8 sm:pb-16 sm:px-6 items-center"
      >
        {trackContext && (
          <div className="mt-8 flex w-full shrink-0 items-center gap-2 text-sm text-typography-700 min-w-0">
            <button
              onClick={() => guardExit(() => navigate(`${ROUTES.LEARN}?tab=courses`))}
              className="hover:text-primary-500 transition-colors whitespace-nowrap"
            >
              {t("tracks2.breadcrumb")}
            </button>
            <ArrowRight />
            <button
              onClick={() => guardExit(() => navigate(buildTrackRoute(trackContext.trackId)))}
              className="text-primary-500 font-medium truncate hover:underline"
            >
              {trackDetail?.title ?? t("common.loading")}
            </button>
          </div>
        )}
        <div
          className={`${trackContext ? "mt-2" : "mt-8"} flex w-full shrink-0 items-center justify-between`}
        >
          <div className="flex items-center gap-2 text-black text-2xl sm:text-4xl font-normal text-left font-secondary">
            <button onClick={() => guardExit(() => navigate(-1))}>
              <BackCircle />
            </button>
            {t("postSim.titlePrefix")} <em>{t("common.summary")}</em>
            {!hideEvaluationChrome && (
              <SessionRatingTrigger value={displayRating} onSelect={handleStarSelect} size="sm" />
            )}
          </div>
          {!hideEvaluationChrome && (
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
        {/* Sits on the page shell rather than inside a tab: OverallScoreMeter
            lives in the Skills tab, which is not the landing tab, so anchoring
            the moment there would hide it from most users. Neither a too-short
            nor a technically-interrupted session can have secured the streak,
            so it is disabled for both branches. */}
        <StreakMoment enabled={!hideEvaluationChrome && !!summary} />

        {isTechnicalInterruption ? (
          <TechnicalInterruptionUI className="flex-1" summaryData={summaryData} />
        ) : isShortSession ? (
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
              // Sticky so switching tabs stays reachable once a long note or
              // transcript has been scrolled past.
              className="sticky top-0 z-20 w-full shrink-0 border-b border-[#DBDBDB] bg-white font-primary"
              showCount={false}
            />
            <div className="flex w-full flex-1 flex-col" data-testid="post-sim-tab-panel">
              {getTabContent()}
            </div>
            {!isLoading && trackContext && (
              <div
                data-testid="post-sim-footer"
                className="flex w-full shrink-0 flex-col items-center gap-2 bg-white p-[20px]"
              >
                <span className="font-primary text-sm text-typography-700">
                  {t("tracks2.continueLearning.label")}
                </span>
                <Button onClick={() => guardExit(continueTrack)}>{t("common.continue")}</Button>
              </div>
            )}
            {!isLoading &&
              !trackContext &&
              !summary?.scenarioPathSessionItemId &&
              !summary?.caseSessionItemId && (
                <div
                  data-testid="post-sim-footer"
                  className="flex w-full shrink-0 flex-col items-center gap-3 bg-white p-[20px]"
                >
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
