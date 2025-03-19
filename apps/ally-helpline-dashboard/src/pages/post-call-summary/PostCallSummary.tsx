import { useEffect, useState } from "react";
import { Container, Dialog } from "@mui/material";
import { motion } from "framer-motion";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import CallSummaryStepper from "./CallSummaryStepper";
import StressBusterStep from "./StressBusterStep";
import CallHighlights from "./components/CallHighlights";
import CallSummaryStep from "./components/CallSummaryStep";
import { ModalData, SectionType } from "./types";
import { useGetCallSummaryQuery } from "./api";
import ArticleGridStep from "./components/ArticleGridStep";
import { X } from "lucide-react";
import { Button } from "@/components";
import { setIsOnline } from "@/reducer/userReducer";
import { store } from "@/store/store";

const PostCallSummary = () => {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // console.log(searchParams.get("section"));

  const [activeSection, setActiveSection] = useState<SectionType>(SectionType.StressBuster);
  const [completedSections, setCompletedSections] = useState<SectionType[]>([]);
  const [modalData, setModalData] = useState<ModalData | null>(null);

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

  const handleProceed = (currentSection: SectionType, nextSection: SectionType) => {
    setCompletedSections((prev: SectionType[]) => [...prev, currentSection]);
    setActiveSection(nextSection);
  };

  const renderSection = () => {
    switch (activeSection) {
      case SectionType.StressBuster:
        return (
          <StressBusterStep onProceed={() => handleProceed(SectionType.StressBuster, SectionType.CallHighlights)} />
        );
      case SectionType.CallHighlights:
        return <CallHighlights onProceed={() => handleProceed(SectionType.CallHighlights, SectionType.CallSummary)} />;
      case SectionType.CallSummary:
        return (
          <CallSummaryStep
            onProceed={() => handleProceed(SectionType.CallSummary, SectionType.Resources)}
            summaryData={callSummary}
          />
        );
      case SectionType.Resources:
        return <ArticleGridStep onProceed={() => setModalData({ type: "redirect" })} />;
      default:
        return null;
    }
  };

  const handleMakeAvailable = () => {
    store.dispatch(setIsOnline(true));
    navigate("/");
  };

  const handleKeepOffline = () => {
    store.dispatch(setIsOnline(false));
    navigate("/");
  };

  return (
    <Container maxWidth="md" className="mt-[24px]">
      <CallSummaryStepper
        activeSection={activeSection}
        completedSections={completedSections}
        setActiveSection={setActiveSection}
        setCompletedSections={setCompletedSections}
      />
      <motion.div
        layout="position"
        layoutId="content-container"
        transition={{ duration: 0.3 }}
        className="h-fit py-4 px-6 mt-4 bg-white rounded-lg overflow-hidden border border-[#E5E7EB]"
      >
        <motion.div className="flex flex-col gap-4" layout={false}>{renderSection()}</motion.div>
      </motion.div>
      <Dialog open={modalData?.type === "redirect" } onClose={() => setModalData(null)} >
        <div className="py-4 px-6 bg-white h-fit w-[400px] flex flex-col gap-6 rounded-[8px]">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#47464F]">Ready for More?</span>
            <X className="cursor-pointer" onClick={() => setModalData(null)} />
          </div>
          <span className="text-[14px] text-[#47464F]">
            You’ve done a great job! Would you like to mark yourself as available for new calls?
          </span>
          <div className="flex gap-4 items-center">
            <Button variant="outline" className="text-[14px] rounded-full" onClick={handleKeepOffline}>
              No, keep me offline
            </Button>
            <Button className="text-[14px] rounded-full" onClick={handleMakeAvailable}>Yes, mark me available</Button>
          </div>
        </div>
      </Dialog>
    </Container>
  );
};

export default PostCallSummary;
