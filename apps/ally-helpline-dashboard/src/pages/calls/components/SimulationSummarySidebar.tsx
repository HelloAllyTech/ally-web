import { FC } from "react";

import { SimulationSummary } from "@containers";

import { SummarySidebarWrapper } from ".";
import { SimulationSummarySidebarProps } from "./types";

const SimulationSummarySidebar: FC<SimulationSummarySidebarProps> = ({
  summaryId,
  closeSummarySidebar,
}) => {
  const tabList = [
    {
      id: 1,
      label: "Summary",
      content: (
        <SimulationSummary
          summaryId={summaryId}
          className="max-h-[calc(100vh-150px)]"
          onSummaryClose={closeSummarySidebar}
        />
      ),
    },
    {
      id: 2,
      label: "Transcription",
      content: <div>Coming Soon!!!</div>,
    },
  ];

  return <SummarySidebarWrapper tabList={tabList} onSidebarClose={closeSummarySidebar} />;
};

export default SimulationSummarySidebar;
