import { FC, useState } from "react";

import { Tab, Tabs } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";

import { Toggle } from "@ally-ui-mono/ui-shared/index";
import { REVIEW_PRIVACY_OPTIONS, ROUTES } from "@constants";
import { SimulationSummary } from "@containers";

import { SimulationTranscriptTab } from "../calls/components";
import { tabStyles } from "../calls/constants";
import { containerVariants } from "../learn/constants";

export const PostSimulationSummary: FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const closeSummarySidebar = () => {
    navigate(ROUTES.LEARN);
  };

  const tabList = [
    {
      id: 1,
      label: "Summary",
      content: (
        <SimulationSummary
          summaryId={sessionId}
          isInSidebar={false}
          className="max-h-[calc(100vh-212px)]"
          onSummaryClose={closeSummarySidebar}
        />
      ),
    },
    {
      id: 2,
      label: "Transcription",
      content: (
        <SimulationTranscriptTab
          sessionId={sessionId}
          className="w-full max-h-[calc(100vh-120px)]"
        />
      ),
    },
  ];

  const [selectedTab, setSelectedTab] = useState<number>(tabList?.[0].id);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const getTabContent = () => tabList.find(tab => tab.id === selectedTab)?.content;
  const handleCreateReview = async (status: string) => {
    if (summary.reviewId) {
      await updateReview({ id: summary.reviewId, status });
    } else {
      await createReview({ scenarioSessionId: sessionId });
    }
  };

  return (
    <div className="bg-white w-full h-[100vh] overflow-y-auto flex flex-col items-center ">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 max-w-4xl w-full h-full pb-8 sm:pb-16 px-4 sm:px-6 items-center"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-full text-black text-2xl sm:text-4xl font-normal text-left font-secondary mt-8 px-4">
            Simulation <em>Summary</em>
          </div>

          <Toggle
            items={REVIEW_PRIVACY_OPTIONS}
            // initialValue={.reviewStatus}
            onChange={handleCreateReview}
          />
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
            <Tab key={tab.id} label={tab.label} value={tab.id} sx={tabStyles} />
          ))}
        </Tabs>
        {getTabContent()}
      </motion.div>
    </div>
  );
};
