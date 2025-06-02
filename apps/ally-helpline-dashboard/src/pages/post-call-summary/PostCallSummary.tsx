import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { Container } from "@mui/material";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";

import { RootState, store } from "@/store/store";
import { ActionDialog, ArticleReader, Drawer } from "@/components";
import { Article } from "@/components/article/types";
import { setUserStatus } from "@/reducer/userReducer";
import { UserStatus } from "@/types/user";

import CallSummaryStepper from "./CallSummaryStepper";
import StressBusterStep from "./StressBusterStep";
import { ModalData, SectionType } from "./types";
import ArticleGridStep from "./components/ArticleGridStep";
import CallSummary from "./components/CallSummary";
import { useGetCallSummaryQuery } from "@/api/callSummary";

const PostCallSummary = () => {
  const { chatId } = useParams();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<SectionType>(
    searchParams.get("section") === "2"
      ? SectionType.CallSummary
      : SectionType.StressBuster
  );
  const [completedSections, setCompletedSections] = useState<SectionType[]>(
    searchParams.get("section") === "2" ? [SectionType.StressBuster, SectionType.CallSummary] : [SectionType.StressBuster]
  );
  const [modalData, setModalData] = useState<ModalData | null>({ type: null, article: null });
  const [showInitialLoading, setShowInitialLoading] = useState(true);

  const { userStatus } = useSelector((state: RootState) => state.user);

  const { data: callSummary, refetch, isLoading: isGetCallSummaryLoading } = useGetCallSummaryQuery(chatId);

  useEffect(() => {
    const refetchCallSummary = async () => {
      try {
        if (!callSummary?.details) {
          await refetch();
        }
      } catch (error) {
        console.error("Error fetching call summary:", error);
      }
    };

    let interval: NodeJS.Timeout;

    if (!callSummary?.details?.summary) {
      refetchCallSummary();
      interval = setInterval(refetchCallSummary, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callSummary]);

  const handleArticleClick = (article: Article) => {
    setModalData({ type: "article", article });
  };

  const handleProceed = (nextSection: SectionType) => {
    setCompletedSections((prev: SectionType[]) => [...prev, nextSection]);
    setActiveSection(nextSection);
  };

  const renderSection = () => {
    switch (activeSection) {
      case SectionType.StressBuster:
        return (
          <StressBusterStep
            onProceed={() => handleProceed(SectionType.CallSummary)}
          />
        );
      case SectionType.CallSummary:
        return (
          <CallSummary
            callSummary={callSummary}
            chatId={Number(chatId)}
            isSummaryLoading={isGetCallSummaryLoading}
            onProceed={() => handleProceed(SectionType.Resources)}
            showInitialLoading={showInitialLoading}
            setShowInitialLoading={setShowInitialLoading}
          />
        );
      case SectionType.Resources:
        return (
          <ArticleGridStep
            onArticleClick={handleArticleClick}
            onProceed={() => {
              if (userStatus === UserStatus.OFFLINE) setModalData({ type: "redirect", article: null });
              else navigate("/");
            }}
          />
        );
      default:
        return null;
    }
  };

  const handleMakeAvailable = () => {
    localStorage.setItem("userStatus", UserStatus.AVAILABLE);
    store.dispatch(setUserStatus(UserStatus.AVAILABLE));
    navigate("/");
  };

  const handleKeepOffline = () => {
    localStorage.setItem("userStatus", UserStatus.OFFLINE);
    store.dispatch(setUserStatus(UserStatus.OFFLINE));
    navigate("/");
  };

  return (
    <Container maxWidth="md" className="mt-20">
      <div className="absolute left-1/2 -translate-x-1/2 top-24 z-10 pb-4 sm:w-[570px] md:w-[620px] lg:w-[660px]">
        <CallSummaryStepper
          activeSection={activeSection}
          completedSections={completedSections}
          setActiveSection={setActiveSection}
        />
      </div>
      <motion.div
        layout="position"
        layoutId="content-container"
        transition={{ duration: 0.3 }}
        className="h-fit py-4 px-6 mt-4 bg-white rounded-lg overflow-hidden border border-[#E5E7EB]"
      >
        <motion.div className="flex flex-col gap-4" layout={false}>
          {renderSection()}
        </motion.div>
      </motion.div>

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

      <Drawer
        open={modalData?.type === "article"}
        onClose={() => setModalData((prev) => ({ ...prev, type: null }))}
        title="Article"
      >
        <ArticleReader article={modalData?.article} isPage={false} />
      </Drawer>
    </Container>
  );
};

export default PostCallSummary;
