import { FC } from "react";

import { Plus } from "@assets";

interface AddItemButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export const AddItemButton: FC<AddItemButtonProps> = ({
  onClick,
  label,
  disabled = false,
  className = "",
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-fit border border-dashed px-4 py-2 flex text-typography-700 gap-3 items-center text-xs disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    <Plus />
    {label}
  </button>
);
