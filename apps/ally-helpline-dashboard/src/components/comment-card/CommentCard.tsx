import { useEffect, useMemo, useRef, useState } from "react";

import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AutoExpandableTextarea, CustomImage, InfiniteScroll } from "@ally-ui-mono/ui-shared";
import {
  useAddCommentReactionMutation,
  useToggleCommentVisibilityMutation,
  useDeleteCommentMutation,
  useLazyGetCommentRepliesQuery,
  useEditCommentMutation,
  useCreateCommentMutation,
} from "@api";
import { ArrowUp, MoreVertIcon, Smiley, Delete, Edit, Hide, Eye } from "@assets";
import {
  Button,
  CustomMenu,
  NativeEmoji,
  ReactionSelector,
  MenuItem,
  ConfirmationPopover,
} from "@components";
import { COMMENT_DELETE_CONFIRMATION } from "@src/components/comment-card/constants";
import { RootState } from "@store";
import { ReactionsType, CommentItem } from "@types";
import { formatRelativeTime } from "@utils";

interface CommentCardProps {
  comment: CommentItem;
  isFeedOwner?: boolean;
  showLike?: boolean;
  enableLikeUpdate?: boolean;
  showReply?: boolean;
  commentThreadScrollRef?: React.RefObject<HTMLDivElement>;
  onDelete?: (id: string) => void;
  commentId?: string;
  onUpdateComment?: (content: string, id: string) => void;
  selectedThreadId?: string;
  messageId?: string;
  selection?: {
    startIndex: number;
    endIndex: number;
  };
  onToggleHide?: (hidden: boolean, id: string) => void;
  updateReplyCount?: (replyCount: number) => void;
  isReply?: boolean;
}
const CommentCard = ({
  comment,
  isFeedOwner = false,
  showLike = false,
  enableLikeUpdate = true,
  showReply = false,
  onDelete,
  commentThreadScrollRef,
  onUpdateComment,
  selectedThreadId,
  messageId,
  selection,
  onToggleHide,
  updateReplyCount,
  isReply = false,
}: CommentCardProps) => {
  const user = useSelector((state: RootState) => state.user.user);
  const [createComment, { data: createCommentData }] = useCreateCommentMutation();
  const { reviewId } = useParams<{ reviewId: string }>();
  const isMyComment =
    user?.id != null && comment?.createdBy?.id != null && user.id === comment.createdBy.id;

  const [repliesOffset, setRepliesOffset] = useState(0);
  const [hasMoreReplies, setHasMoreReplies] = useState(true);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(comment?.replyCount || 0);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [showCommentEditView, setShowCommentEditView] = useState(false);
  const [commentContent, setCommentContent] = useState(comment.content);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [addCommentReactions] = useAddCommentReactionMutation();
  const [toggleCommentVisibility] = useToggleCommentVisibilityMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [editComment] = useEditCommentMutation();
  const [getReplies, { isLoading: areRepliesLoading }] = useLazyGetCommentRepliesQuery();
  const likeRef = useRef<HTMLDivElement>(null);
  const commentCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (comment?.myReaction) setSelectedEmoji(comment.myReaction);
  }, [comment?.myReaction]);

  useEffect(() => {
    setReplyCount(comment?.replyCount || 0);
    updateReplyCount?.(comment?.replyCount || 0);
  }, [comment?.replyCount]);

  useEffect(() => {
    if (commentThreadScrollRef?.current) {
      if (menuAnchorEl) commentThreadScrollRef.current.style.overflowY = "hidden";
      else commentThreadScrollRef.current.style.overflowY = "auto";
    }
  }, [menuAnchorEl, commentThreadScrollRef]);

  useEffect(() => {
    if (createCommentData) {
      if (replies.length > 0) {
        const newReply = {
          id: createCommentData.reply.id,
          content: replyText,
          createdBy: {
            id: user?.id,
            name: user?.name,
            profileImage: user?.profileImageUrl,
          },
          createdAt: new Date().toISOString(),
          reactions: {},
          replyCount: 0,
          myReaction: null,
        };
        setReplies(prev => [...(prev || []), newReply]);
      }
      setReplyCount(prev => {
        const newReplyCount = prev + 1;
        updateReplyCount?.(newReplyCount);
        return newReplyCount;
      });
      setReplyText("");
      setShowReplyInput(false);
    }
  }, [createCommentData]);

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReplyInput(prev => !prev);
  };

  const onReplyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showReplies && replyCount > 0 && replies.length === 0) {
      try {
        const data = await getReplies({
          commentId: comment.id,
          limit: 10,
          offset: repliesOffset,
        }).unwrap();
        setRepliesOffset(prev => prev + 10);
        setHasMoreReplies(repliesOffset + 10 < data?.count);
        setReplies(data?.data || []);
      } catch {
        toast.error("Failed to load replies.");
      }
    }
    setShowReplies(!showReplies);
  };

  const loadMoreReplies = async () => {
    if (!hasMoreReplies) return;
    const data = await getReplies({
      commentId: comment.id,
      limit: 10,
      offset: repliesOffset,
    }).unwrap();
    setRepliesOffset(prev => prev + 10);
    setHasMoreReplies(repliesOffset + 10 < data?.count);
    setReplies(prev => {
      const existingReplies = new Set(prev.map(reply => reply.id));
      const newReplies = [
        ...(prev || []),
        ...(data?.data || []).filter(reply => !existingReplies.has(reply.id)),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return newReplies;
    });
  };
  const handleReplySubmit = () => {
    if (replyText.trim()) {
      handleReplyComment(replyText, comment.id);
    }
  };

  const sendReaction = (reaction: string, action: ReactionsType) =>
    addCommentReactions({
      commentId: comment.id,
      reaction: { reaction, action },
    }).unwrap();

  const handleEmojiClick = async (emoji: string) => {
    try {
      let action: ReactionsType;
      let nextEmoji = selectedEmoji;

      if (selectedEmoji === emoji) {
        action = ReactionsType.REMOVE;
        nextEmoji = "";
      } else if (selectedEmoji) {
        action = ReactionsType.UPDATE;
        nextEmoji = emoji;
      } else {
        action = ReactionsType.ADD;
        nextEmoji = emoji;
      }

      await sendReaction(emoji, action);
      setSelectedEmoji(nextEmoji);
      setShowEmojiPicker(false);
    } catch (error) {
      toast.error(error?.data?.message || "Reaction update failed");
    }
  };

  const handleCancelReply = () => {
    setReplyText("");
    setShowReplyInput(false);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleToggleVisibility = async (hidden: boolean) => {
    try {
      await toggleCommentVisibility({
        commentId: comment.id,
        hidden,
      }).unwrap();
      onToggleHide?.(hidden, comment.id);
      toast.success(hidden ? "Comment hidden successfully" : "Comment unhidden successfully");
      handleMenuClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update comment visibility");
    }
  };

  const handleCancelCommentEdit = () => {
    setShowCommentEditView(false);
    setCommentContent(comment.content);
  };

  const handleShowDeleteConfirmation = () => {
    setDeleteAnchorEl(menuAnchorEl);
    setShowDeleteConfirmation(true);
    handleMenuClose();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setDeleteAnchorEl(null);
  };

  const handleDeleteComment = async () => {
    try {
      setIsDeleting(true);
      await deleteComment({ commentId: comment.id }).unwrap();
      onDelete?.(comment.id);
      toast.success("Comment deleted successfully");
      setShowDeleteConfirmation(false);
      setDeleteAnchorEl(null);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditComment = async () => {
    try {
      await editComment({ commentId: comment.id, content: commentContent?.trim() }).unwrap();
      toast.success("Comment updated successfully");
      onUpdateComment?.(commentContent, comment.id);
      handleMenuClose();
      setShowCommentEditView(false);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update comment");
    }
  };
  const handleUpdateReply = (content: string, id: string) => {
    const currentReplies = replies.map(reply => (reply.id === id ? { ...reply, content } : reply));
    setReplies(currentReplies);
  };

  const handleReplyComment = async (replyComment: string, parentCommentId: string | null) => {
    const body = {
      threadId: selectedThreadId,
      parentCommentId,
      messageId,
      content: replyComment,
      selection,
    };
    await createComment({
      reviewId: reviewId,
      body: body,
    });
  };
  const handleToggleHide = (hidden: boolean, id: string) => {
    const reply = replies.find(reply => reply.id === id);
    if (reply) {
      setReplies(prev => prev.map(reply => (reply.id === id ? { ...reply, hidden } : reply)));
    }
  };
  const renderReplyBox = () => {
    if (showReplyInput) {
      return (
        <div className="flex gap-2.5 flex-row w-full mt-1">
          <div className="w-8 h-8 rounded-full">
            <CustomImage
              src={user?.profileImageUrl}
              alt="user"
              className="w-full h-full rounded-full"
              fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-900"
              fallbackText={user?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
            />
          </div>
          <div className="flex-1 mt-2">
            <AutoExpandableTextarea
              id={`reply-textarea-${comment.id}`}
              autoFocus={true}
              value={replyText}
              onChange={setReplyText}
              placeholder="Add reply"
              className="w-full border rounded-sm text-sm !px-2 !py-2 mt-2 min-h-20"
            />
            <div className="flex gap-2 flex-row mt-1 justify-end">
              <Button variant="secondary" className="py-0 h-8" onClick={handleCancelReply}>
                Cancel
              </Button>
              <Button variant="primary" className="py-0 h-8" onClick={handleReplySubmit}>
                Reply
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const handleDeleteReply = (id: string) => {
    setReplies(prev => prev.filter(reply => reply.id !== id));
    if (replyCount === 1) {
      setReplies([]);
      setShowReplies(false);
      setRepliesOffset(0);
    }
    setReplyCount(prev => {
      const newReplyCount = prev - 1;
      updateReplyCount?.(newReplyCount);
      return newReplyCount;
    });
  };

  const renderCommentEditView = () => {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[14px] text-typography-900 font-primary text-sm border rounded-sm p-2 py-3">
          <AutoExpandableTextarea
            id={`comment-edit-textarea-${comment.id}`}
            value={commentContent}
            autoFocus={true}
            onChange={(content: string) => setCommentContent(content)}
            placeholder="Edit comment"
          />
        </div>
        <div className="flex gap-2 flex-row my-2 justify-end">
          <Button variant="secondary" className="py-0 h-8  z-50" onClick={handleCancelCommentEdit}>
            Cancel
          </Button>
          <Button variant="primary" className="py-0 h-8 z-50" onClick={handleEditComment}>
            Done
          </Button>
        </div>
      </div>
    );
  };

  const showDivider =
    comment.replyCount > 0 &&
    ((showLike && (selectedEmoji || enableLikeUpdate)) ||
      (comment?.reactions && Object.keys(comment?.reactions).length > 0));

  const renderCommentContent = () => {
    return (
      <>
        <div className="text-typography-900 font-primary text-sm">{comment.content}</div>
        <div className="flex gap-2 items-center">
          {showLike && (selectedEmoji || enableLikeUpdate) && (
            <div className="relative">
              <div
                ref={likeRef}
                className="cursor-pointer"
                onClick={() => enableLikeUpdate && setShowEmojiPicker(prev => !prev)}
              >
                {selectedEmoji ? (
                  <div className="pt-[1px] w-[26px] bg-white h-[26px] flex items-center justify-center rounded-full border-[0.5px] border-primary-600">
                    <NativeEmoji unified={selectedEmoji} size={14} />
                  </div>
                ) : enableLikeUpdate ? (
                  <Smiley className="w-5 h-5 text-neutral-600 hover:text-[#0957D0]" />
                ) : null}
              </div>

              {showEmojiPicker && (
                <ReactionSelector
                  anchorElement={likeRef.current}
                  selectedEmoji={selectedEmoji}
                  handleEmojiClick={handleEmojiClick}
                />
              )}
            </div>
          )}
          {comment?.reactions && Object.keys(comment?.reactions).length > 0 && (
            <>
              {enableLikeUpdate ||
                (selectedEmoji && <div className="border-l h-3 border-border-light" />)}
              <div className="flex pr-1 items-center">
                {Object.keys(comment.reactions)
                  .slice(0, 3)
                  .map((reaction, index) => (
                    <div
                      key={reaction}
                      style={{ zIndex: 10 - index }}
                      className="w-4 overflow-visible relative"
                    >
                      {reaction !== "" && (
                        <div className="w-[20px] bg-white h-[20px] flex items-center justify-center rounded-full border-[0.5px]">
                          <NativeEmoji unified={reaction ?? "1f44d"} size={10} />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              <div className="text-typography-800 text-xs">
                {Object.values(comment.reactions).reduce((sum, count) => sum + count, 0)}
              </div>
            </>
          )}

          {showDivider && <div className="w-1 h-1 bg-[#D9D9D9] rounded-full" />}
          {showReply && (
            <>
              <div
                className="text-typography-800 text-xs cursor-pointer font-medium flex items-center gap-2"
                onClick={handleReplyClick}
              >
                Reply
              </div>
            </>
          )}
          {replyCount > 0 && (
            <div
              className={`text-typography-800 text-xs cursor-pointer underline decoration-neutral-300 underline-offset-4 decoration-1`}
              onClick={onReplyClick}
            >
              {replyCount} repl{replyCount > 1 ? "ies" : "y"}
            </div>
          )}
        </div>
      </>
    );
  };

  const menuItems = useMemo(() => {
    const items: MenuItem[] = [];
    if (isFeedOwner) {
      items.push({
        label: comment?.hidden ? "Unhide" : "Hide",
        className: "text-typography-800",
        icon: comment?.hidden ? <Eye width={16} height={16} /> : <Hide width={16} height={16} />,
        onClick: () => handleToggleVisibility(!comment?.hidden),
      });
    }

    const isUpdateExpired = new Date(comment.createdAt).getTime() < Date.now() - 10 * 60 * 1000; // 10 minutes

    if (isMyComment && !isUpdateExpired) {
      items.push({
        label: "Edit",
        className: "text-typography-800",
        icon: <Edit width={16} height={16} />,
        onClick: () => {
          setCommentContent(comment.content ?? "");
          setShowCommentEditView(true);
        },
      });
    }

    if (isMyComment) {
      items.push({
        label: "Delete",
        className: "text-red-500",
        icon: <Delete width={16} height={16} />,
        onClick: handleShowDeleteConfirmation,
      });
    }

    return items;
  }, [isFeedOwner, isMyComment, comment.hidden, comment.content]);

  const hideReplies = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReplies([]);
    setShowReplies(false);
    setRepliesOffset(0);
    // Scroll to the parent comment after hiding replies
    setTimeout(() => {
      commentCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const userImage = useMemo(() => {
    if (isMyComment) {
      return user?.profileImageUrl;
    }
    return comment.createdBy.profileImage;
  }, [user, comment]);

  return (
    <>
      <div ref={commentCardRef} className={`flex gap-2.5 ${comment?.hidden ? "opacity-50" : ""}`}>
        <div className="min-w-8 h-8 rounded-full overflow-hidden">
          <CustomImage
            src={userImage}
            alt={comment.createdBy.name}
            fallbackText={comment.createdBy.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
            data-testid="custom-image"
            className="w-full h-full rounded-full"
          />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <div className="flex flex-row justify-between items-center gap-2 w-full">
            <div className="flex flex-row gap-1.5 items-center w-full">
              <div className="text-[14px] font-medium text-typography-900">
                {comment?.createdBy?.name || "Unknown"}
              </div>
              <div className="text-[12px] text-gray-500">
                {formatRelativeTime(comment.createdAt)}
              </div>
            </div>
            {menuItems.length > 0 && enableLikeUpdate && (
              <div className="flex flex-row justify-between items-center">
                <button
                  onClick={handleMenuOpen}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors tr"
                  aria-label="Comment options"
                >
                  <MoreVertIcon className="w-5 h-5 text-gray-600" />
                </button>
                <CustomMenu
                  anchorElement={menuAnchorEl}
                  items={menuItems}
                  onClose={handleMenuClose}
                />
              </div>
            )}
          </div>
          {showCommentEditView ? renderCommentEditView() : renderCommentContent()}
          {(showReplies || showReplyInput) && (
            <div>
              {renderReplyBox()}
              <div className="flex flex-col gap-4 mt-4">
                {showReplies && (
                  <InfiniteScroll onInfiniteScroll={loadMoreReplies} isLoading={areRepliesLoading}>
                    {replies.map(reply => (
                      <CommentCard
                        key={reply.id}
                        comment={reply}
                        isFeedOwner={isFeedOwner}
                        showLike
                        enableLikeUpdate={enableLikeUpdate}
                        showReply={false}
                        onDelete={handleDeleteReply}
                        onUpdateComment={handleUpdateReply}
                        onToggleHide={handleToggleHide}
                        isReply
                      />
                    ))}
                  </InfiniteScroll>
                )}
                {showReplies && (
                  <div
                    className="text-xs font-primary flex items-center gap-2 text-primary-600"
                    onClick={hideReplies}
                  >
                    Hide Repl{comment.replyCount > 1 ? "ies" : "y"}
                    <ArrowUp />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmationPopover
        isOpen={showDeleteConfirmation}
        onClose={handleCancelDelete}
        onConfirm={handleDeleteComment}
        anchorElement={deleteAnchorEl}
        title={
          <div className="font-medium font-secondary text-2xl text-typography-900 text-center">
            Delete <span className="italic font-bold">{isReply ? "Reply" : "Comment"}?</span>
          </div>
        }
        message={
          isReply
            ? COMMENT_DELETE_CONFIRMATION.REPLY_DELETE_MESSAGE
            : COMMENT_DELETE_CONFIRMATION.COMMENT_DELETE_MESSAGE
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

export default CommentCard;
