import { FC, useEffect, useRef, useState } from "react";

import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyExportCallSummaryQuery, useUpdateCallSummaryMutation } from "@api";
import { Download } from "@assets";
import { ActionDialog } from "@components";
import { FeedbackDialog } from "@containers";
import { useFileExport } from "@hooks";
import CallSummary from "@pages/post-call-summary/components/CallSummary";
import { RootState } from "@store";
import { SessionType, UserRole } from "@types";

import { SummaryHeader, CallTranscriptTab, SummarySidebarWrapper } from ".";
import { defaultDeleteDialogData } from "../constants";
import { SUMMARY_FEEDBACK_TIMEOUT } from "./constants";
import { CallSummarySidebarProps, DeleteDialogData } from "./types";

// TODO: Added only for removing lint error - remove and find actual solution
declare global {
  interface Window {
    handleCommentClick: (comment: string) => void;
  }
}

const CallSummarySidebar: FC<CallSummarySidebarProps> = ({
  callSummary,
  refetchCallLogs,
  setCallSummary,
}) => {
  const { user } = useSelector((state: RootState) => state.user);

  const [selectedComment, setSelectedComment] = useState<string>("");
  const [deleteDialogData, setDeleteDialogData] =
    useState<DeleteDialogData>(defaultDeleteDialogData);
  const [summaryName, setSummaryName] = useState<string>();
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);

  const startTimeRef = useRef<number | null>(null);

  const [exportCallSummary] = useLazyExportCallSummaryQuery();
  const [updateCallSummary] = useUpdateCallSummaryMutation();

  const { exportTxtFromText } = useFileExport();
  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    if (callSummary?.details?.callInfo?.summaryName) {
      setSummaryName(callSummary?.details?.callInfo?.summaryName);
    }
  }, [callSummary?.details?.callInfo?.summaryName]);

  useEffect(() => {
    if (callSummary?.id) {
      startTimeRef.current = Date.now();
    } else {
      startTimeRef.current = null;
    }
  }, [callSummary?.id]);

  const hasThresholdElapsed = (): boolean => {
    if (startTimeRef.current == null) return false;
    return Date.now() - startTimeRef.current >= SUMMARY_FEEDBACK_TIMEOUT;
  };

  const onExportClick = async () => {
    try {
      const response = await exportCallSummary({ chatId: callSummary?.id });

      // Handle the text response (not JSON)
      let summaryText = "";

      // The API returns text data but RTK Query expects JSON, so it ends up in error.data
      if (response.error) {
        // Check if it's a FetchBaseQueryError with data
        if ("data" in response.error && typeof response.error.data === "string") {
          summaryText = response.error.data;
        } else {
          throw new Error("Failed to export call summary");
        }
        logger.info(`Error exporting call summary: ${response.error}`);
      } else {
        throw new Error("No data received from export API");
      }

      exportTxtFromText(summaryText, summaryName);
    } catch (error) {
      logger.info(`Error exporting call summary:, ${error}`);
    }
  };

  const onDeleteConfirm = () => {
    updateCallSummary({ chatId: callSummary?.id, data: { summary: [] } });
    refetchCallLogs();
    setDeleteDialogData(defaultDeleteDialogData);
  };

  const renderComments = () => {
    return (
      <>
        {callSummary?.details?.comments?.length > 0 && (
          <div className="flex-1 p-4 bg-[#F0F4F8]">
            <h3 className="font-semibold text-sm mb-2">Comments</h3>
            <div className="space-y-4 font-['IBM_Plex_Serif']">
              {callSummary?.details?.comments.map(({ comment, description }, index) => (
                <div
                  key={`comment-${index}`}
                  className={`p-3 rounded-lg border
                          ${
                            comment === selectedComment
                              ? "border-[#FECA04] bg-[#FFF9E6]"
                              : "bg-white"
                          } `}
                >
                  <>
                    <div
                      className={`text-sm font-medium
                              ${comment === selectedComment ? "text-[#FF9E28]" : "text-[#605E5E]"}`}
                    >
                      ~ {comment}
                    </div>
                    <div className="text-sm mt-1">{description}</div>
                  </>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const TranscriptionSubTab = () => (
    <div className="flex flex-1 overflow-y-hidden h-[calc(100vh-75px)]">
      <CallTranscriptTab callSummary={callSummary} />
      {renderComments()}
    </div>
  );

  const extraHeaderList = [
    {
      alt: "Export",
      icon: <Download />,
      onClick: onExportClick,
      // TODO: To be shown when the export functionality is implemented for admin
      show: !isAdmin,
      text: "Export summary",
    },
  ];

  const tabList = [
    {
      id: 1,
      label: "Summary",
      content: (
        <CallSummary
          headerContent={
            <SummaryHeader
              summaryName={summaryName}
              setSummaryName={setSummaryName}
              chatId={callSummary.id}
            />
          }
          className="max-h-[calc(100vh-320px)]"
          chatId={callSummary.id}
          postProcess={refetchCallLogs}
          isInSidebar={true}
        />
      ),
    },
    {
      id: 2,
      label: "Transcription",
      content: <TranscriptionSubTab />,
    },
  ];

  const onSidebarClose = () => {
    const hasFeedback = Boolean(callSummary?.details?.callInfo?.isSummaryFeedbackAdded);
    const overThirtySeconds = hasThresholdElapsed();

    if (!hasFeedback && overThirtySeconds) {
      setShowFeedbackDialog(true);
    } else {
      setCallSummary(null);
    }
  };

  const onCloseFeedbackDialog = () => {
    setShowFeedbackDialog(false);
    setCallSummary(null);
  };

  return (
    <SummarySidebarWrapper
      onSidebarClose={onSidebarClose}
      extraHeaderList={extraHeaderList}
      tabList={tabList}
    >
      <FeedbackDialog
        open={showFeedbackDialog}
        onClose={onCloseFeedbackDialog}
        id={callSummary?.id}
        sessionType={SessionType.CALL}
      />
      {/* TODO: Remove if delete summary is not needed 
      Anyway, noo trigger button present for delete summary in this sidebar*/}
      <ActionDialog
        open={deleteDialogData.open}
        onClose={() => setDeleteDialogData(defaultDeleteDialogData)}
        primaryButton={{
          label: "Delete",
          onClick: onDeleteConfirm,
          variant: "destructive",
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setDeleteDialogData(defaultDeleteDialogData),
        }}
        title="Delete Summary"
      >
        <span className="text-[14px] text-[#47464F]">
          Are you sure you want to delete this summary? This action can&apos;t be undone.
        </span>
      </ActionDialog>
    </SummarySidebarWrapper>
  );
};

export default CallSummarySidebar;
