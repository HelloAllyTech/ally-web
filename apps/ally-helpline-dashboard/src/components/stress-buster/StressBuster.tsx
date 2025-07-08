import { FunctionComponent, useState, useRef, useEffect } from "react";
import { X, Play, Pause, Volume2, Minimize, Maximize, VolumeOff } from "lucide-react";
import { Modal } from "@mui/material";
import { MindfullnessVideo } from "@/assets/videos";
import { BackgroundBottom, BackgroundTop } from "@/assets/icons";

import { StressBusterProps } from "./types";
import { Button } from "..";

const StressBuster: FunctionComponent<StressBusterProps> = ({
  isFullScreenMode,
  onClose,
  closeIcon,
  playOnMount = false,
  showViewSummaryButton = false,
  onViewSummary,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isMaximized, setIsMaximized] = useState(isFullScreenMode);
  const [seconds, setSeconds] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

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

  const getSizingIcon = () => {
    if (closeIcon) return closeIcon;
    if (isFullScreenMode) {
      return <X />;
    }
    return isMaximized ? <Minimize /> : <Maximize />;
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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  const steps = [
    { label: "Inhale", duration: "4s" },
    { label: "Hold", duration: "4s" },
    { label: "Exhale", duration: "4s" },
    { label: "Hold", duration: "4s" },
  ];

  const renderGradient = () => {
    return (
      <>
        <BackgroundTop className="absolute top-0 right-0 z-0 h-[70%]" />
        <BackgroundBottom className="absolute bottom-0 left-0 z-0 h-[70%]" />
      </>
    );
  };

  const renderVideo = () => {
    return (
      <div className={`w-[full] ${isMaximized ? "my-8 h-[45%]" : "h-[40%]"}`}>
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

  const renderSteps = () => {
    return (
      <div className="flex gap-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 text-[16px] font-['IBM_Plex_Serif']"
          >
            <span>{step.label}</span>
            <span>{step.duration}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderControls = () => {
    return (
      <div className="flex gap-4 mt-[30px]">
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer z-10"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer z-10"
        >
          {isMuted ? <VolumeOff size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    );
  };

  const renderNavigationButton = () => {
    return (
      <div className="z-20">
        {showViewSummaryButton && isMaximized && (
          <Button className="mt-8 rounded-full" onClick={onViewSummary}>
            Skip
          </Button>
        )}
      </div>
    );
  };

  const StressBusterComponent = (
    <div className="w-full h-full flex justify-center items-center relative">
      <div
        className={`w-full h-full flex-1 bg-[#000] flex 
            flex-col justify-center items-center text-white ${isMaximized ? "p-16" : "p-4"}`}
      >
        {renderGradient()}
        <div
          className={`absolute top-0 right-0 z-10 cursor-pointer ${isMaximized ? "p-8" : "p-4"}`}
          onClick={isMaximized && onClose ? onClose : toggleMaximize}
        >
          {getSizingIcon()}
        </div>

        {renderVideo()}

        <div className={`${isMaximized ? "text-[56px]" : "text-2xl"} mb-4`}>{seconds}</div>

        {renderSteps()}
        {renderControls()}
        {renderNavigationButton()}
      </div>
    </div>
  );

  return isMaximized ? <Modal open>{StressBusterComponent}</Modal> : StressBusterComponent;
};

export default StressBuster;
