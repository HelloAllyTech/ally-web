import { FC, useEffect, useRef, useState, useCallback } from "react";

import "./styles.css";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AddComment } from "@ally-ui-mono/ui-shared/assets";
import { InfiniteScroll } from "@ally-ui-mono/ui-shared/index";
import { useClickOutside } from "@hooks";
import { CommentItem, SimulationTranscriptMessage, Thread } from "@types";

import { getFreshUserRange, splitTextByComments } from "./utils";
import CommentAdditionDialog from "../comment-addition-dialog/CommentAdditionDialog";
import CommentThread from "../comment-thread/CommentThread";

interface TranscriptionProps {
  transcriptList: SimulationTranscriptMessage[];
  userId?: number;
  canSelect?: boolean;
  selectedMessageId?: string;
  selectedStartIndex?: number;
  selectedEndIndex?: number;
  handleCommentClick?: (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: number;
  }) => void;
  commentsList?: CommentItem[];
  selectedThreadId?: number;
  onCloseSelectedComment?: () => void;
  className?: string;
  handleLoadMore?: () => void;
  isLoading?: boolean;
  createComment?: (
    reviewId: string,
    body: {
      threadId: number | null;
      parentCommentId: number | null;
      messageId: number;
      content: string;
      selection: { startIndex: number; endIndex: number };
    },
  ) => Promise<void>;
  isCreateCommentLoading?: boolean;
  isCreateCommentSuccess?: boolean;
}
const DIALOG_WIDTH = 360;

