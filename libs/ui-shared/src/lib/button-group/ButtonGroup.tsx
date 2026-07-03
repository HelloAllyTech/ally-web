"use client";

import { FC } from "react";

import { ButtonGroupProps } from "./types";

const ButtonGroup: FC<ButtonGroupProps> = ({ buttonList }) => (
  <div className="flex w-fit rounded-[8px] bg-[#282B31] overflow-hidden">
    {buttonList
      .filter(button => button.show)
      .map(({ action, isActive, isDisabled, leftIcon, text, className }, buttonIndex) => {
        const isLastButton = buttonIndex === buttonList.length - 1;

        return (
          <button
            key={text}
            type="button"
            onClick={action}
            disabled={isDisabled}
            aria-pressed={isActive}
            aria-disabled={isDisabled}
            className={`w-[44px] sm:w-[120px] md:w-[140px] lg:w-[196px] h-[48px] sm:h-[56px] flex items-center justify-center px-2 sm:px-4 py-3 rounded-none leading-[16px] text-wrap focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:opacity-50 disabled:cursor-not-allowed ${isActive ? "!bg-[#FDFDFD]" : ""}
              ${isLastButton ? "" : "!border-solid border-r-[0.5px] border-[#5A5F6A]"} ${className}`}
          >
            {leftIcon}
            <span
              className={`hidden sm:block text-[12px] ml-2 ${isActive ? "text-[#1E2025]" : "text-[#fff]"}`}
            >
              {text}
            </span>
          </button>
        );
      })}
  </div>
);

export default ButtonGroup;
