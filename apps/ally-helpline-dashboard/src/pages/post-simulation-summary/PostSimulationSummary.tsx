import { FC, useState } from "react";

import { Tab, Tabs } from "@mui/material";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { FEATURE_FLAGS_MAP, Toggle } from "@ally-ui-mono/ui-shared/index";
import {
  useCreateReviewMutation,
  useGetSimulationSummaryQuery,
  useUpdateReviewMutation,
} from "@api";
import { BackCircle } from "@assets";
import { AskAiTab, ReflectionTab } from "@components";
import { Permissions, REVIEW_PRIVACY_OPTIONS } from "@constants";
import { SimulationSummary } from "@containers";
import { RootState } from "@store";
import { pageType } from "@types";
import { useTranslation } from "react-i18next";

import { UpNextTab } from "./components";
import { SimulationTranscriptTab } from "../calls/components";
import { tabStyles } from "../calls/constants";
import { containerVariants } from "../learn/constants";

export const PostSimulationSummary: FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { permissions } = useSelector((state: RootState) => state.user);
  const { t } = useTranslation();

  const reviewPrivacyOptions = REVIEW_PRIVACY_OPTIONS.map(option => ({
    ...option,
    label: t(option.labelKey),
  }));

  const { data: summary } = useGetSimulationSummaryQuery(sessionId);
  const [createReview] = useCreateReviewMutation();
  const [updateReview] = useUpdateReviewMutation();

  const canShowUpNextTab =
    (summary?.scenarioPathSessionItemId || summary?.caseSessionItemId) &&
    permissions?.includes(Permissions.EDIT_SCENARIO_SESSION);

  const tabList = [
    {
      id: 1,
      labelKey: "postSim.tabs.summary",
      content: <SimulationSummary summaryId={sessionId} className="max-h-[calc(100vh-212px)]" />,
    },
    {
      id: 2,
      label: "Transcription",
      content: <SimulationTranscriptTab sessionId={sessionId} className="w-full" />,
    },
    ...(FEATURE_FLAGS_MAP.SUMMARY_TABS_FLAG
      ? [
          {
            id: 4,
            label: "Ask AI",
            content: <AskAiTab sessionId={sessionId} />,
          },
          {
            id: 5,
            label: "Reflection",
            content: <ReflectionTab sessionId={sessionId} />,
          },
        ]
      : []),
    ...(canShowUpNextTab
      ? [
          {
            id: 3,
            labelKey: "postSim.tabs.upNext",
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleCreateReview = async (status: string) => {
    if (summary?.reviewId) {
      await updateReview({ id: summary.reviewId, status });
    } else {
      await createReview({ scenarioSessionId: sessionId });
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
            {t("postSim.titlePrefix")} <em>{t("postSim.titleEmphasis")}</em>
          </div>

          <div className="flex justify-center gap-2">
            <Toggle
              items={reviewPrivacyOptions}
              initialValue={summary?.reviewStatus}
              onChange={handleCreateReview}
            />
          </div>
        </div>

        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          className="w-full normal-case border-b border-[#DBDBDB] mb-4"
          sx={{
            "& .MuiButtonBase-root": {
              fontFamily: "IBM_Plex_Serif",
            },
          }}
        >
          {tabList?.map(tab => (
            <Tab key={tab.id} label={t(tab.labelKey as string)} value={tab.id} sx={tabStyles} />
          ))}
        </Tabs>
        {getTabContent()}
      </motion.div>
    </div>
  );
};
