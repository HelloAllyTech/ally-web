import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { AddComment } from "@ally-ui-mono/ui-shared/assets";
import CommentAdditionDialog from "@src/components/comment-addition-dialog/CommentAdditionDialog";
import CommentThread from "@src/components/comment-thread/CommentThread";
import { useClickOutside } from "@src/hooks";
import { CommentItem, SimulationTranscriptMessage } from "@src/types";

const DIALOG_WIDTH = 360;
interface SelectableTextProps {
  segment: {
    text: string;
    commentIds: string[];
    start: number;
    end: number;
  };
  newCommentSelection: {
    startIndex: number;
    endIndex: number;
    transcriptId: number;
  } | null;
  selectedThreadId: string;
  isFeedOwner: boolean;
  index: number;
  segIdx: number;
  setAddCommentDialogOpen: (value: string | null) => void;
  addCommentDialogOpen: string | null;
  onCloseSelectedComment?: () => void;
  isSelectedComment: boolean;
  selectedCommentRef: React.RefObject<HTMLSpanElement>;
  selectedMessageId: string;
  transcript: SimulationTranscriptMessage;
  selectedEndIndex: number;
  commentsList: CommentItem[];
  handleCreateComment: (payload: {
    comment: string;
    selection: { startIndex: number; endIndex: number };
    transcriptId: number;
    threadId: string | null;
    parentCommentId: string | null;
  }) => void;
  isLoading: boolean;
  handleCommentClick: (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: string;
  }) => void;
  isCreateCommentSuccess: boolean;
  setNewCommentSelection: (
    value: {
      startIndex: number;
      endIndex: number;
      transcriptId: number;
    } | null,
  ) => void;
  onCancelComment: () => void;
}
const SelectableText = ({
  segment,
  segIdx,
  isFeedOwner,
  newCommentSelection,
  onCloseSelectedComment,
  isSelectedComment,
  selectedCommentRef,
  selectedMessageId,
  transcript,
  selectedEndIndex,
  setAddCommentDialogOpen,
  addCommentDialogOpen,
  setNewCommentSelection,
  handleCommentClick,
  selectedThreadId,
  index,
  isLoading,
  handleCreateComment,
  commentsList,
  isCreateCommentSuccess,
  onCancelComment,
}: SelectableTextProps) => {
  const addCommentDialogRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const selectedCommentCalloutRef = useRef<HTMLDivElement | null>(null);
  const [dialogPosition, setDialogPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [commentThreadPosition, setCommentThreadPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  // Check if this segment is part of the new comment selection (handles overlapping selections)
  const isPartOfNewSelection =
    newCommentSelection &&
    newCommentSelection.transcriptId === transcript.id &&
    segment.start < newCommentSelection.endIndex &&
    segment.end > newCommentSelection.startIndex;

  // Check if this segment is the last one in the new selection (where we show the "Add Comment" button)
  const isLastSegmentOfSelection =
    isPartOfNewSelection && segment.end === newCommentSelection.endIndex;

  // Find the thread that matches the selectedThreadId to get its end index
  const selectedThread = transcript.threads?.find(thread => thread.id === selectedThreadId);

  // Check if this segment should show the comment thread
  // Only show on the segment that ends at the thread's end index (prevents duplicate popups in overlapping sections)
  const shouldShowCommentThread =
    isSelectedComment &&
    selectedThreadId === segment.commentIds[0] &&
    commentsList &&
    selectedThread &&
    segment.end === selectedThread.selection.endIndex;

  useEffect(() => {
    if (isCreateCommentSuccess) {
      toast.success("Comment created successfully");
      setAddCommentDialogOpen(null);
    }
  }, [isCreateCommentSuccess]);
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

  const handleCancelComment = useCallback(() => {
    setAddCommentDialogOpen(null);
    setNewCommentSelection(null);
    onCancelComment();
  }, []);

  const handleAddComment = async (comment: string) => {
    await handleCreateComment({
      comment: comment,
      selection: { startIndex: segment.start, endIndex: segment.end },
      transcriptId: transcript.id,
      threadId: selectedThreadId,
      parentCommentId: null,
    });
  };

  const handleCloseSelectedComment = useCallback(() => {
    onCloseSelectedComment?.();
  }, [onCloseSelectedComment]);

  const onSegmentClick = () => {
    if (
      segment.commentIds.length > 0 &&
      selectedMessageId !== String(transcript.id) &&
      // selectedStartIndex !== segment.selection?.startIndex && //TODO: Uncomment this when the bug is fixed
      selectedEndIndex !== segment.end &&
      !isPartOfNewSelection // Don't trigger comment click if this is part of a new selection
    ) {
      handleCommentClick?.({
        messageId: String(transcript.id),
        startIndex: segment.start,
        endIndex: segment.end,
        threadId: segment.commentIds[0],
      });
    }
  };

  useClickOutside(dialogRef, handleCancelComment);
  useClickOutside(selectedCommentCalloutRef, handleCloseSelectedComment);
  useClickOutside(addCommentDialogRef, handleCancelComment);

  return (
    <span
      key={segIdx}
      ref={isSelectedComment ? selectedCommentRef : undefined}
      onClick={onSegmentClick}
      className={`relative ${segment.commentIds.length > 0 && !isPartOfNewSelection ? "cursor-pointer" : ""} ${
        isPartOfNewSelection
          ? "bg-[#E1F1FE]"
          : segment.commentIds.length > 0
            ? `${String(selectedMessageId) === String(transcript.id) && selectedThreadId === segment.commentIds[0] ? "bg-amber-200" : "bg-amber-50"} border-b border-amber-400`
            : ""
      }`}
    >
      {segment.text}
      {isLastSegmentOfSelection && addCommentDialogOpen !== `${index}-${segIdx}` && (
        <div
          ref={setPositionRef}
          onClick={() => setAddCommentDialogOpen(`${index}-${segIdx}`)}
          className="absolute hover:bg-[#F3F3F3] z-10 flex gap-2 cursor-pointer items-center top-full left-0 mt-1 px-4 py-2 w-[160px] shadow-lg border h-[40px] rounded-[100px] bg-white"
        >
          <AddComment className="w-6 h-6 pt-1" />
          <span className="text-sm font-medium whitespace-nowrap">Add Comment</span>
        </div>
      )}
      {addCommentDialogOpen === `${index}-${segIdx}` && newCommentSelection && (
        <div
          ref={setDialogRef}
          className="fixed z-50"
          style={{
            top: dialogPosition.top,
            left: dialogPosition.left,
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <CommentAdditionDialog
            onCancel={handleCancelComment}
            onComment={comment =>
              handleCreateComment({
                comment: comment,
                selection: {
                  startIndex: newCommentSelection.startIndex,
                  endIndex: newCommentSelection.endIndex,
                },
                transcriptId: transcript.id,
                threadId: null,
                parentCommentId: null,
              })
            }
          />
        </div>
      )}
      {shouldShowCommentThread && (
        <div
          ref={setCommentThreadRef}
          className="fixed z-50"
          style={{
            top: commentThreadPosition.top,
            left: commentThreadPosition.left,
          }}
        >
          <CommentThread
            id={selectedThreadId}
            isFeedOwner={isFeedOwner}
            comments={commentsList as CommentItem[]}
            onCommentAddition={handleAddComment}
            onReplyComment={(replyComment, parentCommentId) =>
              handleCreateComment({
                comment: replyComment,
                selection: { startIndex: segment.start, endIndex: segment.end },
                transcriptId: transcript.id,
                threadId: selectedThreadId,
                parentCommentId: parentCommentId,
              })
            }
          />
        </div>
      )}
    </span>
  );
};

export default SelectableText;
