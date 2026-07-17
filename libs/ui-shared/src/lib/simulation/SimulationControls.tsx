"use client";

import { FC } from "react";

import { Loading } from "@carbon/react";

import { MicOff, MicOn, Stop, Focus, Pause, Play } from "@ally-ui-mono/ui-shared/assets";

import { SimulationControlsProps } from "./types";
import ButtonGroup from "../button-group";

export const SimulationControls: FC<SimulationControlsProps> = ({
  isMuted,
  isFocusMode,
  isEndingSession,
  showFocusButton,
  isPaused = false,
  onEndSessionClick,
  onMuteClick,
  onFocusButtonClick,
  onPauseClick,
  translations,
}) => {
  const buttonList = [
    {
      action: onMuteClick,
      isActive: isMuted,
      // Pause is a superset of mute — disable mic toggle while paused.
      isDisabled: isEndingSession || isPaused,
      leftIcon: isMuted ? <MicOff /> : <MicOn />,
      show: true,
      text: isMuted ? (translations?.unmute ?? "Unmute") : (translations?.mute ?? "Mute"),
      testId: "simulation-controls-mute-button",
    },
    {
      action: onFocusButtonClick,
      isActive: isFocusMode,
      isDisabled: isEndingSession || isPaused,
      leftIcon: <Focus className={isFocusMode ? "" : "[&_path]:fill-[#FFFFFF]"} />,
      show: showFocusButton,
      text: isFocusMode ? (translations?.focused ?? "Focused") : (translations?.focus ?? "Focus"),
      testId: "simulation-controls-focus-button",
    },
    {
      action: onPauseClick ?? (() => {}),
      isActive: isPaused,
      isDisabled: isEndingSession,
      // Size + contrast controlled via CSS (robust against SVG/SVGR caching):
      // white icon on the dark inactive button, dark icon on the light active
      // (paused) button — matching the Focus button.
      leftIcon: isPaused ? (
        <Play className="w-[18px] h-[18px] [&_path]:fill-[#1E2025]" />
      ) : (
        <Pause className="w-[18px] h-[18px] [&_path]:fill-[#FFFFFF]" />
      ),
      show: Boolean(onPauseClick),
      text: isPaused ? (translations?.resume ?? "Resume") : (translations?.pause ?? "Pause"),
      testId: "simulation-controls-pause-button",
    },
    {
      action: onEndSessionClick,
      isActive: false,
      isDisabled: isEndingSession,
      leftIcon: isEndingSession ? <Loading withOverlay={false} small /> : <Stop />,
      className: "hover:!bg-[#7e7e7e]",
      show: true,
      text: translations?.endSession ?? "End session",
      testId: "simulation-controls-end-session-button",
    },
  ];
  return <ButtonGroup data-testid="simulation-controls" buttonList={buttonList} />;
};
