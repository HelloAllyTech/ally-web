import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AutoExpandableTextarea, CustomImage, InfiniteScroll } from "@ally-ui-mono/ui-shared/index";
import { useCreateCommentMutation, useGetReviewByIdQuery } from "@api";
import { CommentCard } from "@components";
import { Button } from "@components/button";
import { COMMENT_MAX_LENGTH } from "@constants";
import { RootState } from "@store";
import { CommentItem } from "@types";

import CommentSkeleton from "./CommentsSkeleton";

interface GeneralCommentsToShowProps {
  show: boolean;
  generalComments: CommentItem[] | null;
  handleLoadMore: () => void;
  hasMoreComments: boolean;
  isLoading: boolean;
  setComments: Dispatch<SetStateAction<CommentItem[]>>;
  deletedReplyId?: string;
  setDeletedReplyId?: (id: string) => void;
  onReplyChange?: (reply: CommentItem) => void;
  changedReply?: CommentItem;
  isFeedOwner?: boolean;
  isScribeReview?: boolean;
}

const GeneralCommentsToShow = ({
  show,
  generalComments,
  handleLoadMore,
  hasMoreComments,
  isLoading,
  setComments,
  deletedReplyId,
  setDeletedReplyId,
  onReplyChange,
  changedReply,
  isScribeReview,
  isFeedOwner,
}: GeneralCommentsToShowProps) => {
  const [comment, setComment] = useState("");
  const [commentThreadId, setCommentThreadId] = useState<string | null>(null);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const { reviewId } = useParams<{ reviewId: string }>();
  const user = useSelector((state: RootState) => state.user.user);
  const { data: review } = useGetReviewByIdQuery({ id: reviewId, isScribe: isScribeReview });

  const [
    createComment,
    {
      isSuccess: isCreateCommentSuccess,
      isLoading: isCreateCommentLoading,
      isError: isCreateCommentError,
      data: createCommentData,
    },
  ] = useCreateCommentMutation();

  const handleCancel = () => {
    setShowCommentBox(false);
    setComment("");
  };

  useEffect(() => {
    if (createCommentData?.thread?.id) {
      setCommentThreadId(createCommentData?.thread?.id);
    } else if (review?.generalCommentsThreadId) {
      setCommentThreadId(review?.generalCommentsThreadId);
    }
  }, [review, createCommentData, generalComments]);

  useEffect(() => {
    if (isCreateCommentSuccess) {
      toast.success("Comment created successfully");
      setComments(prev => [
        {
          id: createCommentData?.comment?.id,
          content: comment,
          createdBy: {
            id: user?.id,
            name: user?.name ?? "",
            profileImage: user?.profileImageUrl ?? null,
          },
          createdAt: createCommentData?.comment?.createdAt,
          reactions: {},
          replyCount: 0,
          myReaction: null,
          hidden: false,
        },
        ...(prev || []),
      ]);
      setComment("");
    }
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
        isScribe: isScribeReview,
      });
      setShowCommentBox(false);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create comment");
    }
  };

  const handleDeleteComment = (id: string) => {
    setComments(prev => {
      const newComments = prev.filter(comment => comment.id !== id);
      if (newComments.length === 0) {
        setCommentThreadId(null);
      }
      return newComments;
    });
  };

  const handleUpdateComment = (content: string, id: string) => {
    setComments(prev =>
      prev.map(comment => (comment.id === id ? { ...comment, content } : comment)),
    );
  };

  const handleCommentChange = (comment: CommentItem) => {
    setComments(prev => prev.map(c => (c.id === comment.id ? comment : c)));
  };

  const updateReplyCount = (replyCount: number, commentId: string) => {
    setComments(prev =>
      prev.map(comment => (comment.id === commentId ? { ...comment, replyCount } : comment)),
    );
  };

  const handleDeleteReply = (commentId: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId ? { ...comment, replyCount: comment.replyCount - 1 } : comment,
      ),
    );
  };

  const handleCommentHide = (hidden: boolean, commentId: string) => {
    setComments(prev =>
      prev.map(comment => (comment.id === commentId ? { ...comment, hidden } : comment)),
    );
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
              <div className="text-md font-medium px-2 mt-2 text-typography-600 font-normal">
                Add a comment
              </div>
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
                maxLength={COMMENT_MAX_LENGTH}
                className="w-full border rounded-sm text-sm font-medium !px-2 !py-2 mt-2 min-h-20"
              />
              <div className="flex gap-2 flex-row my-2 justify-end">
                <Button variant="secondary" className="py-0" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="primary" className="py-0" onClick={handleComment}>
                  Comment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        className="w-full flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar"
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
              {generalComments.map(comment => (
                <CommentCard
                  onUpdateComment={handleUpdateComment}
                  onDelete={handleDeleteComment}
                  key={comment.id}
                  comment={comment}
                  showReply
                  showLike
                  enableLikeUpdate
                  onCommentChange={handleCommentChange}
                  updateReplyCount={count => updateReplyCount(count, comment.id)}
                  onDeleteReply={() => handleDeleteReply(comment.id)}
                  deletedReplyId={deletedReplyId}
                  setDeletedReplyId={setDeletedReplyId}
                  onReplyChange={onReplyChange}
                  changedReply={changedReply}
                  isFeedOwner={isFeedOwner}
                  onToggleHide={handleCommentHide}
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
