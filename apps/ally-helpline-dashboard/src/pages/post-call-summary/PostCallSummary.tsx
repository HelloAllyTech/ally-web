import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";

import { RootState, store } from "@/store/store";
import { ActionDialog, TabGroup } from "@/components";
import { setUserStatus } from "@/reducer/userReducer";
import { UserStatus } from "@/types/user";
import { CallType } from "@/constants/call";

import { ModalData, SectionType } from "./types";
import { CallSummary, StressBusterStep } from "./components";
import { useGetCallSummaryQuery } from "@/api/callSummary";
import { logger } from "@ally-ui-mono/ui-shared";
import { getNextSection } from "./helper";
import { summaryTabs } from "./constants";

const PostCallSummary = () => {
  const { chatId } = useParams();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userStatus, availableChatTypes } = useSelector((state: RootState) => state.user);

  const [selectedTab, setSelectedTab] = useState<SectionType>(SectionType.CallSummary);
  const [modalData, setModalData] = useState<ModalData | null>({ type: null });
  const [showInitialLoading, setShowInitialLoading] = useState(true);

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

  // TODO: Revamp the logic
  useEffect(() => {
    const refetchCallSummary = async () => {
      try {
        await refetch();
      } catch (error) {
        logger.info(`Error fetching call summary:, ${error}`);
      }
    };

    let interval: NodeJS.Timeout;

    // polling only for webRTC and not Microphone
    if (
      !callSummary?.details?.summary ||
      (Array.isArray(callSummary.details.summary) &&
        callSummary.details.summary.length === 0 &&
        callSummary?.details?.callInfo?.provider !== "MICROPHONE")
    ) {
      refetchCallSummary();
      interval = setInterval(refetchCallSummary, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callSummary]);

  const handleProceed = () => {
    const nextSection = getNextSection(selectedTab);
    if (nextSection) {
      setSelectedTab(nextSection);
    } else if (availableChatTypes?.includes(CallType.WEBRTC_CHAT)) {
      setModalData({ type: "redirect" });
    } else {
      navigate("/calls");
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
            showInitialLoading={showInitialLoading}
            setShowInitialLoading={setShowInitialLoading}
          />
        );
      default:
        return null;
    }
  };

  const handleMakeAvailable = () => {
    localStorage.setItem("userStatus", UserStatus.AVAILABLE);
    store.dispatch(setUserStatus(UserStatus.AVAILABLE));
    navigate("/calls");
  };

  const handleKeepOffline = () => {
    localStorage.setItem("userStatus", UserStatus.OFFLINE);
    store.dispatch(setUserStatus(UserStatus.OFFLINE));
    navigate("/calls");
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
        open={modalData?.type === "redirect"}
        onClose={() => setModalData(null)}
        primaryButton={{
          label: "Yes, mark me available",
          onClick: handleMakeAvailable,
          variant: "default",
        }}
        secondaryButton={{
          label: "No, keep me offline",
          onClick: handleKeepOffline,
        }}
      >
        <span className="text-[14px] text-[#47464F]">
          You&apos;ve done a great job! Would you like to mark yourself as available for new calls?
        </span>
      </ActionDialog>
    </div>
  );
};

export default PostCallSummary;
