import { FC, useEffect, useRef, useState } from "react";

import { AccountTree, AlarmOn, Chat, Close, DiamondShine } from "@assets";
import { ButtonVariant } from "@components/types";
import { getButtonStyles } from "@utils";

export type EventType = "SENTENCE_SIMILARITY" | "TIME_BASED" | "SCORE_BASED" | "COMBINATION";

export interface EventTypeOption {
  value: EventType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  prefix: string;
}

export const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  {
    value: "SENTENCE_SIMILARITY",
    label: "Sentence Similarity",
    description: "Trigger based on what the speaker says.",
    icon: Chat,
    prefix: "SS",
  },
  {
    value: "TIME_BASED",
    label: "Time Based",
    description: "Trigger before, after, or at a specific time.",
    icon: AlarmOn,
    prefix: "TB",
  },
  {
    value: "SCORE_BASED",
    label: "Score Based",
    description: "Trigger when score is greater, less, or equal to threshold.",
    icon: DiamondShine,
    prefix: "SB",
  },
  {
    value: "COMBINATION",
    label: "Combination of:",
    description: "Trigger based on multiple events.",
    icon: AccountTree,
    prefix: "CE",
  },
];

interface EventTypeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (eventType: EventType) => void;
}

export const EventTypeSelectionDialog: FC<EventTypeSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
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

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
    }
  }, [isOpen]);

  const handleSelect = (eventType: EventType) => {
    setSelectedType(eventType);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
      <div className="fixed inset-0 flex items-center justify-center px-4 shadow-2xl animate-fadeIn">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-[480px] w-full animate-in fade-in-0 zoom-in-95 duration-200 p-8"
          ref={dialogRef}
        >
          <button
            onClick={onClose}
            className="absolute top-[10px] right-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Close width={15} height={20} />
          </button>

          <div className="flex flex-col gap-4">
            <div className="flex justify-center items-center relative text-2xl font-thin text-center w-full font-['Replay_Pro','headline'] text-typography-900">
              Create New Event
            </div>

            <div className="text-center text-typography-600 mb-2">
              Select the type of event you want to create.
            </div>

            <div className="grid grid-cols-1 gap-4">
              {EVENT_TYPE_OPTIONS.map(option => {
                const Icon = option.icon;
                const isSelected = selectedType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all hover:border-blue-300 ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-typography-900 mb-1">{option.label}</div>
                        <div className="text-sm text-typography-600">{option.description}</div>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleConfirm}
                disabled={!selectedType}
                className={`${getButtonStyles(ButtonVariant.PRIMARY)} rounded-full px-8 py-2 font-['Roboto'] disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Create event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
