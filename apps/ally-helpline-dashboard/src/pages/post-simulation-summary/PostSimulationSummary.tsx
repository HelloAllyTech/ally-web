import { FC, useEffect, useRef, useState } from "react";

import { Tab, Tabs } from "@mui/material";
import { differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useCreateReviewMutation,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { BackCircle, Comment } from "@assets";
import {
  AskAiTab,
  Button,
  ReflectionTab,
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
import { pageType, SessionType, ShareForReviewsInput } from "@types";

import { UpNextTab } from "./components";
import { SimulationTranscriptTab } from "../calls/components";
import { tabStyles } from "../calls/constants";
import { containerVariants } from "../learn/constants";

export const PostSimulationSummary: FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { data: summary, isLoading } = useGetSimulationSummaryQuery(
    { sessionId: sessionId ?? "", languageCode: i18n.language },
    { skip: !sessionId },
  );
  const { summaryData, retryMaxReached, isShortSession } = useSimulationSummaryPolling(
    sessionId,
    i18n.language,
  );
  const [createReview] = useCreateReviewMutation();
  const [updateReview] = useUpdateReviewMutation();

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
      content: <SkillsTab sessionId={sessionId} />,
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

  const [selectedTab, setSelectedTab] = useState<number>(tabList?.[0].id);
  const [shareForReview, setShareForReview] = useState<boolean>(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const feedbackDialogEvaluatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (summaryData && !feedbackDialogEvaluatedRef.current) {
      feedbackDialogEvaluatedRef.current = true;
      if (!summaryData.hasFeedback) {
        setShowFeedbackDialog(true);
      }
    }
  }, [summaryData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

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
            <button onClick={() => navigate(-1)}>
              <BackCircle />
            </button>
            {t("postSim.titlePrefix")} <em>{t("common.summary")}</em>
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
              value={selectedTab}
              onChange={handleTabChange}
              className="w-full shrink-0 normal-case border-b border-[#DBDBDB]"
              sx={{
                "& .MuiButtonBase-root": {
                  fontFamily: "'IBM Plex Serif', serif",
                  fontWeight: 400,
                },
              }}
            >
              {tabList?.map(tab => (
                <Tab key={tab.id} label={tab.label} value={tab.id} sx={tabStyles} />
              ))}
            </Tabs>
            <div
              className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
              data-testid="post-sim-tab-panel"
            >
              {getTabContent()}
            </div>
            {!isLoading && !summary?.scenarioPathSessionItemId && !summary?.caseSessionItemId && (
              <div className="flex justify-center items-center fixed bottom-0 left-0 right-0 bg-white p-[20px]">
                <Button onClick={() => navigate(ROUTES.LEARN)}>
                  {t("postSim.common.tryAnother")}
                </Button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};
