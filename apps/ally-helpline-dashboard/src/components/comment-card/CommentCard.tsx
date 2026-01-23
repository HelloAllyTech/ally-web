import { useRef, useState } from "react";

import { Emoji, EmojiStyle } from "emoji-picker-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { AutoExpandableTextarea, CustomImage } from "@ally-ui-mono/ui-shared";
import { useAddCommentReactionMutation } from "@api";
import { Smiley } from "@assets";
import { Button, ReactionSelector } from "@components";
import { RootState } from "@store";
import { ReactionsType, CommentItem } from "@types";
import { formatRelativeTime } from "@utils";

interface CommentCardProps {
  comment: CommentItem;
  showLike?: boolean;
  showReply?: boolean;
  onReplyClick?: () => void;
  onReply?: (reply: string) => void;
}
const CommentCard = ({
  comment,
  showLike = false,
  showReply = false,
  onReplyClick,
  onReply,
}: CommentCardProps) => {
  const user = useSelector((state: RootState) => state.user.user);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");

  const [addCommentReactions] = useAddCommentReactionMutation();

  const likeRef = useRef<HTMLDivElement>(null);

  const handleReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReplyInput(true);
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
    setReplyText("");
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
              value={replyText}
              onChange={setReplyText}
              placeholder="Add comment"
              className="w-full border rounded-sm text-sm !px-2 !py-2 mt-2 min-h-20"
            />
            <div className="flex gap-2 flex-row my-2 justify-end">
              <Button variant="secondary" className="py-0 h-8" onClick={handleCancelReply}>
                Cancel
              </Button>
              <Button variant="primary" className="py-0 h-8" onClick={handleReplySubmit}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex gap-2.5">
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
        <div className="flex gap-2 items-center">
          <div className="text-[14px] font-medium">{comment.createdBy.name}</div>
          <div className="text-[12px] text-gray-500">{formatRelativeTime(comment.createdAt)}</div>
        </div>
        <div className="text-[14px] text-typography-800">{comment.content}</div>
        <div className="flex gap-2 items-center">
          {showLike && (
            <div className="relative">
              <div
                ref={likeRef}
                className="cursor-pointer"
                onClick={() => setShowEmojiPicker(prev => !prev)}
              >
                {selectedEmoji ? (
                  <div className="pb-0.5">
                    <Emoji unified={selectedEmoji} size={14} emojiStyle={EmojiStyle.NATIVE} />
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
          {!showLike && comment.reactions && Object.keys(comment.reactions).length > 0 && (
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
                        <div className="w-[26px] bg-white h-[26px] pr-0.5 pb-1.5 flex items-center justify-center rounded-full border-[0.5px]">
                          <Emoji
                            unified={reaction ?? "1f44d"}
                            size={12}
                            emojiStyle={EmojiStyle.NATIVE}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              <div className="text-typography-800 text-[14px]">
                {Object.keys(comment.reactions).length}
              </div>
              {comment.replyCount > 0 && <div className="w-1 h-1 bg-[#D9D9D9] rounded-full" />}
            </>
          )}
          {showReply && (
            <>
              <div className="w-1 h-1 bg-[#D9D9D9] rounded-full" />
              <div
                className="text-typography-800 text-[12px] cursor-pointer font-medium"
                onClick={handleReplyClick}
              >
                Reply
              </div>
            </>
          )}
          {comment.replyCount > 0 && (
            <div
              className={`text-typography-800 text-[${showReply ? "12px" : "14px"}]`}
              onClick={onReplyClick}
            >
              {comment.replyCount} repl{comment.replyCount > 1 ? "ies" : "y"}
            </div>
          )}
        </div>
        {renderReplyBox()}
      </div>
    </div>
  );
};

export default CommentCard;
