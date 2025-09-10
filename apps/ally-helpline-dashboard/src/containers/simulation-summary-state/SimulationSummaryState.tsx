import { useEffect, useState } from "react";

import { SummaryGenerationLoader } from "@components";

import { FeedbackSection, ReviewSection } from "./components";

const SimulationSummaryState = () => {
  const [isSummary, setIsSummary] = useState<boolean>(false);

  // TODO: Add api call to get summary
  useEffect(() => {
    setTimeout(() => setIsSummary(true), 10000);
  }, []);
  return (
    <>
      <div className="flex flex-col gap-6 w-full overflow-y-auto">
        {isSummary ? (
          <>
            <FeedbackSection />
            <ReviewSection />
          </>
        ) : (
          <div className="max-h-full overflow-hidden">
            <SummaryGenerationLoader text="Generating summary" />
          </div>
        )}
      </div>
    </>
  );
};

export default SimulationSummaryState;
