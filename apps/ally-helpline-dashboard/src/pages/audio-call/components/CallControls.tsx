import { FC } from "react";

import { CutCall, FocusOff, FocusOn, NoRecord, Record } from "@/assets/icons";

import { CallControlsProps } from "../types";

const CallControls: FC<CallControlsProps> = ({
  isFocusMode,
  isMuted,
  isPrimaryButtonDisabled = false,
  isSecondaryButtonDisabled,
  isTertiaryButtonDisabled,
  showFocusButton,
  onCutCallButtonClick,
  onFocusButtonClick,
  onMuteButtonClick,
}) => {
  return (
    <div className="z-10 absolute bottom-10 w-full flex justify-center items-center gap-4 bg-gradient-to-b from-transparent to-white  pt-[100px]">
      <button
        disabled={isSecondaryButtonDisabled}
        onClick={onMuteButtonClick}
        className="w-[56px] h-[56px]"
      >
        {isMuted ? <NoRecord /> : <Record />}
      </button>
      <button
        disabled={isPrimaryButtonDisabled}
        onClick={onCutCallButtonClick}
        className="w-[56px] h-[56px]"
      >
        <CutCall />
      </button>
      {showFocusButton && (
        <button disabled={isTertiaryButtonDisabled} className="w-[56px] h-[56px]">
          {isFocusMode ? (
            <FocusOn onClick={() => onFocusButtonClick(false)} />
          ) : (
            <FocusOff onClick={() => onFocusButtonClick(true)} />
          )}
        </button>
      )}
    </div>
  );
};

export default CallControls;
