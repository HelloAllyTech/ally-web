import { FC, useRef, useEffect, ReactNode, useState, useCallback } from "react";

import { createPortal } from "react-dom";

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

const POPUP_GAP = 8;
const DEFAULT_POPUP_WIDTH = 300;
const DEFAULT_POPUP_HEIGHT = 150;

export const OptionsPopup: FC<OptionsPopupProps> = ({
  isOpen,
  onClose,
  options,
  anchorElement,
  className = "",
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [calculatedPosition, setCalculatedPosition] = useState<Position | null>(null);

  const calculatePosition = useCallback((): Position | null => {
    if (!anchorElement) return null;

    const rect = anchorElement.getBoundingClientRect();
    const popupWidth = popupRef.current?.offsetWidth || DEFAULT_POPUP_WIDTH;
    const popupHeight = popupRef.current?.offsetHeight || DEFAULT_POPUP_HEIGHT;

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
  }, [anchorElement]);

  const updatePosition = useCallback(() => {
    const position = calculatePosition();
    if (position) {
      setCalculatedPosition(position);
    }
  }, [calculatePosition]);

  useEffect(() => {
    if (!isOpen) {
      setCalculatedPosition(null);
      return undefined;
    }

    if (!anchorElement) return undefined;

    // Initial position calculation
    const position = calculatePosition();
    if (position) {
      setCalculatedPosition(position);
    }

    // Update position on scroll/resize
    const rafId = requestAnimationFrame(updatePosition);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, anchorElement, updatePosition, calculatePosition]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleOptionClick = useCallback(
    (option: OptionItem) => {
      option.onClick();
      onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  const renderOptionButton = (option: OptionItem, index: number) => {
    const isLastOption = index === options.length - 1;

    return (
      <button
        key={option.id}
        onClick={() => handleOptionClick(option)}
        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-background-secondary transition-colors text-left ${
          !isLastOption ? "border-b border-border-light" : ""
        }`}
      >
        {option.icon && (
          <div className="flex items-center justify-center w-6 h-6 text-typography-800">
            {option.icon}
          </div>
        )}
        <span className="text-base font-normal text-typography-900 font-primary">
          {option.label}
        </span>
      </button>
    );
  };

  const popupContent = (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={popupRef}
        className={`fixed z-50 bg-white rounded-[16px] border border-border-light shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${calculatedPosition ? "animate-slideInFromRight" : "opacity-0"} ${className}`}
        style={
          calculatedPosition
            ? {
                top: `${calculatedPosition.top}px`,
                left: `${calculatedPosition.left}px`,
              }
            : {
                top: 0,
                left: 0,
                visibility: "hidden",
              }
        }
      >
        <div className="py-1">{options.map(renderOptionButton)}</div>
      </div>
    </>
  );

  return createPortal(popupContent, document.body);
};
