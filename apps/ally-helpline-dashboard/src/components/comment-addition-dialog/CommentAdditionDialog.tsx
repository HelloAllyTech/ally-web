import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { AutoExpandableTextarea, CustomImage } from "@ally-ui-mono/ui-shared";
import { COMMENT_MAX_LENGTH } from "@constants";
import { RootState } from "@store";

import { Button } from "../button";

interface CommentAdditionDialogProps {
  onCancel: () => void;
  onComment: (comment: string) => void;
}
const CommentAdditionDialog: FC<CommentAdditionDialogProps> = ({ onCancel, onComment }) => {
  const [comment, setComment] = useState("");
  const user = useSelector((state: RootState) => state.user.user);
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border w-[360px]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 font-primary">
          <div className="w-8 h-8 rounded-full border flex items-center justify-center text-[#757575] text-sm font-medium">
            <CustomImage
              src={user?.profileImageUrl}
              alt="user"
              className="w-full h-full rounded-full"
              fallbackClassName="w-full h-full rounded-full bg-neutral-100 flex items-center justify-center text-typography-600"
              fallbackText={user?.name?.slice(0, 1)?.toUpperCase() ?? "NA"}
            />
          </div>
          <div className=" text-sm font-medium">{user?.name}</div>
        </div>
        <AutoExpandableTextarea
          value={comment}
          onChange={setComment}
          placeholder={t("review.details.addCommentPlaceholder", "Add a comment")}
          maxLength={COMMENT_MAX_LENGTH}
          className="w-full border rounded-sm text-sm !px-2 !py-2 min-h-20"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button className="col-span-1" variant="secondary" onClick={onCancel}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button className="col-span-1" variant="primary" onClick={() => onComment(comment)}>
            {t("review.details.commentAction", "Comment")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentAdditionDialog;
