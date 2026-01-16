import { FC } from "react";

import EmojiStack from "./EmojiStack";
import { Comment } from "./types";
import { formatRelativeTime } from "./utils";

interface CommentItemProps {
  comment: Comment;
}

const CommentItem: FC<CommentItemProps> = ({ comment }) => {
  const { user, date, text, reactions, replies } = comment;

  const userInitial = user.name.charAt(0).toUpperCase();

  const entries = Object.entries(reactions);
  const unicodeCodes = entries.map(([code]) => code);
  const displayUnicodeCodes = unicodeCodes.length > 3 ? unicodeCodes.slice(0, 3) : unicodeCodes;
  const totalReactionCount = entries.reduce((sum, [, count]) => sum + count, 0);

  const relativeTime = formatRelativeTime(date);

  const userAvatar = () => {
    return (
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-[0.4px] border-border flex items-center justify-center relative z-10">
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="font-primary text-[8px] sm:text-[9.6px] leading-[1.67] text-[#757575]">
            {userInitial}
          </span>
        )}
      </div>
    );
  };

  const userInfo = () => {
    return (
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span className="font-primary font-medium text-xs sm:text-sm leading-[1.29] text-black/87">
            {user.name}
          </span>
          <span className="font-primary text-[10px] sm:text-xs leading-[1.25] text-black/60">
            {relativeTime}
          </span>
        </div>
        <p className="font-primary text-xs sm:text-[13px] leading-[1.23] text-black/87">{text}</p>
      </div>
    );
  };

  return (
    <div className="flex gap-2 sm:gap-2.5 w-full relative">
      {userAvatar()}
      <div className="flex flex-col gap-2 sm:gap-2.5 flex-1 min-w-0">
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {userInfo()}

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {totalReactionCount > 0 && (
              <>
                <div className="font-primary text-xs sm:text-sm text-primary-500">Like</div>
                <EmojiStack
                  unicodeCodes={displayUnicodeCodes}
                  emojiSize={11}
                  emojiContainerSize={16}
                />
                <div className="font-primary text-xs sm:text-sm text-typography-800">
                  {totalReactionCount}
                </div>
              </>
            )}

            {(replies?.length ?? 0) > 0 && (
              <>
                <div className="w-[3px] h-[3px] bg-[#D2D2D2] rounded-full"></div>
                <div className="font-primary text-xs sm:text-sm text-typography-800">
                  {replies!.length} {replies!.length !== 1 ? "replies" : "reply"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
