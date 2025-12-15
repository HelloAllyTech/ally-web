"use client";

import { FC } from "react";

import { ButtonGroupProps } from "./types";

const ButtonGroup: FC<ButtonGroupProps> = ({ buttonList }) => (
  <div className="flex w-fit rounded-[8px] bg-[#282B31] overflow-hidden">
    {buttonList
      .filter(button => button.show)
      .map(({ action, isActive, isDisabled, leftIcon, text }, buttonIndex) => {
        const isLastButton = buttonIndex === buttonList.length - 1;

        return (
          <button
            key={text}
            onClick={action}
            disabled={isDisabled}
            className={`sm:w-[120px] md:w-[140px] lg:w-[196px] h-[56px] flex items-center justify-center px-15 py-3 rounded-none leading-[16px] text-wrap ${isActive ? "!bg-[#FDFDFD]" : ""}
              ${isLastButton ? "" : "!border-solid border-r-[0.5px] border-[#5A5F6A]"}`}
          >
            {leftIcon}
            <span className={`text-[12px] ml-2 ${isActive ? "text-[#1E2025]" : "text-[#fff]"}`}>
              {text}
            </span>
          </button>
        );
      })}
  </div>
);

export default ButtonGroup;
