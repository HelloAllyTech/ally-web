import { FunctionComponent, useState, useRef, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  Minimize,
  Maximize,
  VolumeOff,
} from "lucide-react";
import { Modal } from "@mui/material";
import { MindfullnessVideo } from "@/assets/videos";
import { BackgroundBottom, BackgroundTop } from "@/assets/icons";

import { StressBusterProps } from "./types";

const StressBuster: FunctionComponent<StressBusterProps> = ({
  isFullScreenMode,
  onClose,
  children,
  closeIcon,
  playOnMount = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
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
        timerRef.current = setInterval(() => {
          setSeconds((prev) => (prev === 4 ? 1 : prev + 1));
        }, 1000);
      }
      setIsPlaying((prev) => !prev);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted((prev) => !prev);
    }
  };

  const getSizingIcon = () => {
    if (closeIcon) return closeIcon;
    if (isFullScreenMode) {
      return <X />;
    }
    return isMaximized ? <Maximize /> : <Minimize />;
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
    setIsMaximized((prev) => !prev);
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
      timerRef.current = setInterval(() => {
        setSeconds((prev) => (prev === 4 ? 1 : prev + 1));
      }, 1000);
    }
  };

  const StressBusterComponent = (
    <div className="w-full h-full flex justify-center items-center relative">
      <div
        className={`w-full h-full flex-1 bg-[#110924] flex 
            flex-col justify-center items-center text-white ${isMaximized ? "p-16" : "p-4"}`}
      >
        <div className={"text-xs p-4 mb-auto bg-white/10 rounded-lg"}>
          AI suggests Box Breathing to help reduce stress
        </div>
        <BackgroundTop className="absolute top-0 right-0 z-0 h-[70%]" />
        <BackgroundBottom className="absolute bottom-0 left-0 z-0 h-[70%]" />
        <div
          className={`absolute top-0 right-0 z-10 cursor-pointer ${isMaximized ? "p-8" : "p-4"}`}
          onClick={isMaximized && onClose ? onClose : toggleMaximize}
        >
          {getSizingIcon()}
        </div>

        <div className={`w-[full] ${isMaximized ? "my-8 h-[55%]" : "h-[45%]"}`}>
          <video
            loop
            ref={videoRef}
            preload="auto"
            src={MindfullnessVideo}
            autoPlay={playOnMount}
            onLoadedData={onVideoLoaded}
            className="w-full h-full object-cover bg-transparent mix-blend-screen"
          />
        </div>

        <div className={`${isMaximized ? "text-4xl mx-" : "text-2xl"} my-4`}>
          {seconds}
        </div>

        <div className="flex gap-4 mb-auto">
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

        <div className="flex gap-8">
          {[
            { label: "Inhale", duration: "4s" },
            { label: "Hold", duration: "4s" },
            { label: "Exhale", duration: "4s" },
            { label: "Hold", duration: "4s" },
          ].map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 text-xs"
            >
              <span>{step.label}</span>
              <span>{step.duration}</span>
            </div>
          ))}
        </div>
        <div className="z-20">{children}</div>
      </div>
    </div>
  );

  return isMaximized ? (
    <Modal open>{StressBusterComponent}</Modal>
  ) : (
    StressBusterComponent
  );
};

export default StressBuster;
