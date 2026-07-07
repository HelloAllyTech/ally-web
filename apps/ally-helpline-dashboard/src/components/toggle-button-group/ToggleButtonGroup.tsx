import { FC } from "react";

import { cn } from "@utils";

import { ToggleButtonGroupProps } from "./types";

/**
 * Segmented single-select control (light selected pill on a neutral track).
 *
 * Carbon's `ContentSwitcher` uses a dark, full-bleed selected segment that does
 * not match this product's toggle, so — like `SidePanel` — this is a small
 * MUI-free control styled with the app's Tailwind tokens. `equalWidth` makes the
 * options share width equally (the group still sizes to its content); a
 * `successValue` renders that option's selected state green.
 */
const ToggleButtonGroup: FC<ToggleButtonGroupProps> = ({
  disabled,
  value,
  onValueChange,
  items,
  className,
  successValue,
  equalWidth,
  inheritFontSize = false,
}) => {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex h-9 items-stretch rounded-[4px] border-[0.5px] border-border-medium bg-neutral-100 p-0.5 font-tertiary",
        className,
      )}
    >
      {items.map(({ value: itemValue, label }) => {
        const isSelected = itemValue === value;
        const isSuccess = isSelected && itemValue === successValue;
        return (
          <button
            key={itemValue}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => {
              if (!disabled && itemValue !== value) onValueChange(itemValue);
            }}
            className={cn(
              "rounded-[4px] px-6 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              inheritFontSize ? "text-inherit" : "text-sm",
              equalWidth && "min-w-0 flex-1",
              isSelected
                ? isSuccess
                  ? "bg-[#33BA60] text-white shadow-sm"
                  : "bg-white text-[#4D4D4D] shadow-sm"
                : "text-typography-700 hover:bg-black/5",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default ToggleButtonGroup;
