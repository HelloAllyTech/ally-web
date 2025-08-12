import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { useGetCallSummaryQuery } from "@api";
import { ActionDialog, TabGroup } from "@components";
import { CallProvider, CallType } from "@constants";
import { useUser } from "@hooks";
import { UserStatus } from "@types";

import { CallSummary, StressBusterStep } from "./components";
import { summaryTabs } from "./constants";
import { getNextSection } from "./helper";
import { SectionType } from "./types";

export const PostCallSummary = () => {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { availableChatTypes, updateUserStatus } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<SectionType>(SectionType.CallSummary);
  const [isSummaryPolling, setIsSummaryPolling] = useState(true);

  const {
    data: callSummary,
    refetch,
    isLoading: isGetCallSummaryLoading,
  } = useGetCallSummaryQuery(chatId);

  useEffect(() => {
    if (searchParams.get("section") === "2") {
      setSelectedTab(SectionType.CallSummary);
    } else {
      setSelectedTab(SectionType.BoxBreathing);
    }
  }, [searchParams]);

  useEffect(() => {
    let count = 0;
    const refetchCallSummary = async () => {
      count++;

      if (count >= 5) {
        clearInterval(interval);
        setIsSummaryPolling(false);
      }
      logger.info(`Count: ${count}`);
      try {
        const data = await refetch();
        if (data.data?.details?.summary) {
          clearInterval(interval);
        }
      } catch (error) {
        logger.info(`Error fetching call summary:, ${error}`);
      }
    };

    const interval: NodeJS.Timeout = setInterval(refetchCallSummary, 5000);

    refetchCallSummary();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const handleProceed = () => {
    const nextSection = getNextSection(selectedTab);
    if (nextSection) {
      onTabChange(null, nextSection);
    } else if (
      availableChatTypes?.includes(CallType.WEBRTC_CHAT) &&
      callSummary?.details?.callInfo?.provider === CallProvider.WEBRTC
    ) {
      setIsDialogOpen(true);
    } else {
      updateUserStatus(UserStatus.AVAILABLE);
      navigate("/calls", { state: { refetch: true } });
    }
  };

  const renderSection = () => {
    switch (selectedTab) {
      case SectionType.BoxBreathing:
        return <StressBusterStep onProceed={handleProceed} />;
      case SectionType.CallSummary:
        return (
          <CallSummary
            className="max-h-[calc(100vh-180px)]"
            callSummary={callSummary}
            chatId={Number(chatId)}
            isSummaryLoading={isGetCallSummaryLoading}
            onProceed={handleProceed}
            isSummaryPolling={isSummaryPolling}
            onClickViewSummary={refetch}
          />
        );
      default:
        return null;
    }
  };

  const onTabChange = (event: React.SyntheticEvent, newValue: SectionType) => {
    setSelectedTab(newValue);

    // Set query parameter
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("section", newValue === SectionType.CallSummary ? "2" : "1");

    // Update URL without page reload
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
  };
  const onDialogConfirm = (status: UserStatus) => {
    updateUserStatus(status);
    setIsDialogOpen(false);
    navigate("/calls", { state: { refetch: true } });
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

      <ActionDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        primaryButton={{
          label: "Yes, mark me available",
          onClick: () => onDialogConfirm(UserStatus.AVAILABLE),
          variant: "primary",
        }}
        secondaryButton={{
          label: "No, keep me offline",
          onClick: () => onDialogConfirm(UserStatus.OFFLINE),
        }}
      >
        <span className="text-[14px] text-[#47464F]">
          You&apos;ve done a great job! Would you like to mark yourself as available for new calls?
        </span>
      </ActionDialog>
    </div>
  );
};
