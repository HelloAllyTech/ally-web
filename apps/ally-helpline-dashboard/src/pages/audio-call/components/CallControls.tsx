import { FC, useEffect, useState } from "react";

import { X } from "lucide-react";

import { Focus, PauseIcon, ResumeIcon, StopIcon, Warning } from "@assets";
import { ButtonGroup } from "@components";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [isMuteTooltipOpen, setIsMuteTooltipOpen] = useState(true);

  useEffect(() => {
    setIsMuteTooltipOpen(isPaused);
  }, [isPaused]);

  const callButtonList = [
    {
      action: onPauseTranscriptionClick,
      isActive: isPaused,
      isDisabled: isPauseTranscriptionDisabled,
      leftIcon: isPaused ? <ResumeIcon /> : <PauseIcon />,
      show: showPauseTranscription,
      text: isPaused ? t("resumeNoteTaking") : t("pauseNoteTaking"),
    },
    {
      action: () => onFocusButtonClick(!isFocusMode),
      isActive: isFocusMode,
      isDisabled: isFocusButtonDisabled,
      leftIcon: <Focus className={isFocusMode ? "" : "[&_path]:fill-[#FFFFFF]"} />,
      show: showFocusButton,
      text: isFocusMode ? t("turnFocusModeOff") : t("turnFocusModeOn"),
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
  const showMuteTooltip =
    isPaused && showPauseTranscription && !isPauseTranscriptionDisabled && isMuteTooltipOpen;

  return (
    <div className="z-10 absolute bottom-10 w-full flex flex-col items-center gap-4 pt-[100px]">
      <div className="relative">
        <ButtonGroup buttonList={callButtonList} />
        {/* TODO: Reimplement tooltip with Tooltip component */}
        {showMuteTooltip && (
          <div className="flex gap-2 items-center text-xs text-typography-900 bg-[#FFFFFF] absolute top-[-64px] left-8 max-w-[300px] rounded-[4px] p-2">
            Need notes captured? AI can’t hear you right now. Resume to let it listen.
            <X className="w-4 h-4 cursor-pointer" onClick={() => setIsMuteTooltipOpen(false)} />
            <span className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#FFFFFF] absolute bottom-[-8px] sm:left-[10%] md:left-[20%] lg:left-[30%]" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Warning className="[&_path]:fill-[#B6B5B9]" />
        <span className="text-xs text-white font-medium">Your data is safe</span>
      </div>
    </div>
  );
};

export default CallControls;
