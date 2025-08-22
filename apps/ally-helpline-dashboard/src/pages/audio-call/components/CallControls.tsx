import { FC } from "react";

import { Focus, PauseIcon, ResumeIcon, StopIcon, Warning } from "@assets";
import { ButtonGroup } from "@components";

import { CallControlsProps } from "../types";

const CallControls: FC<CallControlsProps> = ({
  isFocusMode,
  isPaused,
  isEndSessionDisabled,
  isFocusButtonDisabled,
  isPauseTranscriptionDisabled,
  onEndSessionClick,
  onFocusButtonClick,
  onPauseTranscriptionClick,
  showEndSession,
  showFocusButton,
  showPauseTranscription,
}) => {
  const callButtonList = [
    {
      action: onPauseTranscriptionClick,
      isActive: isPaused,
      isDisabled: isPauseTranscriptionDisabled,
      leftIcon: isPaused ? <ResumeIcon /> : <PauseIcon />,
      show: showPauseTranscription,
      text: isPaused ? "Resume Transcription" : "Pause Transcription",
    },
    {
      action: () => onFocusButtonClick(!isFocusMode),
      isActive: isFocusMode,
      isDisabled: isFocusButtonDisabled,
      leftIcon: <Focus className={isFocusMode ? "" : "[&_path]:fill-[#FFFFFF]"} />,
      show: showFocusButton,
      text: "Focused",
    },
    {
      action: onEndSessionClick,
      isActive: false,
      isDisabled: isEndSessionDisabled,
      leftIcon: <StopIcon />,
      show: showEndSession,
      text: "End session",
    },
  ];

  return (
    <div className="z-10 absolute bottom-10 w-full flex flex-col items-center gap-4 pt-[100px]">
      <ButtonGroup buttonList={callButtonList} />
      <div className="flex items-center gap-2">
        <Warning className="[&_path]:fill-[#B6B5B9]" />
        <span className="text-[12px] text-[#fff] font-medium">Your data is safe</span>
      </div>
    </div>
  );
};

export default CallControls;
