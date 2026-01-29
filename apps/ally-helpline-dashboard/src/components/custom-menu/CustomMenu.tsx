import { useRef, useState, useLayoutEffect, ReactNode } from "react";

import { createPortal } from "react-dom";

import { useClickOutside } from "@hooks";

export interface MenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
}

interface CustomMenuProps {
  anchorElement: HTMLElement | null;
  items: MenuItem[];
  onClose?: () => void;
  minWidth?: number;
  className?: string;
}

const CustomMenu = ({
  anchorElement,
  items,
  onClose,
  minWidth = 150,
  className = "",
}: CustomMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useClickOutside(menuRef, () => {
    onClose?.();
  });

  useLayoutEffect(() => {
    if (!anchorElement || !menuRef.current) return;

    const rect = anchorElement.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();

    let top = rect.bottom - 2;
    let left = rect.right - menuRect.width;

    // Keep inside viewport vertically
    if (top + menuRect.height > window.innerHeight - 8) {
      top = rect.top - menuRect.height - 4;
    }

    // Keep inside viewport horizontally
    if (left < 8) left = 8;
    if (left + menuRect.width > window.innerWidth - 8) {
      left = window.innerWidth - menuRect.width - 8;
    }

    setPosition({ top, left });
  }, [anchorElement]);

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.onClick();
      onClose?.();
    }
  };

  if (!anchorElement || !items?.length) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-50 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 ${className}`}
      onMouseDown={e => e.stopPropagation()}
      style={
        position
          ? { top: position.top, left: position.left, minWidth: `${minWidth}px` }
          : { visibility: "hidden", minWidth: `${minWidth}px` }
      }
    >
      {items?.map((item, index) => (
        <button
          key={index}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className={`w-full text-left px-4 py-2 text-[14px] text-typography-800 hover:bg-gray-50 transition-colors flex items-center gap-2 ${
            item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } ${item.className || ""}`}
        >
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          <span className={`${item.className || ""} font-primary`}>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
};

export default CustomMenu;
