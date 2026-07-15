import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AddComment } from "@ally-ui-mono/ui-shared/assets";
import { useCreateCommentMutation } from "@src/api";
import CommentAdditionDialog from "@src/components/comment-addition-dialog/CommentAdditionDialog";
import CommentThread from "@src/components/comment-thread/CommentThread";
import { useClickOutside } from "@src/hooks";
import { RootState } from "@src/store";
import { CommentItem, CommentChangeParams, SimulationTranscriptMessage } from "@src/types";

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
  handleCommentClick: (props: {
    messageId: string;
    startIndex: number;
    endIndex: number;
    threadId: string;
  }) => void;
  onDeleteComment: (val?: number) => void;
  setNewCommentSelection: (
    value: {
      startIndex: number;
      endIndex: number;
      transcriptId: number;
    } | null,
  ) => void;
  onCancelComment: () => void;
  onCommentChange: (params: CommentChangeParams) => void;
  onAddComment: () => void;
  isScribeReview?: boolean;
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
  commentsList,
  onCancelComment,
  onCommentChange,
  onAddComment,
  onDeleteComment,
  isScribeReview,
}: SelectableTextProps) => {
  const { t } = useTranslation();
  const { reviewId } = useParams<{ reviewId: string }>();
  const [
    createComment,
    {
      isSuccess: isCreateCommentSuccess,
      isLoading: isCreateCommentLoading,
      isError: isCreateCommentError,
      data: createCommentData,
    },
  ] = useCreateCommentMutation();
  const [commentContent, setCommentContent] = useState<string>("");
  const [threadsOffset, setThreadsOffset] = useState(0);
  const user = useSelector((state: RootState) => state.user.user);
  const addCommentDialogRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const selectedCommentCalloutRef = useRef<HTMLDivElement | null>(null);
  // Ids of comments deleted locally this session. The list is reseeded from
  // force-refetching REVIEW queries (this component's `commentsList` and the
  // thread's own query), which can briefly return a just-deleted comment and
  // clobber the optimistic removal. Both reseeds exclude these ids.
  const deletedCommentIdsRef = useRef<Set<string>>(new Set());
  const [comments, setComments] = useState<CommentItem[]>(commentsList ?? []);
  const [dialogPosition, setDialogPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [commentThreadPosition, setCommentThreadPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  useEffect(() => {
    setComments((commentsList ?? []).filter(c => !deletedCommentIdsRef.current.has(c.id)));
  }, [commentsList]);

  useEffect(() => {
    if (isCreateCommentError) {
      toast.error("Failed to create comment");
      setAddCommentDialogOpen(null);
    }
  }, [isCreateCommentError]);

  useEffect(() => {
    if (isCreateCommentSuccess && createCommentData?.comment) {
      toast.success("Comment created successfully");
      const newComment: CommentItem = {
        id: createCommentData.comment.id,
        content: commentContent,
        createdBy: {
          id: user?.id,
          name: user?.name,
          profileImage: user?.profileImageUrl,
        },
        createdAt: createCommentData.comment.createdAt,
        reactions: {},
        replyCount: 0,
        myReaction: null,
        hidden: false,
      };
      onCommentChange?.({
        comments: [newComment, ...(selectedThreadId ? comments : [])],
        threadId: createCommentData.thread?.id ?? selectedThreadId,
        transcript: {
          id: transcript.id,
        },
        selection: {
          text: segment.text,
          startIndex: segment.start,
          endIndex: segment.end,
          messageId: transcript.id,
        },
        isThreadExists: Boolean(selectedThreadId),
      });
      setAddCommentDialogOpen(null);
      onAddComment?.();
      setComments(prev => [newComment, ...(prev ?? [])]);
      setNewCommentSelection(null);
    }
  }, [isCreateCommentSuccess]);
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
    segment.commentIds.includes(selectedThreadId) &&
    comments &&
    selectedThread &&
    segment.end === selectedThread.selection.endIndex;

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

  const handleDeleteComment = (threadcommentCount: number, commentCount: number = 1) => {
    if (threadcommentCount === 0) {
      onCommentChange?.({
        comments: [],
        threadId: selectedThreadId,
        transcript: { id: transcript.id },
      });
      handleCloseSelectedComment();
    }
    onDeleteComment?.(commentCount);
  };
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
  }, []);

  // Calculate position after the CommentThread is rendered
  useEffect(() => {
    if (!shouldShowCommentThread || !selectedCommentCalloutRef.current) return;

    const calculatePosition = () => {
      const element = selectedCommentCalloutRef.current;
      if (!element) return;

      const parentRect = element.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const threadWidth = 400; // CommentThread width
      const elementRect = element.getBoundingClientRect();
      const threadHeight = elementRect.height > 0 ? elementRect.height : 300; // Use actual height or fallback

      let left = parentRect.left;
      let top = parentRect.bottom + 4; // 4px below the highlighted text

      // Check if the bottom of the comment thread is below viewport
      if (top + threadHeight > viewportHeight - 16) {
        const overflow = top + threadHeight - (viewportHeight - 16);
        top = top - overflow; // Shift up by the overflow amount
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
    };

    // Use requestAnimationFrame to ensure the element has been painted
    requestAnimationFrame(() => {
      calculatePosition();
    });
  }, [shouldShowCommentThread, comments]);

  const handleCancelComment = useCallback(() => {
    setAddCommentDialogOpen(null);
    setNewCommentSelection(null);
    onCancelComment();
  }, []);

  const handleAddComment = async (comment: string) => {
    const body = {
      threadId: selectedThreadId,
      parentCommentId: null,
      messageId: transcript.id,
      content: comment,
      selection: { startIndex: segment.start, endIndex: segment.end },
    };
    setCommentContent(comment);
    await createComment({
      reviewId: reviewId,
      body: body,
      isScribe: isScribeReview,
    });
  };

  const handleNewComment = async (comment: string) => {
    if (!newCommentSelection) return;
    const body = {
      threadId: null,
      parentCommentId: null,
      messageId: transcript.id,
      content: comment,
      selection: {
        startIndex: newCommentSelection.startIndex,
        endIndex: newCommentSelection.endIndex,
      },
    };
    setCommentContent(comment);
    await createComment({
      reviewId: reviewId,
      body: body,
      isScribe: isScribeReview,
    });
  };

  const handleCloseSelectedComment = useCallback(() => {
    setCommentThreadPosition({ top: 0, left: 0 }); // Reset position so it's hidden on next open
    onCloseSelectedComment?.();
  }, [onCloseSelectedComment]);

  const getRandomCommentId = () => {
    return segment.commentIds[Math.floor(Math.random() * segment.commentIds.length)];
  };
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
        threadId: getRandomCommentId(),
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
            ? `${String(selectedMessageId) === String(transcript.id) && segment.commentIds.includes(selectedThreadId) ? "bg-amber-200" : "bg-amber-50"} border-b border-amber-400`
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
          <span className="text-sm font-medium whitespace-nowrap">
            {t("review.details.addComment")}
          </span>
        </div>
      )}
      {addCommentDialogOpen === `${index}-${segIdx}` && newCommentSelection && (
        <div
          ref={setDialogRef}
          className="fixed z-50"
          style={{
            top: dialogPosition.top,
            left: dialogPosition.left,
            opacity: isCreateCommentLoading ? 0.5 : 1,
          }}
        >
          <CommentAdditionDialog onCancel={handleCancelComment} onComment={handleNewComment} />
        </div>
      )}
      {shouldShowCommentThread && (
        <div
          ref={setCommentThreadRef}
          className="fixed z-50"
          style={{
            top: commentThreadPosition.top,
            left: commentThreadPosition.left,
            visibility:
              commentThreadPosition.top === 0 && commentThreadPosition.left === 0
                ? "hidden"
                : "visible",
          }}
        >
          <CommentThread
            isScribeReview={isScribeReview}
            id={selectedThreadId}
            isFeedOwner={isFeedOwner}
            messageId={String(transcript.id)}
            selection={{ startIndex: segment.start, endIndex: segment.end }}
            comments={comments as CommentItem[]}
            onCommentAddition={handleAddComment}
            onDeleteComment={handleDeleteComment}
            setComments={setComments}
            onCommentChange={params =>
              onCommentChange({ ...params, transcript: { id: transcript.id } })
            }
            onAddComment={onAddComment}
            threadsOffset={threadsOffset}
            setThreadsOffset={setThreadsOffset}
            deletedCommentIds={deletedCommentIdsRef}
          />
        </div>
      )}
    </span>
  );
};

export default SelectableText;
