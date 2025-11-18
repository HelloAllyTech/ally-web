import { FC } from "react";

import { PopupWrapper } from "../popup-wrapper";

export interface OptionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface OptionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  options: OptionItem[];
  anchorElement?: HTMLElement | null;
  className?: string;
}

const OptionButton: FC<{
  option: OptionItem;
  isLastOption: boolean;
  onClick: (option: OptionItem) => void;
}> = ({ option, isLastOption, onClick }) => (
  <button
    onClick={() => onClick(option)}
    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-background-secondary transition-colors text-left ${
      !isLastOption ? "border-b border-border-light" : ""
    }`}
  >
    {option.icon && <span className="flex items-center justify-center w-6 h-6">{option.icon}</span>}
    <span className="text-base text-typography-900">{option.label}</span>
  </button>
);

export const OptionsPopup: FC<OptionsPopupProps> = ({
  isOpen,
  onClose,
  options,
  anchorElement,
  className = "",
}) => {
  const handleOptionClick = (option: OptionItem) => {
    option.onClick();
    onClose();
  };

  return (
    <PopupWrapper
      isOpen={isOpen}
      onClose={onClose}
      anchorElement={anchorElement}
      className={className}
    >
      <div className="py-1">
        {options.map((option, index) => (
          <OptionButton
            key={option.id}
            option={option}
            isLastOption={index === options.length - 1}
            onClick={handleOptionClick}
          />
        ))}
      </div>
    </PopupWrapper>
  );
};
