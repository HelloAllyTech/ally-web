import { FC } from "react";

import { Button } from "@components";

import { ButtonGroupProps } from "./types";

const ButtonGroup: FC<ButtonGroupProps> = ({ buttonList }) => (
  <div className="flex w-fit max-sm:w-[calc(100vw-2rem)] rounded-[8px] bg-[#282B31] overflow-hidden">
    {buttonList
      .filter(button => button.show)
      .map(({ action, isActive, isDisabled, leftIcon, text }, buttonIndex) => {
        const isLastButton = buttonIndex === buttonList.length - 1;

        return (
          <Button
            key={text}
            onClick={action}
            disabled={isDisabled}
            variant="text"
            // Below sm the three call controls share the row equally, icon above
            // label, so End session never runs off a phone screen.
            className={`sm:w-[120px] md:w-[140px] lg:w-[196px] h-12 flex items-center justify-center px-15 py-3 rounded-none leading-[16px] text-wrap max-sm:min-w-0 max-sm:flex-1 max-sm:flex-col max-sm:gap-1 max-sm:h-auto max-sm:min-h-14 max-sm:px-2 ${isActive ? "!bg-[#faf9f5]" : ""}
              ${isLastButton ? "" : "!border-solid border-r-[0.5px] border-[#565045]"}`}
          >
            {leftIcon}
            <span className={`text-xs ${isActive ? "text-typography-900" : "text-white"}`}>
              {text}
            </span>
          </Button>
        );
      })}
  </div>
);

export default ButtonGroup;
