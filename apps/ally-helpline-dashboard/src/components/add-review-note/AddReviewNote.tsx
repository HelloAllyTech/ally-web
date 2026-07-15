import { FC, useMemo } from "react";

import { differenceInMinutes } from "date-fns";
import { useTranslation } from "react-i18next";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { AddIcon, PencilIcon } from "@src/assets";
import { AddReviewNoteProps } from "@src/components/add-review-note/types";

const AddReviewNote: FC<AddReviewNoteProps> = ({
  note,
  isEditable = false,
  onEditNote,
  onAddNote,
  isEdited = false,
  reviewCreatedAt,
}) => {
  const { t } = useTranslation();
  const timeDiff = useMemo(() => {
    return differenceInMinutes(new Date(), new Date(reviewCreatedAt));
  }, [reviewCreatedAt]);

  const getActionComponent = () => {
    if (!note || note.length === 0) {
      return (
        <Tooltip label={t("review.details.addNote")} align="top">
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
        <Tooltip label={t("review.details.editNote")} align="top">
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
      className={`flex flex-col gap-1 ${(note && note.length > 0) || timeDiff < 10 ? "bg-[#FFF3E080] p-4 border-l-[1px] border-l-[#FFA726]" : "bg-white"} `}
    >
      {(timeDiff < 10 || (note && note.length > 0)) && (
        <div className="flex items-center gap-2.5">
          <div className="text-base text-[#E65100] leading-5 font-tertiary tracking-[2px]">
            {t("review.details.noteLabel")}
          </div>
          {getActionComponent()}
        </div>
      )}
      {note && note.length > 0 && (
        <div className="text-base text-black leading-4 font-primary break-words">
          {note}{" "}
          {isEdited && (
            <span className="text-xs text-typography-800 leading-5">
              {t("review.details.editedLabel")}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AddReviewNote;
