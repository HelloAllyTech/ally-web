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
    <div className="flex items-center justify-between w-[calc(100%-32px)] mt-2 px-2 mx-4 py-4 h-[80px] border-t border-border-light">
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
