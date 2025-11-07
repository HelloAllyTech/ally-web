import { FC, useEffect, useRef, useState } from "react";

import { useSelector } from "react-redux";

import { Permissions } from "@constants";
import { FeedbackDialog, SimulationSummary } from "@containers";
import { RootState } from "@store";
import { SessionType, SimulationSummary as SimulationSummaryType } from "@types";

import { SummarySidebarWrapper, SimulationTranscriptTab } from ".";
import { SUMMARY_FEEDBACK_TIMEOUT } from "./constants";
import { SimulationSummarySidebarProps } from "./types";

const SimulationSummarySidebar: FC<SimulationSummarySidebarProps> = ({
  summaryId,
  summaryName,
  closeSummarySidebar,
}) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);

  const hasFeedback = useRef<boolean>(false);
  const startTimeRef = useRef<number | null>(null);

  const { permissions } = useSelector((state: RootState) => state.user);

  const onSummaryFetch = (summary: SimulationSummaryType) => {
    hasFeedback.current = summary.hasFeedback;
  };

  useEffect(() => {
    if (summaryId) {
      startTimeRef.current = Date.now();
    } else {
      startTimeRef.current = null;
    }
  }, [summaryId]);

  const hasThresholdElapsed = (): boolean => {
    if (startTimeRef.current == null) return false;
    return Date.now() - startTimeRef.current >= SUMMARY_FEEDBACK_TIMEOUT;
  };

  const SidebarTitle = (
    <span className="text-[14px] flex items-center gap-2">
      <span className="font-semibold font-tertiary text-[#79747E]">Summary</span>
      <span className="font-normal font-primary text-[#000000]/38">{summaryName}</span>
    </span>
  );

  const tabList = [
    {
      id: 1,
      label: "Summary",
      content: (
        <SimulationSummary
          summaryId={summaryId}
          isInSidebar={true}
          className="max-h-[calc(100vh-150px)]"
          onSummaryClose={closeSummarySidebar}
          onSummaryFetch={onSummaryFetch}
        />
      ),
    },
    {
      id: 2,
      label: "Transcription",
      content: <SimulationTranscriptTab sessionId={summaryId} />,
    },
  ];

  const onSidebarClose = () => {
    const overThirtySeconds = hasThresholdElapsed();

    if (
      !hasFeedback.current &&
      overThirtySeconds &&
      permissions?.includes(Permissions.EDIT_SCENARIO_SESSION)
    ) {
      setShowFeedbackDialog(true);
    } else {
      closeSummarySidebar();
    }
  };

  const onCloseFeedbackDialog = () => {
    setShowFeedbackDialog(false);
    closeSummarySidebar();
  };

  return (
    <SummarySidebarWrapper tabList={tabList} onSidebarClose={onSidebarClose} title={SidebarTitle}>
      <FeedbackDialog
        open={showFeedbackDialog}
        onClose={onCloseFeedbackDialog}
        id={summaryId}
        sessionType={SessionType.SIMULATION}
      />
    </SummarySidebarWrapper>
  );
};

export default SimulationSummarySidebar;
