import { FC, useRef, useEffect, ReactNode, useCallback, useState } from "react";

import { createPortal } from "react-dom";

import { KeyboardKeys } from "@constants";

const POPUP_GAP = 8;
const DEFAULT_POPUP_WIDTH = 300;
const DEFAULT_POPUP_HEIGHT = 150;

interface Position {
  top: number;
  left: number;
}

interface PopupWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
  className?: string;
  children: ReactNode;
}

const calculatePopupPosition = (
  anchorElement: HTMLElement,
  popupWidth: number,
  popupHeight: number,
): Position => {
  const rect = anchorElement.getBoundingClientRect();

  let top = rect.bottom + POPUP_GAP;
  let left = rect.left;

  if (top + popupHeight > window.innerHeight) top = rect.top - popupHeight - POPUP_GAP;

  if (left < POPUP_GAP) left = POPUP_GAP;
  if (left + popupWidth > window.innerWidth - POPUP_GAP)
    left = window.innerWidth - popupWidth - POPUP_GAP;

  return { top, left };
};

export const PopupWrapper: FC<PopupWrapperProps> = ({
  isOpen,
  onClose,
  anchorElement,
  className = "",
  children,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const updatePosition = useCallback(() => {
    if (!anchorElement || !popupRef.current) return;

    const popupWidth = popupRef.current.offsetWidth || DEFAULT_POPUP_WIDTH;
    const popupHeight = popupRef.current.offsetHeight || DEFAULT_POPUP_HEIGHT;

    const newPos = calculatePopupPosition(anchorElement, popupWidth, popupHeight);
    setPosition(newPos);
  }, [anchorElement]);

  // Handle position update
  useEffect(() => {
    if (!isOpen || !anchorElement) {
      setPosition(null);
      return undefined;
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, anchorElement, updatePosition]);

  // Outside click
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

    const timeout = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, anchorElement]);

  // Escape key close
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === KeyboardKeys.ESCAPE) onClose();
    };

    document.addEventListener(KeyboardKeys.KEYDOWN, handleEscape);
    return () => {
      document.removeEventListener(KeyboardKeys.KEYDOWN, handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const popupStyle = position
    ? { top: `${position.top}px`, left: `${position.left}px` }
    : { top: 0, left: 0, visibility: "hidden" as const };

  const popupNode = (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        ref={popupRef}
        className={`fixed z-50 bg-white rounded-none border border-border-light shadow-[0_2px_6px_rgba(0,0,0,0.2)]
          ${position ? "animate-slideInFromRight" : "opacity-0"} 
          ${className}`}
        style={popupStyle}
      >
        {children}
      </div>
    </>
  );

  return createPortal(popupNode, document.body);
};