const Transcription: FC<TranscriptionProps> = ({
  transcriptList,
  canSelect = false,
  selectedMessageId,
  selectedStartIndex,
  selectedEndIndex,
  handleCommentClick,
  onCloseSelectedComment,
  commentsList,
  selectedThreadId,
  className,
  handleLoadMore,
  isLoading,
  createComment,
  isCreateCommentLoading,
  isCreateCommentSuccess,
}) => {
  const contentRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const { reviewId } = useParams<{ reviewId: string }>();
  const addCommentDialogRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const selectedCommentRef = useRef<HTMLSpanElement | null>(null);
  const selectedCommentCalloutRef = useRef<HTMLDivElement | null>(null);
  const [transcriptions, setTranscriptions] = useState<SimulationTranscriptMessage[]>([]);
  const [addCommentDialogOpen, setAddCommentDialogOpen] = useState<string | null>(null);
  const [dialogPosition, setDialogPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [commentThreadPosition, setCommentThreadPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  const setPositionRef = useCallback((element: HTMLDivElement | null) => {
    addCommentDialogRef.current = element;
    if (element) {
      const parentRect = element.parentElement?.getBoundingClientRect();
      if (parentRect && parentRect.top < 150) {
        element.style.top = "auto";
        element.style.bottom = "-50px";
      } else {
        element.style.top = "-50px";
        element.style.bottom = "auto";
      }
    }
  }, []);

  const setDialogRef = useCallback((element: HTMLDivElement | null) => {
    dialogRef.current = element;
    if (element) {
      const parentRect = element.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = parentRect.left;
      let top = parentRect.bottom + 8; // 8px below the highlighted text

      // Check if dialog would overflow on the bottom
      if (top + 200 > viewportHeight) {
        top = parentRect.top - 200 - 8; // Position above if not enough space below
      }

      // Check if dialog would overflow on the right
      if (left + DIALOG_WIDTH > viewportWidth - 16) {
        left = viewportWidth - DIALOG_WIDTH - 16;
      }

      // Ensure it doesn't go off the left edge
      if (left < 16) {
        left = 16;
      }

      setDialogPosition({ top, left });
    }
  }, []);

  const setCommentThreadRef = useCallback((element: HTMLDivElement | null) => {
    selectedCommentCalloutRef.current = element;
    if (element) {
      const parentRect = element.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const threadWidth = 400; // CommentThread width
      const threadHeight = 300; // Approximate height

      let left = parentRect.left;
      let top = parentRect.bottom + 4; // 4px below the highlighted text

      // Check if thread would overflow on the bottom
      if (top + threadHeight > viewportHeight - 16) {
        top = parentRect.top - threadHeight - 4; // Position above if not enough space below
      }

      // Check if thread would overflow on the right
      if (left + threadWidth > viewportWidth - 16) {
        left = viewportWidth - threadWidth - 16;
      }

      // Ensure it doesn't go off the left edge
      if (left < 16) {
        left = 16;
      }

      setCommentThreadPosition({ top, left });
    }
  }, []);

  useEffect(() => {
    setTranscriptions(transcriptList);
  }, [transcriptList]);

  useEffect(() => {
    if (isCreateCommentSuccess) {
      toast.success("Comment created successfully");
      setAddCommentDialogOpen(null);
    }
  }, [isCreateCommentSuccess]);

  useEffect(() => {
    if (selectedMessageId && String(selectedStartIndex) && String(selectedEndIndex)) {
      const index = transcriptions.findIndex(
        transcript => transcript.id === parseInt(selectedMessageId),
      );
      if (index !== -1) {
        const selectedText = transcriptions[index].content.slice(
          selectedStartIndex,
          selectedEndIndex,
        );
        const newMessage = {
          ...transcriptions[index],
          comments: [
            {
              startIndex: selectedStartIndex,
              endIndex: selectedEndIndex,
              selectedText,
              comments: [
                {
                  text: selectedText,
                },
              ],
            },
          ],
        };
        setTranscriptions(prev =>
          prev.map((transcript, i) => (i === index ? newMessage : transcript)),
        );
      }
    }
  }, [selectedMessageId, selectedStartIndex, selectedEndIndex]);
  const convertSecondsToTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toFixed(0).toString().padStart(2, "0")}`;
  };
  const handleSelection = (index: number) => {
    if (!canSelect) return;
    const container = contentRefs.current[index];
    if (!container) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = getFreshUserRange(selection);

    if (!container.contains(range.startContainer)) return;

    let startIndex = 0;
    let found = false;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (node.parentNode && node.parentNode.parentNode === container) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    });
    let node = walker.nextNode();

    while (node) {
      if (node === range.startContainer) {
        startIndex += range.startOffset;
        found = true;
        break;
      }
      startIndex += node.textContent?.length || 0;
      node = walker.nextNode();
    }

    if (!found) return;

    const selectedText = range.toString();
    const endIndex = startIndex + selectedText.length;

    const currentTranscription = transcriptions[index];
    const existingComments =
      currentTranscription.threads?.filter(comment => comment.comments?.length !== 0) || [];

    const newComments = [
      ...existingComments,
      {
        selection: {
          startIndex,
          endIndex,
        },
        selectedText,
        comments: [],
      },
    ];
    setAddCommentDialogOpen(null);
    setTranscriptions(prev =>
      prev.map((transcript, i) =>
        i === index
          ? { ...transcript, threads: newComments as Thread[] }
          : {
              ...transcript,
              threads: transcript.threads?.filter(comment => comment.comments?.length !== 0) || [],
            },
      ),
    );
  };

  const handleCancelComment = useCallback(() => {
    setTranscriptions(prev =>
      prev.map(transcript => ({
        ...transcript,
        threads: transcript.threads?.filter(thread => thread.comments?.length !== 0) || [],
      })),
    );
    setAddCommentDialogOpen(null);
  }, []);

  const handleCloseSelectedComment = useCallback(() => {
    onCloseSelectedComment?.();
  }, [onCloseSelectedComment]);

  const handleCreateComment = async (
    comment: string,
    selection: { startIndex: number; endIndex: number },
    transcriptId: number,
    threadId: number | null,
    parentCommentId: number | null,
  ) => {
    await createComment?.(reviewId, {
      threadId: threadId,
      parentCommentId: parentCommentId,
      messageId: transcriptId,
      content: comment,
      selection: selection,
    });
  };
  // Close dialogs on outside click
  useClickOutside(dialogRef, handleCancelComment);
  useClickOutside(selectedCommentCalloutRef, handleCloseSelectedComment);
  useClickOutside(addCommentDialogRef, handleCancelComment);

  const TranscriptSkeleton = () => (
    <div className="flex flex-col gap-6 h-full w-full">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="flex gap-4 animate-pulse">
          <div className="h-6 w-14 bg-gray-200 rounded shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-14 bg-gray-200 rounded shrink-0" />
              <div className="h-6 flex-1 bg-gray-200 rounded" />
            </div>
            {index % 2 === 0 && <div className="h-6 w-4/5 bg-gray-200 rounded" />}
            {index % 3 === 0 && <div className="h-6 w-2/3 bg-gray-200 rounded" />}
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading && transcriptions.length === 0) {
    return (
      <div className={`flex flex-col pt-10 -mt-10 gap-4 font-primary h-full w-full !overflow-clip`}>
        <TranscriptSkeleton />
      </div>
    );
  }

  return (
    <div className={`flex flex-col pt-10 -mt-10 gap-4 font-primary ${className}`}>
      <InfiniteScroll onInfiniteScroll={handleLoadMore} isLoading={isLoading}>
        {transcriptions.map((transcript, index) => (
          <div
            key={transcript.startSeconds}
            className={`flex gap-4 ${!canSelect ? "pointer-events-none select-none" : ""}`}
          >
            <div className="text-neutral-500">
              {convertSecondsToTime(transcript.startSeconds ?? 0)}
            </div>
            <div>
              <span className="font-medium pr-1">
                {transcript.senderId === -1 ? (
                  <span className="text-black ">Agent:</span>
                ) : (
                  <span className="text-primary-600">You:</span>
                )}
              </span>
              <span
                ref={el => (contentRefs.current[index] = el)}
                onMouseUp={() => handleSelection(index)}
                className={`text-black selected-text relative w-full ${canSelect ? "cursor-text" : "cursor-default"}`}
              >
                {splitTextByComments(transcript.content, transcript.threads).map(
                  (segment, segIdx) => {
                    const isSelectedComment =
                      selectedMessageId &&
                      transcript.id === parseInt(selectedMessageId) &&
                      segment.isComment &&
                      segment.comments?.length !== 0;

                    return (
                      <span
                        key={segIdx}
                        ref={isSelectedComment ? selectedCommentRef : undefined}
                        onClick={() => {
                          if (
                            segment.isComment &&
                            selectedThreadId !== segment.threadId &&
                            selectedMessageId !== String(transcript.id) &&
                            selectedStartIndex !== segment.selection?.startIndex &&
                            selectedEndIndex !== segment.selection?.endIndex
                          ) {
                            handleCommentClick?.({
                              messageId: String(transcript.id),
                              startIndex: segment.selection.startIndex,
                              endIndex: segment.selection.endIndex,
                              threadId: segment.threadId,
                            });
                          }
                        }}
                        className={`relative ${segment.isComment ? "cursor-pointer" : ""} ${
                          segment.isComment
                            ? segment.comments?.length !== 0
                              ? `${String(selectedMessageId) === String(transcript.id) && selectedThreadId === segment.threadId ? "bg-amber-200" : "bg-amber-50"} border-b border-amber-400`
                              : "bg-[#E1F1FE]"
                            : ""
                        }`}
                      >
                        {segment.content}
                        {segment.isComment &&
                          segment.comments?.length === 0 &&
                          addCommentDialogOpen !== `${index}-${segIdx}` && (
                            <div
                              ref={setPositionRef}
                              onClick={() => setAddCommentDialogOpen(`${index}-${segIdx}`)}
                              className="absolute hover:bg-[#F3F3F3] z-10 flex gap-2 cursor-pointer items-center top-full left-0 mt-1 px-4 py-2 w-[160px] shadow-lg border h-[40px] rounded-[100px] bg-white"
                            >
                              <AddComment className="w-6 h-6 pt-1" />
                              <span className="text-sm font-medium whitespace-nowrap">
                                Add comment
                              </span>
                            </div>
                          )}
                        {addCommentDialogOpen === `${index}-${segIdx}` && (
                          <div
                            ref={setDialogRef}
                            className="fixed z-50"
                            style={{
                              top: dialogPosition.top,
                              left: dialogPosition.left,
                              opacity: isCreateCommentLoading ? 0.5 : 1,
                            }}
                          >
                            <CommentAdditionDialog
                              onCancel={handleCancelComment}
                              onComment={comment =>
                                handleCreateComment(
                                  comment,
                                  segment.selection,
                                  transcript.id,
                                  null,
                                  null,
                                )
                              }
                            />
                          </div>
                        )}
                        {isSelectedComment &&
                          selectedThreadId === segment.threadId &&
                          commentsList && (
                            <div
                              ref={setCommentThreadRef}
                              className="fixed z-50"
                              style={{
                                top: commentThreadPosition.top,
                                left: commentThreadPosition.left,
                              }}
                            >
                              <CommentThread
                                comments={commentsList as CommentItem[]}
                                onCommentAddition={comment =>
                                  handleCreateComment(
                                    comment,
                                    segment.selection,
                                    transcript.id,
                                    selectedThreadId,
                                    null,
                                  )
                                }
                                onReplyComment={(replyComment, parentCommentId) =>
                                  handleCreateComment(
                                    replyComment,
                                    segment.selection,
                                    transcript.id,
                                    null,
                                    Number(parentCommentId),
                                  )
                                }
                              />
                            </div>
                          )}
                      </span>
                    );
                  },
                )}
              </span>
            </div>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default Transcription;
