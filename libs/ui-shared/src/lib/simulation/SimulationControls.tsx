import { FC } from "react";

import { CircularProgress } from "@mui/material";

import { MicOn, MicOff, Stop } from "@ally-ui-mono/ui-shared/assets";

import { SimulationControlsProps } from "./types";
import ButtonGroup from "../button-group";

export const SimulationControls: FC<SimulationControlsProps> = ({
  isMuted,
  isEndingSession,
  onEndSessionClick,
  onMuteClick,
}) => {
  const buttonList = [
    {
      action: onMuteClick,
      isActive: isMuted,
      isDisabled: isEndingSession,
      leftIcon: isMuted ? <MicOff /> : <MicOn />,
      show: true,
      text: isMuted ? "Unmute" : "Mute",
    },
    {
      action: onEndSessionClick,
      isActive: false,
      isDisabled: isEndingSession,
      leftIcon: isEndingSession ? <CircularProgress size={16} /> : <Stop />,
      show: true,
      text: "End session",
    },
  ];
  return <ButtonGroup buttonList={buttonList} />;
};
