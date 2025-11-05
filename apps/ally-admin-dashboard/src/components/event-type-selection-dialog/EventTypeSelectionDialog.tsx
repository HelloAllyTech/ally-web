import { FC, useEffect, useRef, useState } from "react";

import { Close } from "@assets";
import { ButtonVariant } from "@components/types";
import { getButtonStyles } from "@utils";

export type EventType = "SENTENCE_SIMILARITY" | "TIME_BASED" | "SCORE_BASED" | "COMBINATION";

export interface EventTypeOption {
  value: EventType;
  label: string;
  prefix: string;
}

export const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { value: "SENTENCE_SIMILARITY", label: "Sentence similarity", prefix: "SS" },
  { value: "TIME_BASED", label: "Time based", prefix: "TB" },
  { value: "SCORE_BASED", label: "Score based", prefix: "SB" },
  { value: "COMBINATION", label: "Combination events", prefix: "CE" },
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  const handleSelect = (eventType: EventType) => {
    setSelectedType(eventType);
    setIsDropdownOpen(false);
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
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in-0 zoom-in-95 duration-200 px-8 py-6"
          ref={dialogRef}
        >
          <button
            onClick={onClose}
            className="absolute top-[10px] right-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Close width={15} height={20} />
          </button>

          <div className="flex flex-col gap-4">
            <div className="flex justify-center items-center relative text-[24px] font-medium text-center w-full font-['Replay_Pro']">
              Select Event Type
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg flex items-center justify-between hover:border-gray-400 transition-colors"
              >
                <span className="text-sm font-['IBM_Plex_Serif']">
                  {selectedType
                    ? EVENT_TYPE_OPTIONS.find(opt => opt.value === selectedType)?.label
                    : "Select event type"}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {EVENT_TYPE_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={`px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors ${
                        selectedType === option.value ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="text-sm font-['IBM_Plex_Serif']">{option.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 justify-center">
              <button
                onClick={onClose}
                className={`${getButtonStyles(ButtonVariant.SECONDARY)} border rounded-full w-full p-2 font-['Roboto']`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedType}
                className={`${getButtonStyles(ButtonVariant.PRIMARY)} rounded-full w-full p-2 font-['Roboto'] disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
