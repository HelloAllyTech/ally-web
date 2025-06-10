import { FC } from "react";

import { CutCall, FocusOff, FocusOn, NoRecord, Record } from "@/assets/icons";

import { CallControlsProps } from "../types";

const CallControls: FC<CallControlsProps> = ({
  isCounsellor,
  isFocusMode,
  isMuted,
  isUserJoined,
  onCutCallButtonClick,
  onFocusButtonClick,
  onMuteButtonClick,
}) => {
  return (
    <div className="z-10 absolute bottom-10 w-full flex justify-center items-center gap-4">
      <button
        disabled={!isUserJoined}
        onClick={onMuteButtonClick}
      >
        {isMuted ? <NoRecord /> : <Record />}
      </button>
      {isCounsellor && (
        <button disabled={!isUserJoined}>
          {isFocusMode ? (
            <FocusOn onClick={() => onFocusButtonClick(false)} />
          ) : (
            <FocusOff onClick={() => onFocusButtonClick(true)} />
          )}
        </button>
      )}
      <button onClick={onCutCallButtonClick}>
        <CutCall />
      </button>
    </div>
  );
};

export default CallControls;
