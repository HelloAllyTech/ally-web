import { FC, useEffect, useRef, useState } from "react";

import { Tooltip } from "@mui/material";
import { differenceInMinutes } from "date-fns";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { FEATURE_FLAGS_MAP, logger } from "@ally-ui-mono/ui-shared";
import {
  useLazyExportCallSummaryQuery,
  useArchiveCallLogMutation,
  useGetSummaryFieldsQuery,
  useCreateScribeReviewMutation,
  useUpdateScribeReviewMutation,
  useGetCallSummaryQuery,
} from "@api";
import { Archive, Comment, Delete, Download, Unarchive } from "@assets";
import { Button, ButtonVariant, ShareForReview, ToggleSwitch } from "@components";
import { CallProvider, Permissions, REVIEW_PRIVACY_OPTIONS_VALUES, ROUTES } from "@constants";
import { FeedbackDialog } from "@containers";
import { useFileExport } from "@hooks";
import CallSummary from "@pages/post-call-summary/components/CallSummary";
import { toolTipStyles } from "@src/constants";
import ArchiveDialog from "@src/pages/calls/components/ArchiveDialog";
import { RootState } from "@store";
import { ChatSummaryStatus, SessionType, ShareForReviewsScribeInput } from "@types";

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
  showArchiveButton = true,
}) => {
  const { t } = useTranslation();
  const { permissions } = useSelector((state: RootState) => state.user);

  const [selectedComment] = useState<string>("");
  const [deleteDialogChatId, setDeleteDialogChatId] = useState<number | null>(null);
  const [summaryName, setSummaryName] = useState<string>("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState<boolean>(false);
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState<boolean>(false);
  const [shareForReview, setShareForReview] = useState<boolean>(false);

  const startTimeRef = useRef<number | null>(null);

  const navigate = useNavigate();

  const [exportCallSummary] = useLazyExportCallSummaryQuery();
  const [archiveCallLog] = useArchiveCallLogMutation();
  const {
    data: individualCallSummary,
    refetch: refetchCallSummary,
    isLoading: isSummaryLoading,
    error: summaryLoadingError,
  } = useGetCallSummaryQuery(callSummary?.id, { skip: !callSummary?.id });
  const [createScribeReview] = useCreateScribeReviewMutation();
  const [updateScribeReview] = useUpdateScribeReviewMutation();

  const { exportTxtFromText } = useFileExport();

  const { refetch: refetchSummaryFields } = useGetSummaryFieldsQuery();

  useEffect(() => {
    if (callSummary?.id) {
      refetchSummaryFields();
    }
  }, [callSummary?.id, refetchSummaryFields]);

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

  useEffect(() => {
    // Initialize archived state from callSummary based on archivedAt
    if (callSummary) {
      const archivedAt = (callSummary as any)?.archivedAt;
      setIsArchived(!!archivedAt);
    }
  }, [callSummary]);

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

  const handleCreateReview = async ({
    note,
    scribeSessionId,
    status,
  }: {
    note?: string;
    scribeSessionId?: number;
    status: string;
  }) => {
    const normalizedNote = note?.trim() || null;
    const isExpired =
      differenceInMinutes(new Date(), new Date(individualCallSummary?.reviewCreatedAt)) >= 10;
    try {
      if (individualCallSummary?.reviewId) {
        const params: ShareForReviewsScribeInput = {
          scribeSessionId: individualCallSummary?.reviewId,
          status,
        };
        if (status !== REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN && !isExpired)
          params.note = normalizedNote;
        await updateScribeReview(params).unwrap();
      } else {
        const params: ShareForReviewsScribeInput = {
          scribeSessionId: scribeSessionId,
          status,
          note: normalizedNote,
        };

        await createScribeReview(params).unwrap();
      }
    } catch (err: any) {
      const message =
        err?.data?.message ?? err?.message ?? "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  const handleToggleChange = (value: string) => {
    if (value === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW) {
      setShareForReview(true);
    } else {
      handleCreateReview({ status: value });
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
                              ${comment === selectedComment ? "text-[#FF9E28]" : "text-typography-800"}`}
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
    {
      alt: "Archive",
      icon: isArchived ? <Unarchive /> : <Archive />,
      onClick: () => {
        setIsArchiveDialogOpen(true);
      },
      show: hasAdequatePermission(Permissions.ARCHIVE_CALL_LOG) && showArchiveButton,
      text: isArchived ? "Unarchive session" : "Archive session",
    },
  ];

  const SidebarTitle = (
    <div className="text-base flex items-center justify-between w-full gap-2">
      <span className="font-semibold font-tertiary text-typography-800">
        {t("common.summary", "Summary")}
      </span>
      <div className="flex items-center gap-3">
        {FEATURE_FLAGS_MAP.SCRIBE_REVIEW_FLAG &&
          individualCallSummary?.details?.transcript?.length > 0 &&
          !callSummary?.archivedAt && (
            <div className="flex items-center gap-2">
              <span className="font-primary font-normal text-sm">Share for review</span>{" "}
              <ToggleSwitch
                enabled={
                  individualCallSummary?.reviewStatus === REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW
                }
                onChange={(value: boolean) => {
                  handleToggleChange(
                    value
                      ? REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW
                      : REVIEW_PRIVACY_OPTIONS_VALUES.HIDDEN,
                  );
                }}
              />
            </div>
          )}
        {individualCallSummary?.reviewId && (
          <>
            <div className="border-l border-border h-5" />
            <Tooltip title="Comments" arrow>
              <button
                onClick={() =>
                  navigate(
                    ROUTES.SCRIBE_REVIEW_DETAILS?.replace(
                      ":reviewId",
                      individualCallSummary.reviewId,
                    ),
                  )
                }
                className="flex items-center justify-center h-[40px] w-[40px]"
              >
                <Comment className="w-6 h-6 shrink-0" />
                {/* <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{TODO: Add count of unread messages}</div> */}
              </button>
            </Tooltip>
          </>
        )}
        {extraHeaderList
          .filter(button => button.show)
          .map(button => (
            <Tooltip
              key={button.alt}
              title={button.text ?? ""}
              placement="top"
              arrow
              slotProps={toolTipStyles}
            >
              <span style={{ display: "inline-flex" }}>
                <Button
                  data-testid={`drawer-header-button-${button.alt}`}
                  variant={ButtonVariant.ICON}
                  onClick={button.onClick}
                  className="flex items-center gap-2 font-tertiary text-xs text-typography-900"
                >
                  {button.icon}
                </Button>
              </span>
            </Tooltip>
          ))}
      </div>
      <ShareForReview
        isOpen={shareForReview}
        onClose={() => {
          setShareForReview(false);
        }}
        summaryDetails={individualCallSummary}
        onNoteChange={(note: string) => {
          handleCreateReview({
            scribeSessionId: callSummary?.id,
            status: REVIEW_PRIVACY_OPTIONS_VALUES.IN_REVIEW,
            note,
          });
        }}
        tag={"Scribe"}
      />
    </div>
  );

  const tabList = [
    {
      id: 1,
      label: t("common.summary", "Summary"),
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
          callSummary={individualCallSummary}
          onRefetchSummary={refetchCallSummary}
          postProcess={refetchCallLogs}
          isInSidebar={true}
          canEditSummary={canEditSummary}
          isSummaryLoading={isSummaryLoading}
          summaryLoadingError={summaryLoadingError}
        />
      ),
    },
    {
      id: 2,
      label: t("postSim.tabs.transcription", "Transcription"),
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

  const onUnarchiveConfirm = async () => {
    try {
      await archiveCallLog({
        chatId: callSummary.id,
        archive: false,
      }).unwrap();
      setIsArchived(false);
      setIsArchiveDialogOpen(false);
      toast.success("Call log unarchived successfully");
      // Close the sidebar since the unarchived log won't be in the archived list
      setCallSummary(null);
    } catch (error) {
      const errorMessage = error?.data?.message || "Failed to unarchive call log";
      toast.error(errorMessage);
      setIsArchiveDialogOpen(false);
    }
  };

  const onArchiveConfirm = async () => {
    try {
      await archiveCallLog({
        chatId: callSummary.id,
        archive: true,
      }).unwrap();
      setIsArchived(true);
      setIsArchiveDialogOpen(false);
      toast.success("Call log archived successfully");
      // Close the sidebar since the archived log won't be in the non-archived list
      setCallSummary(null);
    } catch (error) {
      const errorMessage = error?.data?.message || "Failed to archive call log";
      toast.error(errorMessage);
      setIsArchiveDialogOpen(false);
    }
  };

  return (
    <SummarySidebarWrapper
      onSidebarClose={onSidebarClose}
      tabList={permittedTabList}
      title={SidebarTitle}
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
      <ArchiveDialog
        isArchived={isArchived}
        onUnarchiveConfirm={onUnarchiveConfirm}
        onArchiveConfirm={onArchiveConfirm}
        onClose={() => {
          setIsArchiveDialogOpen(false);
        }}
        isOpen={isArchiveDialogOpen}
      />
    </SummarySidebarWrapper>
  );
};

export default CallSummarySidebar;
