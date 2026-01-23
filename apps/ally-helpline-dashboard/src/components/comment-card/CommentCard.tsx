import { useRef, useState } from "react";

import { Emoji, EmojiStyle } from "emoji-picker-react";
import { toast } from "sonner";

import { CustomImage } from "@ally-ui-mono/ui-shared/index";
import { useAddCommentReactionMutation } from "@api";
import { AccountCircle, Smiley } from "@assets";
import { ReactionSelector } from "@components";
import { ReactionsType, CommentItem } from "@types";
import { formatRelativeTime } from "@utils";

import Input from "../input";

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

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleReplySubmit();
    } else if (e.key === "Escape") {
      setShowReplyInput(false);
      setReplyText("");
    }
  };

  const sendReaction = (reaction: string, action: ReactionsType) =>
    addCommentReactions({
      commentId: comment.id,
      reaction: { reaction, action },
    }).unwrap();

  const handleEmojiClick = async (emoji: string) => {
    try {
      if (selectedEmoji === emoji) {
        await sendReaction(emoji, ReactionsType.REMOVE);
        setSelectedEmoji("");
      } else {
        if (selectedEmoji) {
          await sendReaction(selectedEmoji, ReactionsType.REMOVE);
        }
        await sendReaction(emoji, ReactionsType.ADD);
        setSelectedEmoji(emoji);
      }

      setShowEmojiPicker(false);
    } catch (error) {
      toast.error(error?.data?.message || "Reaction update failed");
    }
  };

  return (
    <div className="flex gap-2.5">
      <div className="min-w-6 h-6 rounded-full overflow-hidden">
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
        {showReplyInput && (
          <div className="flex gap-2 items-center mt-2 w-full">
            <AccountCircle className="min-w-6 h-6 rounded-full" />
            <Input
              placeholder="Write a reply..."
              className="flex-1 h-8 w-full rounded-sm text-sm focus-visible:ring-0"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentCard;
