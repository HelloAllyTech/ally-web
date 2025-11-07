import React, { useState, useRef, useCallback, useEffect } from "react";

import { Theme } from "emoji-picker-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

import { ArrowDownFilled } from "@assets";
import { useClickOutside } from "@hooks";

interface EmojiPickerProps {
  onEmojiClick?: (emoji: string) => void;
  theme?: Theme;
  width?: number | string;
  height?: number | string;
  searchDisabled?: boolean;
  skinTonesDisabled?: boolean;
  previewConfig?: {
    showPreview?: boolean;
    defaultCaption?: string;
  };
  className?: string;
  buttonClassName?: string;
  buttonText?: string;
  disabled?: boolean;
}

export const EmojiPickerComponent: React.FC<EmojiPickerProps> = ({
  onEmojiClick,
  width = 300,
  height = 400,
  className = "",
  buttonClassName = "",
  buttonText = "😀",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(buttonText);
  const [showAbove, setShowAbove] = useState(false);
  const [pickerHeight, setPickerHeight] = useState(0);

  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedEmoji(buttonText);
  }, [buttonText]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;

      const shouldShowAbove = spaceBelow < Number(height) + 20;
      setShowAbove(shouldShowAbove);
      setPickerHeight(Number(height));
    }
  }, [isOpen, height]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setSelectedEmoji(emojiData.emoji);
    onEmojiClick?.(emojiData.emoji);
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useClickOutside(pickerRef, handleClose);

  return (
    <div className={`relative w-full ${className}`} ref={pickerRef}>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={disabled}
        className={`
            flex items-center gap-2 justify-center w-full
            ${disabled ? "cursor-not-allowed opacity-50" : ""}
            ${buttonClassName}
          `}
      >
        <span className="text-xl min-w-[20px]">{selectedEmoji}</span>
        <div className="text-text-400 w-2 h-2">
          <ArrowDownFilled />
        </div>
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute right-0 z-50 shadow-lg rounded-lg overflow-hidden ${
            showAbove ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{ width, height: pickerHeight }}
        >
          <EmojiPicker width={width} height={height} onEmojiClick={handleEmojiClick} />
        </div>
      )}
    </div>
  );
};
