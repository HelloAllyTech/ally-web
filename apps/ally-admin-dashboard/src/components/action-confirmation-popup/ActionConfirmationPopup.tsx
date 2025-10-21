import { FC } from "react";

import { Close } from "@assets";
import { getButtonStyles } from "@constants";

import { ActionConfirmationPopupProps } from "../types";

const ActionConfirmationPopup: FC<ActionConfirmationPopupProps> = ({
  isOpen,
  onClose,
  title,
  description,
  primaryButton,
  secondaryButton,
  titleItalic,
}) => {
  if (!isOpen) return null;

  const popupHeader = (
    <div className="flex flex-col items-center justify-between p-5">
      <button
        onClick={onClose}
        className="absolute top-[5px] right-[5px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Close width={15} height={20} />
      </button>

      <div className="flex justify-center items-center relative text-[24px] font-medium text-center w-full">
        {title}{" "}
        {titleItalic && <span className="italic font-semibold ml-1">{`${titleItalic}`}</span>}
      </div>
      <p className="text-black  text-[14px] my-2 text-center mb-[16px] text-base">{description}</p>
    </div>
  );

  const popupButtons = (
    <div className="flex gap-2 pb-[16px] justify-center">
      <button
        onClick={secondaryButton.onClick}
        className={`${getButtonStyles(secondaryButton.variant)} border w-full rounded-full p-2`}
      >
        {secondaryButton.label}
      </button>
      <button
        onClick={primaryButton.onClick}
        className={`${getButtonStyles(primaryButton.variant)} rounded-full w-full p-2`}
      >
        {primaryButton.label}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center px-4 shadow-2xl animate-fadeIn">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in-0 zoom-in-95 duration-200 px-8 py-2">
          {popupHeader}
          {popupButtons}
        </div>
      </div>
    </div>
  );
};

export default ActionConfirmationPopup;
