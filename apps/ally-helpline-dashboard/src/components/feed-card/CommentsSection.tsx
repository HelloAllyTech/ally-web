import { FC } from "react";

import { ArrowUp } from "@src/assets";

import CommentItem from "./CommentItem";
import { Comment } from "./types";

interface CommentsSectionProps {
  comments: Comment[];
  collapseComments?: () => void;
}

const CommentsSection: FC<CommentsSectionProps> = ({ comments, collapseComments }) => {
  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full h-[0.5px] bg-[#D2D2D2]" />

      <div className="flex flex-col gap-4">
        {comments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {collapseComments && (
        <button
          onClick={collapseComments}
          aria-label="Collapse comments"
          aria-expanded="true"
          className="font-primary font-normal text-base text-typography-800 text-center hover:underline flex flex-row items-center justify-center gap-2.5"
        >
          <span>Collapse</span>
          <ArrowUp aria-hidden="true" className="shrink-0" />
        </button>
      )}
    </div>
  );
};

export default CommentsSection;
