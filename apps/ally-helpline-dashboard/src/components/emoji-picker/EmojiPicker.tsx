import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Emoji } from "@assets";

const PICKER_WIDTH = 320;
const PICKER_HEIGHT = 400;

export interface EmojiPickerTriggerProps {
  onEmojiClick: (emoji: string) => void;
  className?: string;
  buttonClassName?: string;
  isExpired?: boolean;
}

export const EmojiPickerTrigger = ({
  onEmojiClick,
  className = "",
  buttonClassName = "",
  isExpired = false,
}: EmojiPickerTriggerProps) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const updatePosition = useCallback(() => {
    if (buttonRef.current && isOpen) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const shouldShowAbove = spaceBelow < PICKER_HEIGHT + 20;
      const top = shouldShowAbove
        ? buttonRect.top + window.scrollY - PICKER_HEIGHT - 8
        : buttonRect.bottom + window.scrollY + 8;
      let left = buttonRect.right + window.scrollX - PICKER_WIDTH;
      if (left < 0) left = buttonRect.left + window.scrollX;
      if (left + PICKER_WIDTH > viewportWidth) left = viewportWidth - PICKER_WIDTH - 8;
      setPosition({ top, left });
    }
  }, [isOpen]);

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

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiClick(emojiData.emoji);
      setIsOpen(false);
    },
    [onEmojiClick],
  );

  return (
    <div className={`relative flex-shrink-0 ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={t("review.details.insertEmoji")}
        className={`w-9 h-9 flex items-center justify-center hover:bg-neutral-50 text-xl transition-colors ${buttonClassName} ${isExpired ? "opacity-50 cursor-not-allowed" : ""}`}
        disabled={isExpired}
      >
        <Emoji />
      </button>
      {isOpen &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] shadow-lg rounded-lg overflow-hidden border border-border"
            style={{
              top: position.top,
              left: position.left,
              width: PICKER_WIDTH,
              height: PICKER_HEIGHT,
            }}
          >
            <EmojiPicker
              width={PICKER_WIDTH}
              height={PICKER_HEIGHT}
              onEmojiClick={handleEmojiClick}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};
