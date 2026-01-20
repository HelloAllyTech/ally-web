import { AccountCircle } from "@assets";
import { CommentItem } from "@pages/review-details/types";

import CommentCard from "../comment-card/CommentCard";
import Input from "../input";

interface CommentThreadProps {
  comments: CommentItem[];
}
const CommentThread = ({ comments }: CommentThreadProps) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border w-[400px]">
      <div className="text-sm font-medium border-b-[0.5px] pb-2">Comment Thread</div>
      <div className="flex flex-col gap-4 pt-4">
        <div className="flex gap-2.5">
          <AccountCircle className="min-w-8 h-8 rounded-full" />
          <Input placeholder="Add comment" className="w-full h-8 rounded-sm focus-visible:ring-0" />
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-80 -mr-4 pr-4">
          {comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} showLike showReply />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
