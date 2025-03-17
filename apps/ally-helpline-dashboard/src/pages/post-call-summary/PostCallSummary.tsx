import { useState } from "react";
import { Container } from "@mui/material";

import CallSummaryStepper from "./CallSummaryStepper";
import StressBusterStep from "./StressBusterStep";
import CallHighlights from "./components/CallHighlights";
import { SectionType } from "./types";
import { useParams } from "react-router-dom";

const PostCallSummary = () => {
  const { chatId } = useParams();

  const [activeSection, setActiveSection] = useState<SectionType>(SectionType.CallHighlights);
  const [completedSections, setCompletedSections] = useState<SectionType[]>([]);

  const handleProceed = (currentSection: SectionType, nextSection: SectionType) => {
    setCompletedSections((prev: SectionType[]) => [...prev, currentSection]);
    setActiveSection(nextSection);
  };

  const renderSection = () => {
    switch (activeSection) {
      case SectionType.CallHighlights:
        return <CallHighlights onProceed={() => handleProceed(SectionType.CallHighlights, SectionType.CallSummary)} />;
      case SectionType.CallSummary:
        return <div>Call Summary</div>;
      case SectionType.StressBuster:
        return (
          <div>
            <StressBusterStep />
          </div>
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
      {renderSection()}
    </Container>
  );
};

export default PostCallSummary;
