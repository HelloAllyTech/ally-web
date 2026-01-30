import { useState } from "react";

import { Arrow } from "@assets";
import { CommentCard } from "@components";
import { Thread } from "@types";

interface ThreadCardProps {
  thread: Thread;
  isFeedOwner?: boolean;
}
const ThreadCard = ({ thread, isFeedOwner }: ThreadCardProps) => {
  const [showComments, setShowComments] = useState(false);

  const updateShowComments = event => {
    event.stopPropagation();
    setShowComments(!showComments);
  };
  return (
    <div
      className="w-full min-w-[350px] font-primary border-[0.5px] rounded-lg px-4 py-2 flex flex-col gap-2"
      key={thread.id}
    >
      <div className="flex items-center min-h-9 border-b-[0.5px] pb-2">
        <div className="text-[14px] font-primary line-clamp-2 text-typography-900">
          Selected text: "{thread.selection.text}"
        </div>
      </div>

      <CommentCard
        isFeedOwner={isFeedOwner}
        showLike
        enableLikeUpdate={false}
        comment={thread.comments[0]}
      />
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-out ${showComments ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden flex flex-col gap-2">
          {thread.comments.slice(1, 4).map((comment, index) => (
            <div
              key={comment.id}
              className="transition-all duration-500 ease-out"
              style={{
                transform: showComments ? "translateY(0)" : "translateY(-20px)",
                opacity: showComments ? 1 : 0,
                transitionDelay: showComments
                  ? `${index * 50}ms`
                  : `${(thread.comments.length - 1 - index) * 30}ms`,
              }}
            >
              <CommentCard
                isFeedOwner={isFeedOwner}
                showLike
                enableLikeUpdate={false}
                comment={comment}
              />
            </div>
          ))}
          {thread.comments.length - 1 > 3 && (
            <div className="text-primary-500 cursor-pointer text-[14px] flex items-center justify-end gap-2">
              Show more
            </div>
          )}
        </div>
      </div>
      {thread.comments.length > 1 && (
        <div
          onClick={event => updateShowComments(event)}
          className="border-t-[0.5px] transition-all duration-300 cursor-pointer py-2 text-typography-800 text-[14px] flex items-center justify-center gap-2"
        >
          {showComments
            ? "Collapse"
            : `${Math.min(thread.comments.length - 1, 3)}${thread.comments.length - 1 > 3 ? "+" : ""} more comments`}{" "}
          <Arrow
            className={`w-3 h-3 transition-transform duration-300 ${showComments ? "rotate-180" : ""}`}
          />
        </div>
      )}
    </div>
  );
};

export default ThreadCard;
