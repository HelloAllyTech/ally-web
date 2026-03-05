import { FC } from "react";

import { Tooltip } from "@mui/material";

import { AddIcon, PencilIcon } from "@src/assets";
import { AddReviewNoteProps } from "@src/components/add-review-note/types";
import { toolTipStyles } from "@src/constants";

const AddReviewNote: FC<AddReviewNoteProps> = ({
  note,
  isEditable = false,
  onEditNote,
  onAddNote,
  isEdited = false,
}) => {
  const getActionComponent = () => {
    if (!note || note.length === 0) {
      return (
        <Tooltip title="Add note" placement="top" arrow slotProps={toolTipStyles}>
          <div
            onClick={onAddNote}
            className="w-4 h-4 bg-white rounded-[1.33px] border-[0.5px] border-[#D2D2D2] text-center items-center justify-center flex cursor-pointer"
          >
            <AddIcon className="w-2 h-2" />
          </div>
        </Tooltip>
      );
    }
    if (isEditable) {
      return (
        <Tooltip title="Edit note" placement="top" arrow slotProps={toolTipStyles}>
          <div
            onClick={onEditNote}
            className="w-4 h-4 bg-white rounded-[1.33px] border-[0.5px] border-[#D2D2D2] text-center items-center justify-center flex cursor-pointer"
          >
            <PencilIcon className="w-2 h-2" />
          </div>
        </Tooltip>
      );
    }
    return null;
  };
  return (
    <div
      className={`flex flex-col gap-1 ${note && note.length > 0 ? "bg-[#FFF3E080]" : "bg-white"} p-4 border-l-[1px] border-l-[#FFA726]`}
    >
      <div className="flex items-center gap-2.5">
        <div className="text-base text-[#E65100] leading-5 font-tertiary tracking-[2px]">NOTE</div>
        {getActionComponent()}
      </div>
      {note && note.length > 0 && (
        <div className="text-base text-black leading-4 font-primary">
          {note}{" "}
          {isEdited && <span className="text-xs text-typography-800 leading-5">{"[Edited]"}</span>}
        </div>
      )}
    </div>
  );
};

export default AddReviewNote;
