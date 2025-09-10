import { FC, useEffect, useState, useRef, useMemo } from "react";

import { Tabs, Tab } from "@mui/material";
import { useSelector } from "react-redux";

import { InfiniteScroll, logger } from "@ally-ui-mono/ui-shared";
import {
  useGetTranscriptQuery,
  useLazyExportCallSummaryQuery,
  useUpdateCallSummaryMutation,
} from "@api";
import { DataPolicy, Download } from "@assets";
import { ActionDialog, Drawer } from "@components";
import { ALLY_DATA_POLICY_URL, CallProvider } from "@constants";
import { useFileExport } from "@hooks";
import CallSummary from "@pages/post-call-summary/components/CallSummary";
import { RootState } from "@store";
import { UserRole } from "@types";
import { openLinkInNewTab } from "@utils";

import { SummaryHeader } from ".";
import { defaultDeleteDialogData, tabStyles } from "../constants";
import { DeleteDialogData, SummarySideBarProps, Transcript } from "./types";

// TODO: Added only for removing lint error - remove and find actual solution
declare global {
  interface Window {
    handleCommentClick: (comment: string) => void;
  }
}

const SummarySideBar: FC<SummarySideBarProps> = ({
  callSummary,
  refetchCallLogs,
  setCallSummary,
  sessionType,
}) => {
  const { user } = useSelector((state: RootState) => state.user);

  const [selectedTab, setSelectedTab] = useState(1);
  const [selectedComment, setSelectedComment] = useState<string>("");
  const [deleteDialogData, setDeleteDialogData] =
    useState<DeleteDialogData>(defaultDeleteDialogData);
  const [summaryName, setSummaryName] = useState<string>();

  const [exportCallSummary, { isLoading: isExporting }] = useLazyExportCallSummaryQuery();
  const [updateCallSummary, { isLoading: isUpdatingCallSummary }] = useUpdateCallSummaryMutation();

  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<Transcript[]>([]);
  const TRANSCRIPT_PAGE_SIZE = 30;

  const { data: transcriptData, isLoading: isGetTranscriptLoading } = useGetTranscriptQuery({
    chatId: callSummary?.id,
    offset: transcriptOffset,
    limit: TRANSCRIPT_PAGE_SIZE,
    sortBy:
      callSummary?.details?.callInfo?.provider === CallProvider.WEBRTC
        ? "createdAt"
        : "startSeconds",
  });

  const transcript = useMemo(() => transcriptData?.data || [], [transcriptData]);
  const transcriptTotal = useMemo(() => transcriptData?.count || 0, [transcriptData]);

  const { exportTxtFromText } = useFileExport();
  const isLoading = isExporting || isUpdatingCallSummary;
  const isAdmin = user?.role === UserRole.ADMIN;

  // Append new results when transcriptData changes
  useEffect(() => {
    if (transcript.length > 0) {
      setTranscriptList(prev => [...prev, ...transcript]);
    }
  }, [transcript]);

  // Reset transcript list when call changes
  useEffect(() => {
    setTranscriptOffset(0);
  }, [callSummary?.id]);

  useEffect(() => {
    if (callSummary?.details?.callInfo?.summaryName) {
      setSummaryName(callSummary?.details?.callInfo?.summaryName);
    }
  }, [callSummary?.details?.callInfo?.summaryName]);

  const handleLoadMore = () => {
    if (transcriptOffset >= transcriptTotal) return;
    setTranscriptOffset(prev => prev + TRANSCRIPT_PAGE_SIZE);
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const renderTranscript = (item: Transcript, index: number) => {
    const { content, senderId } = item;
    let speaker = "User";
    if (senderId === callSummary.clientId) {
      speaker = "Client";
    } else if (senderId === callSummary.counselorId) {
      speaker = "Counsellor";
    } else {
      speaker = `User ${senderId}`;
    }

    window.handleCommentClick = (comment: string) => {
      setSelectedComment(comment === selectedComment ? "" : comment);
    };
    // Just display the content as plain text, no regex or highlighting
    return (
      <div key={`${senderId}-${index}`} className="flex">
        <div className="flex-1 text-sm">
          <span className="font-semibold">{speaker}: </span>
          <span className="font-['IBM_Plex_Serif']">{content}</span>
        </div>
      </div>
    );
  };

  const renderTranscripts = () => {
    return (
      <div className="flex-1 overflow-y-scroll p-4">
        <h3 className="font-semibold text-sm mb-4">Transcript</h3>
        {transcriptList.length > 0 ? (
          <div className="space-y-4 flex-1 mb-[12px] h-[calc(100vh-250px)] overflow-y-auto">
            <InfiniteScroll onInfiniteScroll={handleLoadMore} isLoading={isGetTranscriptLoading}>
              {transcriptList.map((item: Transcript, index: number) =>
                renderTranscript(item, index),
              )}
            </InfiniteScroll>
          </div>
        ) : (
          <div className="space-y-4 flex-1 mb-[12px]">
            <div className="text-sm text-gray-500">No transcript available</div>
          </div>
        )}
      </div>
    );
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

  return (
    <Drawer
      open={true}
      onClose={() => setCallSummary(null)}
      className="font-['IBM_Plex_Serif']"
      title="Summary"
      headerButtons={[
        {
          alt: "Data policy",
          icon: <DataPolicy />,
          onClick: () => openLinkInNewTab(ALLY_DATA_POLICY_URL),
          show: true,
          text: "Data policy",
        },
        {
          alt: "Export",
          icon: <Download />,
          onClick: onExportClick,
          // TODO: To be shown when the export functionality is implemented for admin
          show: !isAdmin,
          text: "Export summary",
        },
      ]}
    >
      <div className="w-[55vw] h-full flex flex-col">
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          className="w-full normal-case border-b border-[#DBDBDB] mb-4"
          sx={{
            "& .MuiButtonBase-root": {
              fontFamily: "IBM_Plex_Serif",
            },
          }}
        >
          <Tab label="Summary" value={1} sx={tabStyles} />
          <Tab label="Transcription" value={2} sx={tabStyles} />
        </Tabs>

        {selectedTab === 1 && (
          <div className="w-full h-full p-2">
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
          </div>
        )}
        {selectedTab === 2 && (
          <div className="flex flex-1 overflow-y-hidden h-[calc(100vh-75px)]">
            {renderTranscripts()}
            {renderComments()}
          </div>
        )}
      </div>
      {/* TODO: Remove if delete summary is not needed */}
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
    </Drawer>
  );
};

export default SummarySideBar;
