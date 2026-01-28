import { FC } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared/index";

import EmojiStack from "./EmojiStack";
import { Comment } from "./types";
import { formatRelativeTime } from "./utils";

interface CommentItemProps {
  comment: Comment;
}

const CommentItem: FC<CommentItemProps> = ({ comment }) => {
  const { createdBy, createdAt, content, replyCount } = comment;

  const entries = comment.reactions ? Object.entries(comment.reactions) : [];
  const unicodeCodes = entries?.map(([code]) => code) ?? [];
  const displayUnicodeCodes = unicodeCodes.length > 3 ? unicodeCodes.slice(0, 3) : unicodeCodes;
  const totalReactionCount = entries?.reduce((sum, [, count]) => sum + count, 0) ?? 0;

  const relativeTime = formatRelativeTime(createdAt);

  const fallbackText = () => {
    if (createdBy?.name?.length > 1) {
      return createdBy?.name?.slice(0, 1)?.toUpperCase();
    }
    if (createdBy?.name?.length === 1) {
      return createdBy?.name?.toUpperCase();
    }
    return "NA";
  };

  const userAvatar = () => {
    return (
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white ${!createdBy?.profileImage ? "border border-border-light" : ""} border-[0.4px] border-border flex items-center justify-center relative z-10`}
      >
        <CustomImage
          src={createdBy.profileImage}
          alt={createdBy?.name}
          fallbackText={fallbackText()}
          className="w-full h-full object-cover rounded-full"
          fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
        />
      </div>
    );
  };

  const userInfo = () => {
    return (
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span className="font-primary font-medium text-xs sm:text-sm leading-[1.29] text-black/87">
            {createdBy?.name}
          </span>
          <span className="font-primary text-[10px] sm:text-xs leading-[1.25] text-black/60">
            {relativeTime}
          </span>
        </div>
        <p className="font-primary text-xs sm:text-[13px] leading-[1.23] text-black/87">
          {content}
        </p>
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

            {(replyCount ?? 0) > 0 && (
              <>
                <div className="w-[3px] h-[3px] bg-[#D2D2D2] rounded-full"></div>
                <div className="font-primary text-xs sm:text-sm text-typography-800">
                  {replyCount} {replyCount !== 1 ? "replies" : "reply"}
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
