import { FC, useEffect, useRef, useState } from "react";

import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { useClickOutside } from "@hooks";
import { Close, Tick } from "@src/assets";
import { getButtonStyles } from "@utils";

export interface Option {
  value: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface OptionSelectionPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  options: Option[];
  title: string;
  description: string;
  buttonText: string;
}

export const OptionSelectionPopover: FC<OptionSelectionPopoverProps> = ({
  isOpen,
  onClose,
  onSelect,
  options,
  title,
  description,
  buttonText,
}) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useClickOutside(dialogRef, () => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (!isOpen && selectedType !== null) {
      setTimeout(() => {
        setSelectedType(null);
      }, 0);
    }
  }, [isOpen, selectedType]);

  const handleSelect = (value: string) => {
    setSelectedType(value);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 font-primary">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
      <div className="fixed inset-0 flex items-center justify-center px-4 shadow-2xl animate-fadeIn">
        <div
          className="relative bg-background rounded-lg shadow-xl max-w-[540px] w-full animate-in fade-in-0 zoom-in-95 duration-200 p-8"
          ref={dialogRef}
        >
          <button
            onClick={onClose}
            className="absolute top-[10px] right-[10px] text-neutral-600 transition-colors"
          >
            <Close width={15} height={20} />
          </button>

          <div className="flex flex-col gap-2">
            <div className="flex justify-center items-center relative text-2xl font-thin text-center w-full font-secondary text-typography-900">
              {title}
            </div>

            <div className="text-center text-base text-typography-800 mb-2">{description}</div>

            <div className="grid grid-cols-1 gap-2 custom-scrollbar">
              {options.map(option => {
                const Icon = option.icon;
                const isSelected = selectedType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`relative p-4 rounded-lg text-left transition-all border-[0.5px] border-border ${
                      isSelected && "border-primary-500"
                    }`}
                  >
                    <div className="flex items-center gap-4 relative">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-regular text-typography-900">{option.label}</div>
                        <div className="text-base text-typography-800">{option.description}</div>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 absolute right-0">
                          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                            <Tick width={15} height={20} />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleConfirm}
                disabled={!selectedType}
                className={`${getButtonStyles(ButtonVariant.PRIMARY)} rounded-full px-8 py-2 font-tertiary disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {buttonText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
