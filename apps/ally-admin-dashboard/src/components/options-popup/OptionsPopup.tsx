import { FC, useRef, useEffect, ReactNode, useState, useCallback } from "react";

import { createPortal } from "react-dom";

import { KeyboardKeys } from "@constants";

// Constants
const POPUP_GAP = 8;
const DEFAULT_POPUP_WIDTH = 300;
const DEFAULT_POPUP_HEIGHT = 150;

// Types
export interface OptionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface OptionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  options: OptionItem[];
  anchorElement?: HTMLElement | null;
  className?: string;
}

interface Position {
  top: number;
  left: number;
}

// Helper function to calculate popup position
const calculatePopupPosition = (
  anchorElement: HTMLElement,
  popupWidth: number,
  popupHeight: number,
): Position => {
  const rect = anchorElement.getBoundingClientRect();

  // Calculate initial position - align right edge with button's right edge
  let top = rect.bottom + POPUP_GAP;
  let left = rect.right - popupWidth;

  // Adjust if popup goes off-screen (bottom)
  if (top + popupHeight > window.innerHeight) {
    top = rect.top - popupHeight - POPUP_GAP;
  }

  // Adjust if popup goes off-screen (left)
  if (left < POPUP_GAP) {
    left = POPUP_GAP;
  }

  // Adjust if popup goes off-screen (right)
  if (left + popupWidth > window.innerWidth - POPUP_GAP) {
    left = window.innerWidth - popupWidth - POPUP_GAP;
  }

  return { top, left };
};

// Option Button Component
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
    aria-label={option.label}
  >
    {option.icon && (
      <div className="flex items-center justify-center w-6 h-6 text-typography-800">
        {option.icon}
      </div>
    )}
    <span className="text-base font-normal text-typography-900 font-primary">{option.label}</span>
  </button>
);

// Main Component
export const OptionsPopup: FC<OptionsPopupProps> = ({
  isOpen,
  onClose,
  options,
  anchorElement,
  className = "",
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  // Calculate and update popup position
  const updatePosition = useCallback(() => {
    if (!anchorElement || !popupRef.current) return;

    const popupWidth = popupRef.current.offsetWidth || DEFAULT_POPUP_WIDTH;
    const popupHeight = popupRef.current.offsetHeight || DEFAULT_POPUP_HEIGHT;

    const newPosition = calculatePopupPosition(anchorElement, popupWidth, popupHeight);
    setPosition(newPosition);
  }, [anchorElement]);

  // Handle option click
  const handleOptionClick = useCallback(
    (option: OptionItem) => {
      option.onClick();
      onClose();
    },
    [onClose],
  );

  // Position calculation and window event listeners
  useEffect(() => {
    if (!isOpen || !anchorElement) {
      setPosition(null);
      return undefined;
    }

    // Initial position calculation
    updatePosition();

    // Update position on scroll/resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, anchorElement, updatePosition]);

  // Handle click outside to close popup
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        anchorElement &&
        !anchorElement.contains(target)
      ) {
        onClose();
      }
    };

    // Use timeout to avoid immediate closing on the same click that opened the popup
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, anchorElement]);

  // Handle escape key to close popup
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === KeyboardKeys.ESCAPE) {
        onClose();
      }
    };

    document.addEventListener(KeyboardKeys.KEYDOWN, handleEscape);

    return () => {
      document.removeEventListener(KeyboardKeys.KEYDOWN, handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const popupStyle = position
    ? {
        top: `${position.top}px`,
        left: `${position.left}px`,
      }
    : {
        top: 0,
        left: 0,
        visibility: "hidden" as const,
      };

  const popupContent = (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      {/* Popup */}
      <div
        ref={popupRef}
        role="menu"
        aria-orientation="vertical"
        className={`fixed z-50 bg-white rounded-[16px] border border-border-light shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${
          position ? "animate-slideInFromRight" : "opacity-0"
        } ${className}`}
        style={popupStyle}
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
      </div>
    </>
  );

  return createPortal(popupContent, document.body);
};
