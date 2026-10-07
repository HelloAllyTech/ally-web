import { FC } from "react";

import { Button } from "@components";
import { ButtonVariant, FooterProps } from "@components/types";
import { en } from "@constants";

export const Footer: FC<FooterProps> = ({
  onPrevious,
  onNext,
  showPrevious = false,
  showNext = true,
  isNextDisabled = false,
  isPreviousDisabled = false,
  isLastStep = false,
}) => {
  return (
    // Below md the page scrolls as one, so the bar sticks to the bottom of the
    // screen to keep Back / Next in reach. The white skirt covers the shell's
    // bottom padding, which content would otherwise show through.
    <div className="flex items-center justify-between w-full md:w-[calc(100%-32px)] mt-2 px-0 md:px-2 mx-0 md:mx-4 py-3 md:py-4 h-auto md:h-[80px] border-t border-border-light max-md:sticky max-md:bottom-0 max-md:z-10 max-md:bg-white max-md:shadow-[0_1rem_0_0_white]">
      <div className="flex items-center gap-3">
        {showPrevious && (
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={onPrevious}
            disabled={isPreviousDisabled}
            className="font-tertiary font-[500] px-6 py-2"
          >
            {en.simulation.back}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 ">
        {showNext && !isLastStep && (
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={onNext}
            disabled={isNextDisabled}
            className="px-6 py-2 h-[40px]"
          >
            {isLastStep ? en.simulation.publish : en.simulation.next}
          </Button>
        )}
      </div>
    </div>
  );
};
