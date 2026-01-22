import { FC, useEffect, useRef } from "react";

import { Close } from "@assets";
import { Button } from "@components";
import { ButtonVariant, PopupButtonProps } from "@components/types";

interface ActionConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleItalic?: string;
  description: string;
  primaryButton: PopupButtonProps;
  secondaryButton?: PopupButtonProps;
}

export const ActionConfirmationPopup: FC<ActionConfirmationPopupProps> = ({
  isOpen,
  onClose,
  title,
  description,
  primaryButton,
  secondaryButton,
  titleItalic,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderBoldFromString = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <span key={index} className="font-bold">
          {part.slice(2, -2)}
        </span>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  };

  const popupHeader = (
    <div className="flex flex-col items-center justify-between p-5">
      <button
        onClick={onClose}
        className="absolute top-[5px] right-[5px] text-typography-600 hover:text-typography-800 transition-colors"
      >
        <Close width={15} height={20} />
      </button>

      <div className="flex justify-center items-center relative text-2xl font-medium text-center w-full font-primary">
        {title}{" "}
        {titleItalic && <span className="italic font-semibold ml-1">{`${titleItalic}`}</span>}
      </div>
      <p className="text-typography-800 font-primary text-base my-2 text-center ">
        {renderBoldFromString(description)}
      </p>
    </div>
  );

  const popupButtons = (
    <div className="flex gap-2 pb-[16px] justify-center">
      {secondaryButton && (
        <Button
          onClick={secondaryButton.onClick}
          variant={ButtonVariant.SECONDARY}
          className="text-typography-900 text-base border w-full border-border-dark rounded-full p-2 font-tertiary"
        >
          {secondaryButton.label}
        </Button>
      )}
      <Button
        onClick={primaryButton.onClick}
        variant={ButtonVariant.PRIMARY}
        className={`text-white text-base rounded-full p-2 font-tertiary ${
          secondaryButton ? "w-full" : "w-1/3"
        }`}
      >
        {primaryButton.label}
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
      <div className="fixed inset-0 flex items-center justify-center px-4 shadow-2xl animate-fadeIn">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in-0 zoom-in-95 duration-200 px-8 py-2 "
          ref={popupRef}
        >
          {popupHeader}
          {popupButtons}
        </div>
      </div>
    </div>
  );
};
