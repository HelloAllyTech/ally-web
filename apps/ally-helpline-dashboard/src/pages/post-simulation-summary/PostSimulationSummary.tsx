import { FC, useState } from "react";

import { Tab, Tabs } from "@mui/material";
import { differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP, Toggle } from "@ally-ui-mono/ui-shared";
import {
  useCreateReviewMutation,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { BackCircle, Comment } from "@assets";
import { AskAiTab, ReflectionTab, ShareForReview, SkillsTab, ToggleSwitch } from "@components";
import {
  Permissions,
  REVIEW_PRIVACY_OPTIONS,
  REVIEW_PRIVACY_OPTIONS_VALUES,
  ROUTES,
} from "@constants";
import { ShortSessionUI, SimulationSummary, useSimulationSummaryPolling } from "@containers";
import { RootState } from "@store";
import { pageType, ShareForReviewsInput } from "@types";

import { UpNextTab } from "./components";
import { SimulationTranscriptTab } from "../calls/components";
import { tabStyles } from "../calls/constants";
import { containerVariants } from "../learn/constants";

export const PostSimulationSummary: FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { permissions } = useSelector((state: RootState) => state.user);
  const { t } = useTranslation();

  const { data: summary } = useGetSimulationSummaryQuery(sessionId);
  const { summaryData, retryMaxReached, isShortSession } = useSimulationSummaryPolling(sessionId);
  const [createReview] = useCreateReviewMutation();
  const [updateReview] = useUpdateReviewMutation();

  const canShowUpNextTab =
    (summary?.scenarioPathSessionItemId || summary?.caseSessionItemId) &&
    permissions?.includes(Permissions.EDIT_SCENARIO_SESSION);

  const tabList = [
    {
      id: 1,
      label: "Session Review",
      content: (
        <SimulationSummary
          sessionId={sessionId ?? ""}
          summaryData={summaryData}
          retryMaxReached={retryMaxReached}
          className="max-h-[calc(100vh-212px)]"
        />
      ),
    },
    ...(FEATURE_FLAGS_MAP.SUMMARY_TABS_FLAG
      ? [
          {
            id: 4,
            label: "Ask AI",
            content: <AskAiTab sessionId={sessionId} />,
          },
        ]
      : []),
    {
      id: 2,
      label: "Annotated Transcript",
      content: <SimulationTranscriptTab sessionId={sessionId} className="w-full" />,
    },
    ...(FEATURE_FLAGS_MAP.SUMMARY_TABS_FLAG
      ? [
          {
            id: 5,
            label: "Skills  Demonstrated",
            content: <SkillsTab sessionId={sessionId} />,
          },
          {
            id: 6,
            label: "Deeper Reflection",
            content: <ReflectionTab sessionId={sessionId} />,
          },
        ]
      : []),
    ...(canShowUpNextTab
      ? [
          {
            id: 3,
            label: "Up Next",
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleCreateReview = async (status: string, note?: string) => {
    const normalizedNote = note?.trim() || null;
    const isExpired = differenceInMinutes(new Date(), new Date(summary?.reviewCreatedAt)) >= 10;

    try {
      if (summary?.reviewId) {
        const params: ShareForReviewsInput = {
          body: {
            scenarioSessionId: summary.reviewId,
            status,
          },
        };
        if (status !== REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN && !isExpired)
          params.body.note = normalizedNote;
        await updateReview(params).unwrap();
      } else {
        const params: ShareForReviewsInput = {
          body: {
            scenarioSessionId: sessionId ?? "",
            status,
            note: normalizedNote,
          },
        };
        await createReview(params).unwrap();
      }
    } catch (err: any) {
      toast.error(err?.data?.message ?? "Something went wrong. Please try again.");
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
    <div className="bg-white w-full h-[100vh] overflow-y-auto flex flex-col items-center ">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 max-w-4xl w-full h-full pb-8 sm:pb-16 px-4 sm:px-6 items-center"
      >
        <div className="flex items-center justify-between w-full mt-8">
          <div className="flex items-center gap-2 text-black text-2xl sm:text-4xl font-normal text-left font-secondary">
            <button onClick={() => navigate(-1)}>
              <BackCircle />
            </button>
            Simulation <em>Summary</em>
          </div>
          {!isShortSession && (
            <div className="flex justify-center gap-2 items-center">
              {FEATURE_FLAGS_MAP.SHARE_FOR_REVIEW_FLAG ? (
                <div className="flex items-center gap-2">
                  <span className="font-primary font-normal text-sm">Share for review</span>
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
              ) : (
                <Toggle
                  items={REVIEW_PRIVACY_OPTIONS(t)}
                  initialValue={summary?.reviewStatus}
                  onChange={handleCreateReview}
                />
              )}
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
              isOpen={FEATURE_FLAGS_MAP.SHARE_FOR_REVIEW_FLAG && shareForReview}
              onClose={() => {
                setShareForReview(false);
              }}
              summaryDetails={summary}
              onNoteChange={(note: string) => {
                handleCreateReview(REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW, note);
              }}
              tag="Simulation"
            />
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              className="w-full normal-case border-b border-[#DBDBDB]"
              sx={{
                "& .MuiButtonBase-root": {
                  fontFamily: "IBM_Plex_Serif",
                },
              }}
            >
              {tabList?.map(tab => (
                <Tab key={tab.id} label={tab.label} value={tab.id} sx={tabStyles} />
              ))}
            </Tabs>
            {getTabContent()}
          </>
        )}
      </motion.div>
    </div>
  );
};
