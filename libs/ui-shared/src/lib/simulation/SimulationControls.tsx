"use client";

import { FC } from "react";

import { CircularProgress } from "@mui/material";

import { MicOff, MicOn, Stop, Focus } from "@ally-ui-mono/ui-shared/assets";

import { SimulationControlsProps } from "./types";
import ButtonGroup from "../button-group";

export const SimulationControls: FC<SimulationControlsProps> = ({
  isMuted,
  isFocusMode,
  isEndingSession,
  onEndSessionClick,
  onMuteClick,
  onFocusButtonClick,
}) => {
  const buttonList = [
    {
      action: onMuteClick,
      isActive: isMuted,
      isDisabled: isEndingSession,
      leftIcon: isMuted ? <MicOff /> : <MicOn />,
      show: true,
      text: isMuted ? "Unmute" : "Mute",
      testId: "simulation-controls-mute-button",
    },
    {
      action: onFocusButtonClick,
      isActive: isFocusMode,
      isDisabled: isEndingSession,
      leftIcon: <Focus className={isFocusMode ? "" : "[&_path]:fill-[#FFFFFF]"} />,
      show: true,
      text: isFocusMode ? "Focused" : "Focus",
      testId: "simulation-controls-focus-button",
    },
    {
      action: onEndSessionClick,
      isActive: false,
      isDisabled: isEndingSession,
      leftIcon: isEndingSession ? <CircularProgress size={16} /> : <Stop />,
      show: true,
      text: "End session",
      testId: "simulation-controls-end-session-button",
    },
  ];
  return <ButtonGroup data-testid="simulation-controls" buttonList={buttonList} />;
};
