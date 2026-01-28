import { useEffect, useMemo, useRef, useState } from "react";

import { Emoji, EmojiStyle } from "emoji-picker-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { AutoExpandableTextarea, CustomImage } from "@ally-ui-mono/ui-shared";
import {
  useAddCommentReactionMutation,
  useToggleCommentVisibilityMutation,
  useDeleteCommentMutation,
  useLazyGetCommentRepliesQuery,
  useEditCommentMutation,
} from "@api";
import { ArrowUp, MoreVertIcon, Smiley } from "@assets";
import { Button, CustomMenu, ReactionSelector, MenuItem } from "@components";
import ReplySkeleton from "@src/components/comment-card/ReplySkeleton";
import { RootState } from "@store";
import { ReactionsType, CommentItem } from "@types";
import { formatRelativeTime } from "@utils";

interface CommentCardProps {
  comment: CommentItem;
  isFeedOwner?: boolean;
  showLike?: boolean;
  enableLikeUpdate?: boolean;
  showReply?: boolean;
  onReply?: (reply: string) => void;
  onDelete?: (id: string) => void;
}
const CommentCard = ({
  comment,
  isFeedOwner = false,
  showLike = false,
  enableLikeUpdate = true,
  showReply = false,
  onReply,
  onDelete,
}: CommentCardProps) => {
  const user = useSelector((state: RootState) => state.user.user);

  const isMyComment = user?.id === comment.createdBy.id;

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [showCommentEditView, setShowCommentEditView] = useState(false);
  const [commentContent, setCommentContent] = useState(comment.content);

  const [addCommentReactions] = useAddCommentReactionMutation();
  const [toggleCommentVisibility] = useToggleCommentVisibilityMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [editComment] = useEditCommentMutation();
  const [getReplies, { isLoading: areRepliesLoading }] = useLazyGetCommentRepliesQuery();
  const likeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (comment?.myReaction) setSelectedEmoji(comment.myReaction);
  }, [comment?.myReaction]);

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReplyInput(prev => !prev);
  };

  const onReplyClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showReplies && comment.replyCount > 0 && replies.length === 0) {
      try {
        const data = await getReplies(comment.id).unwrap();
        setReplies(data?.data || []);
      } catch {
        toast.error("Failed to load replies.");
      }
    }
    setShowReplies(!showReplies);
  };
  const handleReplySubmit = () => {
    if (replyText.trim()) {
      onReply?.(replyText);
      setReplyText("");
      setShowReplyInput(false);
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
      toast.success(hidden ? "Comment hidden successfully" : "Comment unhidden successfully");
      handleMenuClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update comment visibility");
    }
  };

  const handleDeleteComment = async () => {
    try {
      await deleteComment({ commentId: comment.id }).unwrap();
      onDelete?.(comment.id);
      toast.success("Comment deleted successfully");
      handleMenuClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete comment");
    }
  };

  const handleEditComment = async () => {
    try {
      await editComment({ commentId: comment.id, content: comment.content }).unwrap();
      toast.success("Comment updated successfully");
      handleMenuClose();
      setShowCommentEditView(false);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update comment");
    }
  };

  const isReactionOnCommentFromThisUser = () => {
    return (
      Object.keys(comment?.reactions).length === 1 &&
      Object.keys(comment?.reactions)[0] === comment.myReaction
    );
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
              fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
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
  };

  const renderCommentEditView = () => {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[14px] text-typography-800 font-primary text-sm border rounded-sm p-2 py-3">
          <AutoExpandableTextarea
            id={`comment-edit-textarea-${comment.id}`}
            value={commentContent}
            autoFocus={true}
            onChange={(content: string) => setCommentContent(content)}
            placeholder="Edit comment"
          />
        </div>
        <div className="flex gap-2 flex-row my-2 justify-end">
          <Button variant="secondary" className="py-0 h-8" onClick={handleCancelReply}>
            Cancel
          </Button>
          <Button variant="primary" className="py-0 h-8" onClick={handleEditComment}>
            Done
          </Button>
        </div>
      </div>
    );
  };

  const renderCommentContent = () => {
    return (
      <>
        <div className="text-[14px] text-typography-800 font-primary text-sm">
          {comment.content}
        </div>
        <div className="flex gap-2 items-center">
          {showLike && (
            <div className="relative">
              <div
                ref={likeRef}
                className="cursor-pointer"
                onClick={() => enableLikeUpdate && setShowEmojiPicker(prev => !prev)}
              >
                {selectedEmoji ? (
                  <div className="pb-0.5  w-[26px] bg-white h-[26px] flex items-center justify-center rounded-full border-[0.5px]">
                    <Emoji unified={selectedEmoji} size={14} emojiStyle={EmojiStyle.APPLE} />
                  </div>
                ) : (
                  <Smiley className="w-5 h-5 text-neutral-600 hover:text-[#0957D0]" />
                )}
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
          {comment?.reactions &&
            !isReactionOnCommentFromThisUser() &&
            Object.keys(comment?.reactions).length > 0 && (
              <>
                <div className="flex pr-2 items-center">
                  {Object.keys(comment.reactions)
                    .slice(0, 3)
                    .map((reaction, index) => (
                      <div
                        key={reaction}
                        style={{ zIndex: 10 - index }}
                        className="w-4 overflow-visible relative"
                      >
                        {reaction !== "" && (
                          <div className="w-[26px] bg-white h-[26px] flex items-center justify-center rounded-full border-[0.5px]">
                            <Emoji
                              unified={reaction ?? "1f44d"}
                              size={12}
                              emojiStyle={EmojiStyle.APPLE}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
                <div className="text-typography-800 text-[14px]">
                  {Object.keys(comment.reactions).length}
                </div>
              </>
            )}
          {showReply && (
            <>
              <div className="w-1 h-1 bg-[#D9D9D9] rounded-full" />
              <div
                className="text-typography-800 text-xs cursor-pointer font-medium"
                onClick={handleReplyClick}
              >
                Reply
              </div>
            </>
          )}
          {comment.replyCount > 0 && (
            <div className={`text-typography-800 text-xs cursor-pointer`} onClick={onReplyClick}>
              {comment.replyCount} repl{comment.replyCount > 1 ? "ies" : "y"}
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
        onClick: () => handleToggleVisibility(!comment?.hidden),
      });
    }

    const isUpdateExpired = new Date(comment.createdAt).getTime() < Date.now() - 10 * 60 * 1000; // 10 minutes

    if (isMyComment && !isUpdateExpired) {
      items.push({
        label: "Delete",
        onClick: () => handleDeleteComment(),
      });
    }

    if (isMyComment && !isUpdateExpired) {
      items.push({
        label: "Edit",
        onClick: () => setShowCommentEditView(true),
      });
    }

    return items;
  }, [isFeedOwner, isMyComment, comment.hidden]);

  const hideReplies = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReplies([]);
    setShowReplies(false);
  };

  return (
    <div className={`flex gap-2.5 ${comment?.hidden ? "opacity-50" : ""}`}>
      <div className="min-w-8 h-8 rounded-full overflow-hidden">
        <CustomImage
          src={comment.createdBy.profileImage}
          alt={comment.createdBy.name}
          fallbackText={comment.createdBy.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
          data-testid="custom-image"
          className="w-full h-full rounded-full"
        />
      </div>
      <div className="flex flex-col gap-1 w-full">
        <div className="flex flex-row justify-between items-center gap-2 w-full">
          <div className="flex flex-row gap-2 items-center w-full">
            <div className="text-[14px] font-medium">{comment.createdBy.name}</div>
            <div className="text-[12px] text-gray-500">{formatRelativeTime(comment.createdAt)}</div>
          </div>
          {menuItems.length > 0 && (
            <div className="flex flex-row justify-between items-center">
              <button
                onClick={handleMenuOpen}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
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
              {areRepliesLoading && showReplies && <ReplySkeleton />}
              {showReplies &&
                replies.map(reply => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    isFeedOwner={isFeedOwner}
                    showLike
                    enableLikeUpdate={enableLikeUpdate}
                    showReply={false}
                    onDelete={handleDeleteReply}
                  />
                ))}
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
  );
};

export default CommentCard;
