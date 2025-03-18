import { useEffect, useState } from "react";
import { Container } from "@mui/material";
import { motion } from "framer-motion";
import { useParams, useSearchParams } from "react-router-dom";

import CallSummaryStepper from "./CallSummaryStepper";
import StressBusterStep from "./StressBusterStep";
import CallHighlights from "./components/CallHighlights";
import CallSummaryStep from "./components/CallSummaryStep";
import { SectionType } from "./types";
import { useGetCallSummaryQuery } from "./api";

const PostCallSummary = () => {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  // console.log(searchParams.get("section"));

  const [activeSection, setActiveSection] = useState<SectionType>(SectionType.StressBuster);
  const [completedSections, setCompletedSections] = useState<SectionType[]>([]);

  const { data: callSummary, refetch } = useGetCallSummaryQuery(chatId);

  useEffect(() => {
    if (!callSummary) {
      const refetchCallSummary = async () => {
        try {
          await refetch();
        } catch (error) {
          console.error("Error fetching call summary:", error);
        }
      };
      refetchCallSummary();
      // Poll for call summary data every 5 seconds
      const interval = setInterval(refetchCallSummary, 5000);

      return () => clearInterval(interval);
    }
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
        return <div>Additional Resources</div>;
      default:
        return null;
    }
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
        className="h-fit flex flex-col gap-4 py-4 px-6 mt-4 bg-white rounded-lg overflow-hidden border border-[#E5E7EB]"
        layout="position"
      >
        {renderSection()}
      </motion.div>
    </Container>
  );
};

export default PostCallSummary;
