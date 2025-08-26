import { FC, useState, useRef, useEffect } from "react";

import { Modal } from "@mui/material";
import { X, Minimize, Maximize } from "lucide-react";

import {
  BoxBreathingBottomGradient,
  BoxBreathingTopGradient,
  MindfullnessVideo,
  PauseIcon,
  PlayIcon,
  VolumeOffIcon,
  VolumeUpIcon,
} from "@assets";
import { Button, ButtonVariant } from "@components";
import { getKeyFromIndex } from "@utils";

import { BOX_BREATHING_STEPS } from "./constants";
import { BoxBreathingProps } from "./types";

const BoxBreathing: FC<BoxBreathingProps> = ({
  closeIcon,
  isFullScreenMode,
  onClose,
  onViewSummary,
  playOnMount = false,
  showViewSummaryButton = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState(isFullScreenMode);
  const [seconds, setSeconds] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      } else {
        videoRef.current.play();
        videoRef.current.muted = isMuted;
        timerRef.current = setInterval(() => {
          setSeconds(prev => (prev === 4 ? 1 : prev + 1));
        }, 1000);
      }
      setIsPlaying(prev => !prev);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(prev => !prev);
    }
  };

  const toggleMaximize = () => {
    if (isFullScreenMode) return;
    // reset
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setSeconds(1);
    setIsPlaying(false);
    setIsMuted(false);
    setIsMaximized(prev => !prev);
  };

  const onVideoLoaded = () => {
    if (playOnMount) {
      setIsPlaying(true);
      videoRef.current?.play();
      videoRef.current.muted = isMuted;
      timerRef.current = setInterval(() => {
        setSeconds(prev => (prev === 4 ? 1 : prev + 1));
      }, 1000);
    }
  };

  const getSizingIcon = () => {
    if (closeIcon) return closeIcon;
    if (isFullScreenMode) {
      return <X />;
    }
    return isMaximized ? <Minimize /> : <Maximize />;
  };

  const renderVideo = () => {
    return (
      <div className={`${isMaximized ? "h-[45%]" : "h-[40%]"}`}>
        <video
          loop
          ref={videoRef}
          preload="auto"
          src={MindfullnessVideo}
          autoPlay={playOnMount}
          onLoadedData={onVideoLoaded}
          className="h-full object-cover bg-transparent mix-blend-screen"
        />
      </div>
    );
  };

  const BoxBreathingComponent = (
    <div
      className={`w-full h-full bg-[#000] flex flex-col justify-center items-center relative font-['IBM_Plex_Serif'] text-white ${isMaximized ? "p-16 gap-6" : "p-4 gap-3"}`}
    >
      <BoxBreathingTopGradient className="absolute right-0 z-0 h-full" />
      <BoxBreathingBottomGradient className="absolute bottom-0 left-0 z-0 h-[70%]" />

      <div
        className={`absolute top-0 right-0 z-10 cursor-pointer ${isMaximized ? "p-8" : "p-4"}`}
        onClick={isMaximized && onClose ? onClose : toggleMaximize}
      >
        {getSizingIcon()}
      </div>

      <span className="text-2xl z-10">Return to self</span>
      {/* Box breathing video */}
      {renderVideo()}

      <div className={`${isMaximized ? "text-[56px]" : "text-2xl"} font-['Roboto'] z-10`}>
        {seconds}
      </div>

      {/* Box Breathing Steps */}
      <div className="flex gap-6 z-10">
        {BOX_BREATHING_STEPS.map((step, index) => (
          <div key={getKeyFromIndex(index, "step")} className="flex flex-col items-center">
            <span>{step.label}</span>
            <span>{step.duration}</span>
          </div>
        ))}
      </div>

      {/* Box breathing controls */}
      <div className="flex gap-4 z-10">
        <Button
          onClick={togglePlay}
          className="bg-white/10 hover:bg-white/20 transition-colors z-10"
          variant={ButtonVariant.ICON}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button
          onClick={toggleMute}
          className="bg-white/10 hover:bg-white/20 transition-colors z-10"
          variant={ButtonVariant.ICON}
        >
          {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </Button>
      </div>

      {showViewSummaryButton && isMaximized && (
        <Button className="z-10" onClick={onViewSummary}>
          View Call Summary
        </Button>
      )}
    </div>
  );

  return isMaximized ? <Modal open>{BoxBreathingComponent}</Modal> : BoxBreathingComponent;
};

export default BoxBreathing;
