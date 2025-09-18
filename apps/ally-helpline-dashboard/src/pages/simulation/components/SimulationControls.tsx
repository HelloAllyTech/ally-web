import { FC } from "react";

import { CircularProgress } from "@mui/material";

import { MicIcon, MicOffIcon, StopIcon } from "@assets";
import { ButtonGroup } from "@components";

import { SimulationControlsProps } from "./types";

const SimulationControls: FC<SimulationControlsProps> = ({
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
      leftIcon: isMuted ? <MicOffIcon /> : <MicIcon />,
      show: true,
      text: isMuted ? "Unmute" : "Mute",
    },
    {
      action: onEndSessionClick,
      isActive: false,
      isDisabled: isEndingSession,
      leftIcon: isEndingSession ? <CircularProgress size={16} /> : <StopIcon />,
      show: true,
      text: "End session",
    },
  ];
  return <ButtonGroup buttonList={buttonList} />;
};

export default SimulationControls;
