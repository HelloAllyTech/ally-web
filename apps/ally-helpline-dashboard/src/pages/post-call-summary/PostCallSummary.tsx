import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Container, Dialog } from "@mui/material";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import { RootState, store } from "@/store/store";
import { ArticleReader, Button, Drawer } from "@/components";
import { setUserStatus } from "@/reducer/userReducer";

import CallSummaryStepper from "./CallSummaryStepper";
import StressBusterStep from "./StressBusterStep";
import CallHighlights from "./components/CallHighlights";
import CallSummaryStep from "./components/CallSummaryStep";
import { ModalData, SectionType } from "./types";
import { useGetCallSummaryQuery } from "./api";
import ArticleGridStep from "./components/ArticleGridStep";
import { Article } from "@/components/article/types";
import { UserStatus } from "@/constants/common";

const PostCallSummary = () => {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<SectionType>(
    searchParams.get("section") === "2"
      ? SectionType.CallHighlights
      : SectionType.StressBuster
  );
  const [completedSections, setCompletedSections] = useState<SectionType[]>(
    searchParams.get("section") === "2" ? [SectionType.StressBuster, SectionType.CallHighlights] : [SectionType.StressBuster]
  );
  const [modalData, setModalData] = useState<ModalData | null>({ type: null, article: null });

  const { userStatus } = useSelector((state: RootState) => state.user);

  const { data: callSummary, refetch } = useGetCallSummaryQuery(chatId);

  useEffect(() => {
    const refetchCallSummary = async () => {
      try {
        await refetch();
      } catch (error) {
        console.error("Error fetching call summary:", error);
      }
    };

    let interval: NodeJS.Timeout;

    if (!callSummary) {
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
            onProceed={() => handleProceed(SectionType.CallHighlights)}
          />
        );
      case SectionType.CallHighlights:
        return (
          <CallHighlights
            onProceed={() => handleProceed(SectionType.CallSummary)}
            summaryData={callSummary}
          />
        );
      case SectionType.CallSummary:
        return (
          <CallSummaryStep
            onProceed={() => handleProceed(SectionType.Resources)}
            summaryData={callSummary}
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
    store.dispatch(setUserStatus(UserStatus.AVAILABLE));
    navigate("/");
  };

  const handleKeepOffline = () => {
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
      <Dialog
        open={modalData?.type === "redirect"}
        onClose={() => setModalData(null)}
      >
        <div className="py-4 px-6 bg-white h-fit w-[400px] flex flex-col gap-6 rounded-[8px]">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#47464F]">Ready for More?</span>
            <X className="cursor-pointer" onClick={() => setModalData(null)} />
          </div>
          <span className="text-[14px] text-[#47464F]">
            You&apos;ve done a great job! Would you like to mark yourself as
            available for new calls?
          </span>
          <div className="flex gap-4 items-center">
            <Button
              variant="outline"
              className="text-[14px] rounded-full"
              onClick={handleKeepOffline}
            >
              No, keep me offline
            </Button>
            <Button
              className="text-[14px] rounded-full"
              onClick={handleMakeAvailable}
            >
              Yes, mark me available
            </Button>
          </div>
        </div>
      </Dialog>
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
