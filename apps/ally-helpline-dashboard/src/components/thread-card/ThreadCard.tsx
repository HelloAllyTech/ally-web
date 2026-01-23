import { useState } from "react";

import { Arrow } from "@assets";
import { CommentCard } from "@components";
import { Thread } from "@types";

interface ThreadCardProps {
  thread: Thread;
}
const ThreadCard = ({ thread }: ThreadCardProps) => {
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
      <div className="text-[14px] font-primary h-9 flex items-center font-medium border-b-[0.5px]">
        Selected text: "{thread.selection.text}"
      </div>
      <CommentCard comment={thread.comments[0]} />
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-out ${showComments ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden flex flex-col gap-2">
          {thread.comments.slice(1).map((comment, index) => (
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
              <CommentCard comment={comment} />
            </div>
          ))}
        </div>
      </div>
      {thread.comments.length > 1 && (
        <div
          onClick={event => updateShowComments(event)}
          className="border-t-[0.5px] transition-all duration-300 cursor-pointer py-2 text-typography-800 text-[14px] flex items-center justify-center gap-2"
        >
          {showComments ? "Collapse" : `${thread.comments.length - 1} more comments`}{" "}
          <Arrow
            className={`w-3 h-3 transition-transform duration-300 ${showComments ? "rotate-180" : ""}`}
          />
        </div>
      )}
    </div>
  );
};

export default ThreadCard;
