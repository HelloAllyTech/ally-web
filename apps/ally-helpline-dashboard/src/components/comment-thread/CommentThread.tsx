import { useRef, useState, useEffect } from "react";

import { useSelector } from "react-redux";

import { AutoExpandableTextarea, CustomImage, InfiniteScroll } from "@ally-ui-mono/ui-shared";
import { Button, CommentCard } from "@components";
import { useGetReviewThreadCommentsQuery } from "@src/api";
import { RootState } from "@store";
import { CommentItem } from "@types";

const PAGE_SIZE = 5;
interface CommentThreadProps {
  isFeedOwner?: boolean;
  comments: CommentItem[];
  onCommentAddition: (comment: string) => void;
  id: string;
  onDeleteComment: (commentCount: number) => void;
  messageId: string;
  selection: {
    startIndex: number;
    endIndex: number;
  };
  setComments?: React.Dispatch<React.SetStateAction<CommentItem[]>>;
  onCommentChange: (comments: CommentItem[], threadId: string) => void;
  threadsOffset: number;
  setThreadsOffset: React.Dispatch<React.SetStateAction<number>>;
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
}: CommentThreadProps) => {
  const user = useSelector((state: RootState) => state.user.user);
  const [comment, setComment] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [showCommentBox, setShowCommentBox] = useState(false);

  const commentThreadScrollRef = useRef<HTMLDivElement | null>(null);

  const { data: threadComments, isLoading } = useGetReviewThreadCommentsQuery({
    id,
    limit: PAGE_SIZE,
    offset: threadsOffset,
  });

  useEffect(() => {
    if (!threadComments || threadComments.data.length === 0) return;
    const nextData = threadComments.data ?? [];
    if (threadsOffset === 0) {
      setComments?.(nextData);
      onCommentChange?.(nextData, id);
    } else if (hasMore) {
      setComments?.((prev: CommentItem[]) => {
        const prevList = prev ?? [];
        const existingComments = new Set(prevList.map(comment => comment.id));
        const newComments = nextData.filter(comment => !existingComments.has(comment.id));
        onCommentChange?.([...prevList, ...newComments], id);
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
              placeholder="Add Comment"
              className="w-full border rounded-sm text-sm font-medium !px-2 !py-2 mt-2 min-h-20"
            />
            <div className="flex gap-2 flex-row my-2 justify-end">
              <Button variant="secondary" className="py-0 h-8" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" className="py-0 h-8" onClick={handleCommentAddition}>
                Comment
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
          <div className="text-sm font-medium px-2 mt-2 text-typography-600">Add Comment</div>
        </div>
      </div>
    );
  };

  const handleToggleHide = (hidden: boolean, commentId: string) => {
    onCommentChange?.(
      comments.map(comment => (comment.id === commentId ? { ...comment, hidden } : comment)),
      id,
    );
    setComments?.(prev =>
      prev.map(comment => (comment.id === commentId ? { ...comment, hidden } : comment)),
    );
  };

  const onUpdateComment = (content: string, commentId: string) => {
    onCommentChange?.(
      comments.map(comment => (comment.id === commentId ? { ...comment, content } : comment)),
      id,
    );
    setComments?.(prev =>
      prev.map(comment => (comment.id === commentId ? { ...comment, content } : comment)),
    );
  };

  const handleDeleteComment = (commentId: string) => {
    onCommentChange?.(
      comments.filter(comment => comment.id !== commentId),
      id,
    );
    setComments?.(prev => prev.filter(comment => comment.id !== commentId));
    onDeleteComment((comments ?? []).length - 1);
  };

  const updateReplyCount = (count: number, commentId: string) => {
    setComments?.(prev => {
      const newComments = prev.map(comment =>
        comment.id === commentId ? { ...comment, replyCount: count } : comment,
      );
      onCommentChange?.(newComments, id);
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
              />
            ))}
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
