import { FC } from "react";

import { MicIcon, MicOffIcon, StopIcon } from "@assets";
import { ButtonGroup } from "@components";

import { SimulationControlsProps } from "./types";

const SimulationControls: FC<SimulationControlsProps> = ({
  isMuted,
  isEndSessionDisabled,
  onEndSessionClick,
  onMuteClick,
}) => {
  const buttonList = [
    {
      action: onMuteClick,
      isActive: isMuted,
      isDisabled: false,
      leftIcon: isMuted ? <MicOffIcon /> : <MicIcon />,
      show: true,
      text: isMuted ? "Unmute" : "Mute",
    },
    {
      action: onEndSessionClick,
      isActive: false,
      isDisabled: isEndSessionDisabled,
      leftIcon: <StopIcon />,
      show: true,
      text: "End session",
    },
  ];
  return <ButtonGroup buttonList={buttonList} />;
};

export default SimulationControls;
