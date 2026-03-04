import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSearchParams, useParams } from "react-router-dom";

import { TabGroup } from "@components";
import { updateQueryParamListWithoutReload } from "@utils";

import { CallSummary, StressBusterStep } from "./components";
import { SectionQueryKey, getSummaryTabs } from "./constants";
import { SectionType } from "./types";
import {
  getNumberForSectionKey,
  getSectionTabForIndex,
  getSelectedSection,
  isSourceDeeplink,
} from "./utils";

export const PostCallSummary = () => {
  const { chatId } = useParams();
  const { t } = useTranslation();
  const summaryTabs = getSummaryTabs(t);
  const [searchParams] = useSearchParams();

  const [selectedTab, setSelectedTab] = useState<SectionType>(SectionType.SessionSummary);

  useEffect(() => {
    const sectionNumber = Number(getSelectedSection(searchParams));
    setSelectedTab(getSectionTabForIndex(sectionNumber));
  }, [searchParams]);

  const isDeeplink = isSourceDeeplink(searchParams);

  const gotoSummaryTab = () => {
    onTabChange(null, SectionType.SessionSummary);
  };

  const renderSection = () => {
    switch (selectedTab) {
      case SectionType.BoxBreathing:
        return <StressBusterStep onProceed={gotoSummaryTab} />;
      case SectionType.SessionSummary:
        return <CallSummary className="max-h-[calc(100vh-250px)]" chatId={Number(chatId)} />;
      default:
        return null;
    }
  };

  const onTabChange = (_event: React.SyntheticEvent, newValue: SectionType) => {
    setSelectedTab(newValue);

    const queryParamList = [
      { key: SectionQueryKey, value: getNumberForSectionKey(newValue)?.toString() },
    ];
    updateQueryParamListWithoutReload(queryParamList);
  };

  const Content = () => (
    <motion.div
      layout="position"
      layoutId="content-container"
      transition={{ duration: 0.3 }}
      className="h-fit overflow-hidden w-full"
    >
      <motion.div className="flex flex-col gap-4" layout={false}>
        {renderSection()}
      </motion.div>
    </motion.div>
  );

  return (
    <div className="h-[100vh] w-[50%] pt-6 mx-auto flex flex-col gap-4 items-center bg-white">
      {isDeeplink ? (
        <Content />
      ) : (
        <TabGroup value={selectedTab} onChange={onTabChange} tabs={isDeeplink ? [] : summaryTabs}>
          <Content />
        </TabGroup>
      )}
    </div>
  );
};
