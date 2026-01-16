import { Emoji, EmojiStyle } from "emoji-picker-react";

import { CommentItem } from "@src/pages/review-details/types";
import { formatRelativeTime } from "@src/utils";

interface CommentCardProps {
  comment: CommentItem;
  showLike?: boolean;
  showReply?: boolean;
  onReplyClick?: () => void;
}
const CommentCard = ({
  comment,
  showLike = false,
  showReply = false,
  onReplyClick,
}: CommentCardProps) => {
  return (
    <div className="flex gap-2.5">
      <div className="min-w-8 h-8 rounded-full bg-neutral-500" />
      <div className="flex flex-col gap-1">
        <div className="flex gap-2 items-center">
          <div className="text-[14px] font-medium">{comment.user.name}</div>
          <div className="text-[12px] text-gray-500">{formatRelativeTime(comment.createdAt)}</div>
        </div>
        <div className="line-clamp-2 text-[14px] text-typography-800">{comment.comment}</div>
        <div className="flex gap-2 items-center">
          {showLike && (
            <div className="cursor-pointer text-typography-800 text-[12px] font-medium">Like</div>
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
                      <div className="w-[26px] bg-white h-[26px] pr-0.5 pb-1.5 flex items-center justify-center rounded-full border-[0.5px]">
                        <Emoji unified={reaction} size={12} emojiStyle={EmojiStyle.NATIVE} />
                      </div>
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
              <div className="text-typography-800 text-[12px] cursor-pointer font-medium">
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
      </div>
    </div>
  );
};

export default CommentCard;
