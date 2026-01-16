import { FC, useMemo } from "react";

import { useSelector } from "react-redux";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared/index";
import { RootState } from "@src/store";

import { Button } from "../button";

interface CommentAdditionDialogProps {
  onCancel: () => void;
}
const CommentAdditionDialog: FC<CommentAdditionDialogProps> = ({ onCancel }) => {
  const user = useSelector((state: RootState) => state.user.user);
  const initials = useMemo(() => {
    return user?.name[0];
  }, [user?.name]);
  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border w-[360px]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 font-primary">
          <div className="w-8 h-8 rounded-full border flex items-center justify-center text-[#757575] text-sm font-medium">
            {initials}
          </div>
          <div className=" text-sm font-medium">{user?.name}</div>
        </div>
        <AutoExpandableTextarea
          value=""
          onChange={() => {}}
          placeholder="Add comment"
          className="w-full border rounded-sm text-sm !px-2 !py-2 min-h-20"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button className="col-span-1" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="col-span-1" variant="primary" onClick={() => {}}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentAdditionDialog;
