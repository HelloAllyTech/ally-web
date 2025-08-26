import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { useSearchParams, useParams } from "react-router-dom";

import { TabGroup } from "@components";
import { CallType } from "@constants";
import { useUser } from "@hooks";
import { UserStatus } from "@types";
import { updateQueryParamListWithoutReload } from "@utils";

import { CallSummary, StressBusterStep } from "./components";
import { SectionQueryKey, summaryTabs } from "./constants";
import { SectionType } from "./types";
import { getNumberForSectionKey, getSectionTabForIndex } from "./utils";

export const PostCallSummary = () => {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();

  const { availableChatTypes, updateUserStatus, userStatus } = useUser();

  const [selectedTab, setSelectedTab] = useState<SectionType>(SectionType.CallSummary);

  useEffect(() => {
    const sectionNumber = Number(searchParams.get(SectionQueryKey) ?? "1");
    setSelectedTab(getSectionTabForIndex(sectionNumber));
  }, [searchParams]);

  const gotoSummaryTab = () => {
    onTabChange(null, SectionType.CallSummary);
  };

  // TODO: Remove once WEBRTC is removed
  const updateUserStatusForWebrtcCalls = () => {
    if (availableChatTypes?.includes(CallType.WEBRTC_CHAT) && userStatus !== UserStatus.AVAILABLE) {
      updateUserStatus(UserStatus.AVAILABLE);
    }
  };

  const renderSection = () => {
    switch (selectedTab) {
      case SectionType.BoxBreathing:
        return <StressBusterStep onProceed={gotoSummaryTab} />;
      case SectionType.CallSummary:
        return (
          <CallSummary
            className="max-h-[calc(100vh-250px)]"
            chatId={Number(chatId)}
            postProcess={updateUserStatusForWebrtcCalls}
          />
        );
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

  return (
    <div className="h-[100vh] w-[50%] pt-6 mx-auto flex flex-col gap-4 items-center bg-white">
      <TabGroup value={selectedTab} onChange={onTabChange} tabs={summaryTabs}>
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
      </TabGroup>
    </div>
  );
};
