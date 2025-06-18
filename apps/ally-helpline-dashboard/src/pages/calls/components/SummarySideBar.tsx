import { FC, useEffect, useState, useRef } from "react";
import { Tabs, Tab } from "@mui/material";

import { ActionDialog, Drawer, TextField } from "@/components";
import { Delete, Download, Edit } from "@/assets/icons";
import { useLazyExportCallSummaryQuery, useUpdateCallInfoMutation, useUpdateCallSummaryMutation } from "@/api/callSummary";
import CallSummary from "@/pages/post-call-summary/components/CallSummary";
import { useFileExport } from "@/hooks";

import { DeleteDialogData, SummarySideBarProps } from "../types";
import { defaultDeleteDialogData, tabStyles } from "../constants";

// TODO: Added only for removing lint error - remove and find actual solution
declare global {
  interface Window {
    handleCommentClick: (comment: string) => void;
  }
}

const SummarySideBar: FC<SummarySideBarProps> = ({ callSummary, refetchCallLogs, setCallSummary }) => {
  const [selectedTab, setSelectedTab] = useState(1);
  const [selectedComment, setSelectedComment] = useState<string>("");
  const [summaryName, setSummaryName] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [deleteDialogData, setDeleteDialogData] = useState<DeleteDialogData>(defaultDeleteDialogData);

  const summaryNameRef = useRef<HTMLInputElement>(null);

  const [updateCallInfo, { isLoading: isUpdating }] = useUpdateCallInfoMutation();
  const [exportCallSummary, { isLoading: isExporting }] = useLazyExportCallSummaryQuery();
  const [updateCallSummary, { isLoading: isUpdatingCallSummary }] = useUpdateCallSummaryMutation();

  const { exportTxtFromText } = useFileExport();

  const isLoading = isUpdating || isExporting || isUpdatingCallSummary;

  useEffect(() => {
    setSummaryName(callSummary?.details?.callInfo?.summaryName);
  }, [callSummary]);

  useEffect(() => {
    if (isRenaming) {
      summaryNameRef.current?.focus();
    }
  }, [isRenaming]);

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
      } else {
        throw new Error("No data received from export API");
      }

      exportTxtFromText(summaryText, summaryName);
    } catch (error) {
      console.error("Error exporting call summary:", error);
    }
  };

  const onDeleteClick = () => {
    setDeleteDialogData({ open: true, chatId: callSummary?.id });
  };

  const onDeleteConfirm = () => {
    updateCallSummary({ chatId: callSummary?.id, data: { summary: [] } });
    refetchCallLogs();
    setDeleteDialogData(defaultDeleteDialogData);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const onRenameButtonClick = () => {
    setIsRenaming(true);
  };

  const onRenameSummary = async (value: string) => {
    if (!value.trim() || value === callSummary?.details?.callInfo?.summaryName) {
      setIsRenaming(false);
      return;
    };
    try {
      await updateCallInfo({ chatId: callSummary?.id, callInfo: { summaryName: value } });
    } catch (error) {
      console.error("Error updating call summary:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Drawer
      open={true}
      onClose={() => setCallSummary(null)}
      className="font-['IBM_Plex_Serif']"
      title={summaryName}
      headerButtons={[
        {
          alt: "Export",
          icon: <Download />,
          onClick: onExportClick,
        },
        // Hidden till a clarity is achieved on the delete functionality
        // {
        //   alt: "Delete",
        //   icon: <Delete />,
        //   onClick: onDeleteClick,
        // },
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
            }
          }}
        >
          <Tab
            label="Summary"
            value={1}
            sx={tabStyles}
          />
          <Tab
            label="Feedback"
            value={2}
            sx={tabStyles}
          />
        </Tabs>

        {selectedTab === 1 && (
          <div className="w-full h-full overflow-y-auto p-2">
            <div className="flex items-center mb-4">
              <TextField
                inputRef={summaryNameRef}
                value={summaryName}
                onChange={(e) => setSummaryName(e.target.value)}
                onBlur={() => onRenameSummary(summaryName)}
                className={`${isRenaming ? "" : "pointer-events-none"} w-fit`}
                inputStyles={{ fontSize: "24px", fontWeight: "700", fontFamily: "IBM_Plex_Serif" }}
                showBorder={false}
              />
              {!isRenaming && <Edit onClick={onRenameButtonClick} className="cursor-pointer" />}
            </div>
            <CallSummary
              callSummary={callSummary}
              chatId={callSummary.id}
              isSummaryLoading={isLoading}
              onProceed={() => refetchCallLogs()}
              showInitialLoading={false}
              setShowInitialLoading={() => { }}
            />
          </div>
        )}
        {selectedTab === 2 && (
          <div className="flex flex-1 overflow-y-hidden h-[calc(100vh-75px)]">
            {callSummary?.details?.transcript?.length > 0 && (
              <div className="flex-1 overflow-y-scroll p-4">
                <h3 className="font-semibold text-sm mb-4">Transcript</h3>
                <div className="space-y-4 flex-1 mb-20">
                  {callSummary?.details?.transcript
                    ?.split("\n")
                    ?.filter((line: string) => line.trim() !== "")
                    .map((line: string, index: number) => {
                      const [speaker, ...rest] = line.split(":");
                      const message = rest.join(":");

                      window.handleCommentClick = (comment: string) => {
                        setSelectedComment(comment === selectedComment ? "" : comment);
                      };
                      // Create highlighted message by checking for comment keywords
                      // TODO: check if comments are correctly destructured
                      const highlightedMessage = callSummary?.details?.comments?.length
                        ? callSummary?.details?.comments.reduce((text, { comment }) => {
                          const regex = new RegExp(`(${comment})`, "gi");
                          return text.replace(
                            regex,
                            selectedComment === comment
                              ? `<button
                                  onclick="window.handleCommentClick('${comment}')"
                                  style="background-color: #FFF9E6; border-bottom: 2px solid #fef08a; pointer: cursor;">$1
                                  </button>`
                              : `<button
                                  onclick="window.handleCommentClick('${comment}')"
                                  style="border-bottom: 2px solid #fef08a; cursor: pointer;">$1</button>`
                          );
                        }, message)
                        : message;

                      return (
                        <div key={`${speaker}-${index}`} className="flex">
                          <div className="text-sm text-gray-500 w-[40px]">
                            {(0.01 + index / 100).toFixed(2)}
                          </div>
                          <div className="flex-1 text-sm">
                            <span className="font-semibold">{speaker}: </span>
                            <span
                              className="font-['IBM_Plex_Serif']"
                              dangerouslySetInnerHTML={{
                                __html: highlightedMessage,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>)}
            {/* TODO: check if comments are correctly destructured */}
            {callSummary?.details?.comments?.length > 0 && (
              <div className="flex-1 p-4 bg-[#F0F4F8]">
                <h3 className="font-semibold text-sm mb-2">Comments</h3>
                <div className="space-y-4 font-['IBM_Plex_Serif']">
                  {callSummary?.details?.comments.map(({ comment, description }, index) => (
                    <div
                      key={`comment-${index}`}
                      className={`p-3 rounded-lg border
                                ${comment === selectedComment ? "border-[#FECA04] bg-[#FFF9E6]" : "bg-white"} `}
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
          </div>
        )}
      </div>
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
      >
        <span className="text-[14px] text-[#47464F]">
          Are you sure you want to delete this summary? This action can&apos;t be undone.
        </span>
      </ActionDialog>
    </Drawer>
  );
};

export default SummarySideBar;
