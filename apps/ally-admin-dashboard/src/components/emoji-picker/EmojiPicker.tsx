import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";

import { Theme } from "emoji-picker-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { createPortal } from "react-dom";

import { ArrowDownFilled } from "@assets";

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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedEmoji(buttonText);
  }, [buttonText]);

  const updatePosition = useCallback(() => {
    if (buttonRef.current && isOpen) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const pickerHeight = typeof height === "number" ? height : 400;
      const pickerWidth = typeof width === "number" ? width : 300;

      const spaceBelow = viewportHeight - buttonRect.bottom;
      const shouldShowAbove = spaceBelow < pickerHeight + 20;

      let top;
      if (shouldShowAbove) {
        top = buttonRect.top + window.scrollY - pickerHeight - 8;
      } else {
        top = buttonRect.bottom + window.scrollY + 8;
      }

      // Calculate left position (align right edge with button right edge if possible, else left)
      // Original behavior was right aligned (absolute right-0)
      // let left = buttonRect.right + window.scrollX - pickerWidth;
      // If going off screen to the left, align left
      // if (left < 0) left = buttonRect.left + window.scrollX;

      // Let's align left by default for predictability unless it overflows right
      let left = buttonRect.left + window.scrollX;
      if (left + pickerWidth > viewportWidth) {
        left = buttonRect.right + window.scrollX - pickerWidth;
      }

      setPosition({ top, left });
    }
  }, [height, width, isOpen]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  return (
    <div className={`relative w-full ${className}`}>
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
        <div className="text-typography-600 w-2 h-2">
          <ArrowDownFilled />
        </div>
      </button>

      {isOpen &&
        !disabled &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] shadow-lg rounded-lg overflow-hidden"
            style={{
              top: position.top,
              left: position.left,
              width,
              height,
            }}
          >
            <EmojiPicker width={width} height={height} onEmojiClick={handleEmojiClick} />
          </div>,
          document.body,
        )}
    </div>
  );
};
