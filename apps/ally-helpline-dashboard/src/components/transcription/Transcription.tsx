import { FC, useEffect, useRef, useState, useLayoutEffect, useCallback, useMemo } from "react";

import "./styles.css";
import { AddComment } from "@ally-ui-mono/ui-shared/assets";
import { InfiniteScroll } from "@ally-ui-mono/ui-shared/index";
import { useClickOutside } from "@hooks";
import { THREAD_LIST } from "@pages/review-details/dummy";
import { CommentItem } from "@pages/review-details/types";

import { Thread } from "./types";
import { getFreshUserRange, splitTextByComments } from "./utils";
import CommentAdditionDialog from "../comment-addition-dialog/CommentAdditionDialog";
import CommentThread from "../comment-thread/CommentThread";

interface SimulationTranscriptMessage {
  id: number;
  content: string;
  senderId: number;
  startSeconds?: number;
  endSeconds?: number | null;
  createdAt?: string;
  comments?: Thread[];
}

interface TranscriptionProps {
  transcriptList: SimulationTranscriptMessage[];
  userId: number;
  canSelect?: boolean;
  selectedMessageId?: string;
  selectedStartIndex?: number;
  selectedEndIndex?: number;
  onCloseSelectedComment?: () => void;
  className?: string;
  handleLoadMore?: () => void;
  isLoading?: boolean;
}
const DIALOG_WIDTH = 360;

const Transcription: FC<TranscriptionProps> = ({
  transcriptList,
  userId,
  canSelect = false,
  selectedMessageId,
  selectedStartIndex,
  selectedEndIndex,
  onCloseSelectedComment,
  className,
  handleLoadMore,
  isLoading,
}) => {
  const contentRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const addCommentDialogRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const selectedCommentRef = useRef<HTMLSpanElement | null>(null);
  const selectedCommentCalloutRef = useRef<HTMLDivElement | null>(null);
  const [transcriptions, setTranscriptions] = useState<SimulationTranscriptMessage[]>([]);
  const [addCommentDialogOpen, setAddCommentDialogOpen] = useState<number | null>(null);
  const [dialogPosition, setDialogPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const calculateDialogPosition = useCallback(() => {
    if (addCommentDialogOpen === null || !dialogRef.current) return;

    const parentRect = dialogRef.current.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    const viewportWidth = window.innerWidth;
    let left = parentRect.left;
    const top = parentRect.bottom + 8; // 8px below the highlighted text

    // Check if dialog would overflow on the right
    if (left + DIALOG_WIDTH > viewportWidth - 16) {
      left = viewportWidth - DIALOG_WIDTH - 16;
    }

    // Ensure it doesn't go off the left edge
    if (left < 16) {
      left = 16;
    }

    setDialogPosition({ top, left });
  }, [addCommentDialogOpen]);

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

  useLayoutEffect(() => {
    calculateDialogPosition();
  }, [addCommentDialogOpen, calculateDialogPosition]);

  useEffect(() => {
    setTranscriptions(transcriptList);
  }, [transcriptList]);

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
      currentTranscription.comments?.filter(comment => comment.comments?.length !== 0) || [];

    const newComments = [
      ...existingComments,
      {
        startIndex,
        endIndex,
        selectedText,
        comments: [],
      },
    ];
    setAddCommentDialogOpen(null);
    setTranscriptions(prev =>
      prev.map((transcript, i) =>
        i === index
          ? { ...transcript, comments: newComments }
          : {
              ...transcript,
              comments:
                transcript.comments?.filter(comment => comment.comments?.length !== 0) || [],
            },
      ),
    );
  };

  const handleCancelComment = useCallback(() => {
    setTranscriptions(prev =>
      prev.map(transcript => ({
        ...transcript,
        comments: transcript.comments?.filter(comment => comment.comments?.length !== 0) || [],
      })),
    );
    setAddCommentDialogOpen(null);
  }, []);

  const handleCloseSelectedComment = useCallback(() => {
    onCloseSelectedComment?.();
  }, [onCloseSelectedComment]);

  const commentsList = useMemo(() => {
    return THREAD_LIST.find(thread => thread.selection.messageId === selectedMessageId)?.comments;
  }, [THREAD_LIST, selectedMessageId]);

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
            <div className="text-justify">
              <span className="font-medium pr-1">
                {transcript.senderId === userId ? (
                  <span className="text-primary-600">You:</span>
                ) : (
                  <span className="text-black">Agent:</span>
                )}
              </span>
              <span
                ref={el => (contentRefs.current[index] = el)}
                onMouseUp={() => handleSelection(index)}
                className={`text-black selected-text ${canSelect ? "cursor-text" : "cursor-default"}`}
              >
                {splitTextByComments(transcript.content, transcript.comments).map(
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
                        className={`relative ${
                          segment.isComment
                            ? segment.comments?.length !== 0
                              ? `${selectedMessageId ? "bg-amber-200" : "bg-amber-50"} border-b border-amber-400`
                              : "bg-[#E1F1FE]"
                            : ""
                        }`}
                      >
                        {segment.content}
                        {segment.isComment &&
                          segment.comments?.length === 0 &&
                          addCommentDialogOpen !== segIdx && (
                            <div
                              ref={setPositionRef}
                              onClick={() => setAddCommentDialogOpen(segIdx)}
                              className="absolute hover:bg-[#F3F3F3] z-10 flex gap-2 cursor-pointer items-center -top-[50px] px-4 py-2 w-[160px] right-0 shadow-lg border h-[40px] rounded-[100px] bg-white"
                            >
                              <AddComment className="w-6 h-6 pt-1" />
                              <span className="text-sm font-medium whitespace-nowrap">
                                Add comment
                              </span>
                            </div>
                          )}
                        {addCommentDialogOpen === segIdx && (
                          <div
                            ref={dialogRef}
                            className="fixed z-50"
                            style={{
                              top: dialogPosition.top,
                              left: dialogPosition.left,
                            }}
                          >
                            <CommentAdditionDialog onCancel={handleCancelComment} />
                          </div>
                        )}
                        {isSelectedComment && commentsList && (
                          <div
                            ref={selectedCommentCalloutRef}
                            className="absolute top-full left-0 z-50 mt-1"
                          >
                            <CommentThread comments={commentsList as CommentItem[]} />
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
