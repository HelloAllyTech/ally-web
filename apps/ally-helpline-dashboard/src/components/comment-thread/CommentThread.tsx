import { useState } from "react";

import { useSelector } from "react-redux";

import { AutoExpandableTextarea, CustomImage } from "@ally-ui-mono/ui-shared";
import { Button, CommentCard } from "@components";
import { RootState } from "@store";
import { CommentItem } from "@types";

interface CommentThreadProps {
  comments: CommentItem[];
  onCommentAddition: (comment: string) => void;
  onReplyComment: (comment: string, parentCommentId: string | null) => void;
}
const CommentThread = ({ comments, onCommentAddition, onReplyComment }: CommentThreadProps) => {
  const user = useSelector((state: RootState) => state.user.user);
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);

  const handleCommentAddition = () => {
    onCommentAddition(comment);
    setComment("");
  };

  const handleCancel = () => {
    setComment("");
    setShowCommentBox(false);
  };

  const renderCommentBox = () => {
    if (showCommentBox) {
      return (
        <div className="flex gap-2.5 flex-row w-full">
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
              value={comment}
              onChange={setComment}
              placeholder="Add comment"
              className="w-full border rounded-sm text-sm !px-2 !py-2 mt-2 min-h-20"
            />
            <div className="flex gap-2 flex-row my-2 justify-end">
              <Button variant="secondary" className="py-0 h-8" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" className="py-0 h-8" onClick={handleCommentAddition}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-row gap-2 items-center">
        <div className="w-8 h-8 rounded-full">
          <CustomImage
            src={user?.profileImageUrl}
            alt="user"
            className="w-full h-full rounded-full"
            fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
            fallbackText={user?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
          />
        </div>
        <div
          className="flex-1 w-full h-full justify-center min-h-[36px] cursor-pointer border-[1px] rounded-[8px] border-gray-200"
          onClick={() => setShowCommentBox(true)}
        >
          <div className="text-sm font-medium px-2 mt-2 text-typography-600">Add Comment</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border w-[400px]">
      <div className="text-sm font-medium border-b-[0.5px] pb-2">Comment Thread</div>
      <div className="flex flex-col gap-4 pt-4">
        {renderCommentBox()}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-80 -mr-4 pr-4">
          {comments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              showLike
              showReply
              onReply={text => onReplyComment(text, comment.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommentThread;
