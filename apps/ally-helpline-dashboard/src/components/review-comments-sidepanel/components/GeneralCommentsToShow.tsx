import { useEffect, useState } from "react";

import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AutoExpandableTextarea, CustomImage, InfiniteScroll } from "@ally-ui-mono/ui-shared/index";
import {
  useCreateCommentMutation,
  useGetGeneralCommentsQuery,
  useGetReviewByIdQuery,
} from "@src/api";
import { Button } from "@src/components/button";
import CommentCard from "@src/components/comment-card/CommentCard";
import { RootState } from "@src/store";
import { CommentItem } from "@src/types";

interface GeneralCommentsToShowProps {
  show: boolean;
}

const CommentSkeleton = () => (
  <div className="flex gap-3 w-full animate-pulse">
    <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 bg-neutral-200 rounded" />
        <div className="h-3 w-16 bg-neutral-100 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-neutral-200 rounded" />
        <div className="h-3 w-3/4 bg-neutral-200 rounded" />
      </div>
      <div className="flex gap-4 mt-2">
        <div className="h-3 w-10 bg-neutral-100 rounded" />
        <div className="h-3 w-10 bg-neutral-100 rounded" />
      </div>
    </div>
  </div>
);

const PAGE_SIZE = 10;
const GeneralCommentsToShow = ({ show }: GeneralCommentsToShowProps) => {
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentThreadId, setCommentThreadId] = useState<string | null>(null);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const { reviewId } = useParams<{ reviewId: string }>();
  const user = useSelector((state: RootState) => state.user.user);
  const { data: review } = useGetReviewByIdQuery(reviewId);

  const [
    createComment,
    {
      isSuccess: isCreateCommentSuccess,
      isLoading: isCreateCommentLoading,
      isError: isCreateCommentError,
      data: createCommentData,
    },
  ] = useCreateCommentMutation();

  const { data: generalComments, isLoading } = useGetGeneralCommentsQuery({
    reviewId,
    limit: PAGE_SIZE,
    offset: commentsOffset,
  });
  const handleCancel = () => {
    setShowCommentBox(false);
    setComment("");
  };

  useEffect(() => {
    if (createCommentData?.thread?.id) {
      setCommentThreadId(createCommentData?.thread?.id);
    } else if (comments.length === 0) {
      setCommentThreadId(null);
    } else if (review?.generalCommentsThreadId) {
      setCommentThreadId(review?.generalCommentsThreadId);
    }
  }, [review, createCommentData, comments]);

  useEffect(() => {
    if (generalComments) {
      if (commentsOffset === 0) {
        setComments(generalComments.data);
      } else {
        setComments(prev => [...prev, ...generalComments.data]);
      }
    }
  }, [generalComments]);

  useEffect(() => {
    if (isCreateCommentSuccess) {
      toast.success("Comment created successfully");
      setComments(prev => [
        ...(prev || []),
        {
          id: createCommentData?.comment?.id,
          content: comment,
          createdBy: { id: user?.id, name: user?.name, profileImage: user?.profileImageUrl },
          createdAt: createCommentData?.data?.createdAt,
          reactions: {},
          replyCount: 0,
          myReaction: null,
          hidden: false,
        },
      ]);
    }
    setComment("");
  }, [isCreateCommentSuccess]);

  useEffect(() => {
    if (isCreateCommentError) {
      toast.error("Failed to create comment");
    }
  }, [isCreateCommentError]);

  const handleComment = async () => {
    try {
      await createComment({
        reviewId: reviewId,
        body: {
          content: comment,
          threadId: commentThreadId,
          parentCommentId: null,
          messageId: null,
          selection: null,
        },
      });
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create comment");
    }
  };

  const handleLoadMore = () => {
    setCommentsOffset(prev => prev + PAGE_SIZE);
    if (generalComments?.data.length === 0) {
      setHasMoreComments(false);
    }
  };

  const handleDeleteComment = (id: string) => {
    setComments(prev => prev.filter(comment => comment.id !== id));
  };

  const handleUpdateComment = (content: string, id: string) => {
    setComments(prev =>
      prev.map(comment => (comment.id === id ? { ...comment, content } : comment)),
    );
  };

  const handleCommentChange = (comment: CommentItem) => {
    setComments(prev => prev.map(c => (c.id === comment.id ? comment : c)));
  };

  if (!show) return null;

  return (
    <div className="w-full h-full overflow-hidden flex flex-col gap-4 pt-4 items-center">
      <div className="flex gap-2 flex-row w-full">
        <div className="w-8 h-8 rounded-full flex-shrink-0">
          <CustomImage
            src={user?.profileImageUrl}
            alt="user"
            className="w-full h-full rounded-full"
            fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
            fallbackText={user?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
          />
        </div>
        <div className="flex-1">
          {!showCommentBox ? (
            <div
              className="w-full min-h-[36px] cursor-pointer rounded-[8px]"
              onClick={() => setShowCommentBox(true)}
            >
              <div className="text-sm font-medium px-2 mt-2 text-typography-600">Add a comment</div>
            </div>
          ) : (
            <div
              className="mt-2 animate-expand-in"
              style={{
                opacity: isCreateCommentLoading ? 0.5 : 1,
                pointerEvents: isCreateCommentLoading ? "none" : "auto",
              }}
            >
              <AutoExpandableTextarea
                value={comment}
                onChange={setComment}
                autoFocus={true}
                placeholder="Add a comment"
                className="w-full border rounded-sm text-sm font-medium !px-2 !py-2 mt-2 min-h-20"
              />
              <div className="flex gap-2 flex-row my-2 justify-end">
                <Button variant="secondary" className="py-0 h-8" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="primary" className="py-0 h-8" onClick={handleComment}>
                  Comment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        className="w-full flex flex-col gap-4 overflow-y-auto -mr-2 pr-2 custom-scrollbar"
        style={{ maxHeight: showCommentBox ? "calc(100% - 240px)" : "calc(100% - 150px)" }}
      >
        {isLoading ? (
          <>
            {Array.from({ length: 10 }).map((_, index) => (
              <CommentSkeleton key={index} />
            ))}
          </>
        ) : (
          <>
            <InfiniteScroll
              onInfiniteScroll={handleLoadMore}
              isLoading={isLoading}
              hasMore={hasMoreComments}
            >
              {comments.map(comment => (
                <CommentCard
                  onUpdateComment={handleUpdateComment}
                  onDelete={handleDeleteComment}
                  key={comment.id}
                  comment={comment}
                  showReply
                  showLike
                  enableLikeUpdate
                  onCommentChange={handleCommentChange}
                />
              ))}
            </InfiniteScroll>
          </>
        )}
      </div>
    </div>
  );
};

export default GeneralCommentsToShow;
