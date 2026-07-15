import { useRef, useState, useEffect } from "react";

import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { AutoExpandableTextarea, CustomImage, InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { useGetReviewThreadCommentsQuery } from "@api";
import { Button, CommentCard } from "@components";
import { COMMENT_MAX_LENGTH } from "@constants";
import { RootState } from "@store";
import { CommentItem, CommentChangeParams } from "@types";

const PAGE_SIZE = 5;
interface CommentThreadProps {
  isFeedOwner?: boolean;
  comments: CommentItem[];
  onCommentAddition: (comment: string) => void;
  id: string;
  onDeleteComment: (threadcommentCount: number, commentCount: number) => void;
  messageId: string;
  selection: {
    startIndex: number;
    endIndex: number;
  };
  setComments?: React.Dispatch<React.SetStateAction<CommentItem[]>>;
  onCommentChange: (params: Omit<CommentChangeParams, "selection" | "newThread">) => void;
  threadsOffset: number;
  setThreadsOffset: React.Dispatch<React.SetStateAction<number>>;
  onAddComment: () => void;
  isScribeReview?: boolean;
  /**
   * Ids of comments deleted locally in this session. The list is reseeded from
   * a force-refetching REVIEW query, which can briefly return a just-deleted
   * comment (read-after-delete lag) and clobber the optimistic removal. The
   * reseed excludes these ids so a deleted comment cannot reappear.
   */
  deletedCommentIds?: React.MutableRefObject<Set<string>>;
}
const CommentThread = ({
  comments,
  onCommentAddition,
  isFeedOwner,
  id,
  onDeleteComment,
  messageId,
  selection,
  setComments,
  onCommentChange,
  threadsOffset,
  setThreadsOffset,
  onAddComment,
  isScribeReview,
  deletedCommentIds,
}: CommentThreadProps) => {
  const user = useSelector((state: RootState) => state.user.user);
  const [comment, setComment] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const { t } = useTranslation();

  const commentThreadScrollRef = useRef<HTMLDivElement | null>(null);

  const { data: threadComments, isLoading } = useGetReviewThreadCommentsQuery({
    id,
    limit: PAGE_SIZE,
    offset: threadsOffset,
    isScribe: isScribeReview,
  });

  useEffect(() => {
    if (!threadComments || threadComments.data.length === 0) return;
    // Exclude locally-deleted comments so a lagging refetch cannot re-add one.
    const nextData = (threadComments.data ?? []).filter(
      comment => !deletedCommentIds?.current.has(comment.id),
    );
    if (threadsOffset === 0) {
      setComments?.(nextData);
      onCommentChange?.({ comments: nextData, threadId: id });
    } else if (hasMore) {
      setComments?.((prev: CommentItem[]) => {
        const prevList = prev ?? [];
        const existingComments = new Set(prevList.map(comment => comment.id));
        const newComments = nextData.filter(comment => !existingComments.has(comment.id));
        onCommentChange?.({ comments: [...prevList, ...newComments], threadId: id });
        return [...prevList, ...newComments];
      });
    }
    setHasMore(nextData.length > 0);
  }, [threadComments]);

  const handleCommentAddition = () => {
    onCommentAddition(comment);
    setShowCommentBox(false);
    setComment("");
  };

  const handleCancel = () => {
    setComment("");
    setShowCommentBox(false);
  };

  const loadMoreComments = async () => {
    if (isLoading || !hasMore || (threadComments?.data?.length === 0 && threadsOffset > 0)) return;
    setThreadsOffset(prev => prev + PAGE_SIZE);
  };

  const renderCommentBox = () => {
    if (showCommentBox) {
      return (
        <div className="flex gap-2 flex-row w-full">
          <div className="w-8 h-8 rounded-full">
            <CustomImage
              src={user?.profileImageUrl}
              alt="user"
              className="w-full h-full rounded-full"
              fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
              fallbackText={user?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
            />
          </div>
          <div className="flex-1 mt-2">
            <AutoExpandableTextarea
              value={comment}
              onChange={setComment}
              autoFocus={true}
              placeholder={t("review.details.addCommentPlaceholder", "Add a comment")}
              maxLength={COMMENT_MAX_LENGTH}
              className="w-full border rounded-sm text-sm font-medium !px-2 !py-2 mt-2 min-h-20"
            />
            <div className="flex gap-2 flex-row my-2 justify-end">
              <Button variant="secondary" className="py-0 w-full" onClick={handleCancel}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button variant="primary" className="py-0 w-full" onClick={handleCommentAddition}>
                {t("review.details.commentAction", "Comment")}
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-row gap-2">
        <div className="w-8 h-8 rounded-full">
          <CustomImage
            src={user?.profileImageUrl}
            alt="user"
            className="w-full h-full rounded-full"
            fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
            fallbackText={user?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
          />
        </div>
        <div
          className="flex-1 w-full h-full justify-center min-h-[36px] cursor-pointer border-[1px] rounded-[8px] border-gray-200"
          onClick={() => setShowCommentBox(true)}
        >
          <div className="text-sm font-medium px-2 mt-2 text-typography-600">
            {t("review.details.addCommentPlaceholder", "Add a comment")}
          </div>
        </div>
      </div>
    );
  };

  const handleToggleHide = (hidden: boolean, commentId: string) => {
    setComments?.(prev => {
      const updatedComments = prev.map(comment =>
        comment.id === commentId ? { ...comment, hidden } : comment,
      );
      onCommentChange?.({ comments: updatedComments, threadId: id });
      return updatedComments;
    });
  };

  const onUpdateComment = (content: string, commentId: string) => {
    setComments?.(prev => {
      const updatedComments = prev.map(comment =>
        comment.id === commentId ? { ...comment, content } : comment,
      );
      onCommentChange?.({ comments: updatedComments, threadId: id });
      return updatedComments;
    });
  };

  const handleDeleteComment = (commentId: string) => {
    const currentComment = comments.find(comment => comment.id === commentId);
    const replyCount = currentComment?.replyCount ?? 0;
    const currentLength = (comments ?? []).length;
    // Remember this deletion so the reseed effects don't re-add it before the
    // backend is consistent.
    deletedCommentIds?.current.add(commentId);
    setComments?.(prev => {
      const filteredComments = prev.filter(comment => comment.id !== commentId);
      onCommentChange?.({ comments: filteredComments, threadId: id });
      return filteredComments;
    });
    onDeleteComment(currentLength - 1, replyCount + 1);
  };

  const handleDeleteReply = () => {
    onDeleteComment(1, 1);
  };

  const updateReplyCount = (count: number, commentId: string) => {
    setComments?.(prev => {
      const newComments = prev.map(comment =>
        comment.id === commentId ? { ...comment, replyCount: count } : comment,
      );
      onCommentChange?.({ comments: newComments, threadId: id });
      return newComments;
    });
  };

  const onEachCommentChange = (comment: CommentItem) => {
    setComments?.(prev => {
      const newComments = prev.map(c => (c.id === comment.id ? comment : c));
      onCommentChange?.({ comments: newComments, threadId: id });
      return newComments;
    });
  };
  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border w-[400px]">
      <div className="text-base font-medium border-b-[0.5px] pb-2 border-border-light">
        Comment Thread
      </div>
      <div className="flex flex-col gap-4 pt-4">
        {renderCommentBox()}
        <div
          ref={commentThreadScrollRef}
          className="flex flex-col gap-2 overflow-y-auto max-h-80 -mr-4 pr-4"
        >
          <InfiniteScroll
            onInfiniteScroll={loadMoreComments}
            isLoading={isLoading}
            scrollContainerRef={commentThreadScrollRef}
            hasMore={hasMore}
          >
            {(comments ?? []).map(comment => (
              <CommentCard
                isScribeReview={isScribeReview}
                key={comment.id}
                comment={comment}
                isFeedOwner={isFeedOwner}
                showLike
                showReply
                selectedThreadId={id}
                messageId={messageId}
                selection={selection}
                onToggleHide={handleToggleHide}
                onDelete={handleDeleteComment}
                onUpdateComment={onUpdateComment}
                updateReplyCount={count => updateReplyCount(count, comment.id)}
                onCommentChange={onEachCommentChange}
                onAddComment={onAddComment}
                onDeleteReply={handleDeleteReply}
              />
            ))}
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
