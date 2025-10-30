import { FC, useRef } from "react";

import { Trash } from "@assets";
import { MoreOptionsPopupProps } from "@components/types";
import { useClickOutside } from "@hooks";

export const MoreOptionsPopup: FC<MoreOptionsPopupProps> = ({
  isOpen,
  onClose,
  onDiscardSimulation,
  position,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useClickOutside(popupRef, onClose);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="absolute bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[180px] z-50"
      style={{
        top: position.top,
        right: position.right,
      }}
    >
      <button
        onClick={onDiscardSimulation}
        className="flex items-center gap-3 w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="w-4 h-4 text-gray-500">
          <Trash />
        </div>
        <span className="text-sm">Discard simulation</span>
      </button>
    </div>
  );
};
