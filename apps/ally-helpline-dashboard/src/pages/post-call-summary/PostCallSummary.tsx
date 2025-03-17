import { FC, useState } from "react";
import { Container } from "@mui/material";

import StressBusterStep from "./StressBusterStep";
import CallSummaryStepper from "./CallSummaryStepper";

interface PostCallSummaryProps {
  callId?: string;
}

export enum SectionType {
  CallHighlights = "Call highlights",
  StressBuster = "Stress buster",
  CallSummary = "Call summary",
  Resources = "You might also like",
}

const PostCallSummary: FC<PostCallSummaryProps> = ({ callId }) => {
  const [activeSection, setActiveSection] = useState<SectionType>(
    SectionType.CallHighlights
  );

  const renderSection = () => {
    switch (activeSection) {
      case SectionType.CallHighlights:
        return <div>Call Highlights</div>;
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
        setActiveSection={setActiveSection}
      />
      {renderSection()}
    </Container>
  );
};

export default PostCallSummary;
