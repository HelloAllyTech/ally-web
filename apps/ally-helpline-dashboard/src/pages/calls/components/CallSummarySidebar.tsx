import { FC, useEffect, useRef, useState } from "react";

import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyExportCallSummaryQuery } from "@api";
import { Delete, Download } from "@assets";
import { CallProvider, Permissions } from "@constants";
import { FeedbackDialog } from "@containers";
import { useFileExport } from "@hooks";
import CallSummary from "@pages/post-call-summary/components/CallSummary";
import { RootState } from "@store";
import { ChatSummaryStatus, SessionType } from "@types";

import {
  SummaryHeader,
  CallTranscriptTab,
  SummarySidebarWrapper,
  DeleteCallLogConfirmationDialog,
} from ".";
import { SUMMARY_FEEDBACK_TIMEOUT } from "./constants";
import { CallSummarySidebarProps } from "./types";

const CallSummarySidebar: FC<CallSummarySidebarProps> = ({
  callSummary,
  refetchCallLogs,
  setCallSummary,
  canEditSummary = true,
  canShowFeedback = true,
}) => {
  const { permissions } = useSelector((state: RootState) => state.user);

  const [selectedComment] = useState<string>("");
  const [deleteDialogChatId, setDeleteDialogChatId] = useState<number | null>(null);
  const [summaryName, setSummaryName] = useState<string>();
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);

  const startTimeRef = useRef<number | null>(null);

  const [exportCallSummary] = useLazyExportCallSummaryQuery();

  const { exportTxtFromText } = useFileExport();

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

  const renderComments = () => {
    return (
      <>
        {callSummary?.details?.comments?.length > 0 && (
          <div className="flex-1 p-4 bg-[#F0F4F8]">
            <h3 className="font-semibold text-sm mb-2">Comments</h3>
            <div className="space-y-4 font-primary">
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

  const hasAdequatePermission = (permission: Permissions) => permissions?.includes(permission);

  const extraHeaderList = [
    {
      alt: "Delete Log",
      icon: <Delete className="-m-1.5" />,
      onClick: () => {
        setDeleteDialogChatId(callSummary?.id);
      },
      show:
        hasAdequatePermission(Permissions.DELETE_CHAT) &&
        callSummary?.details?.callInfo?.provider === CallProvider.AUDIO_UPLOAD,
      text: "Delete Log",
    },
    {
      alt: "Export",
      icon: <Download />,
      onClick: onExportClick,
      show:
        hasAdequatePermission(Permissions.EXPORT_SUMMARY) &&
        callSummary?.summaryStatus === ChatSummaryStatus.SUCCESS,
      text: "Export summary",
    },
  ];

  const tabList = [
    {
      id: 1,
      label: "Summary",
      permissions: [Permissions.VIEW_CHAT_DETAILS],
      content: (
        <CallSummary
          headerContent={
            <SummaryHeader
              summaryName={summaryName}
              setSummaryName={setSummaryName}
              chatId={callSummary.id}
              canEditSummary={canEditSummary}
              counsellorId={callSummary.counselorId}
            />
          }
          className="max-h-[calc(100vh-320px)]"
          chatId={callSummary.id}
          postProcess={refetchCallLogs}
          isInSidebar={true}
          canEditSummary={canEditSummary}
        />
      ),
    },
    {
      id: 2,
      label: "Transcription",
      permissions: [Permissions.VIEW_TRANSCRIPTION],
      content: <TranscriptionSubTab />,
    },
  ];

  const permittedTabList = tabList.filter(tab =>
    tab.permissions?.some(item => hasAdequatePermission(item)),
  );

  const onSidebarClose = () => {
    const hasFeedback = Boolean(callSummary?.details?.callInfo?.isSummaryFeedbackAdded);
    const overThirtySeconds = hasThresholdElapsed();

    if (
      canShowFeedback &&
      !hasFeedback &&
      overThirtySeconds &&
      hasAdequatePermission(Permissions.EDIT_SCENARIO_SESSION) &&
      callSummary?.summaryStatus === ChatSummaryStatus.SUCCESS
    ) {
      setShowFeedbackDialog(true);
    } else {
      setCallSummary(null);
    }
  };

  const onCloseFeedbackDialog = () => {
    setShowFeedbackDialog(false);
    setCallSummary(null);
  };

  const onDeleteDialogClose = (isDeletionDone?: boolean) => {
    setDeleteDialogChatId(null);
    if (isDeletionDone) {
      refetchCallLogs();
      setCallSummary(null);
    }
  };

  return (
    <SummarySidebarWrapper
      onSidebarClose={onSidebarClose}
      extraHeaderList={extraHeaderList}
      tabList={permittedTabList}
      title="Summary"
    >
      <FeedbackDialog
        open={showFeedbackDialog}
        onClose={onCloseFeedbackDialog}
        id={callSummary?.id}
        sessionType={SessionType.CALL}
      />
      <DeleteCallLogConfirmationDialog
        chatId={deleteDialogChatId}
        closeDialog={onDeleteDialogClose}
      />
    </SummarySidebarWrapper>
  );
};

export default CallSummarySidebar;
