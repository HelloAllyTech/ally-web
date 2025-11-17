"use client";

import { useState, useRef, useEffect } from "react";

import { Pause, Play, VolumeMute, VolumeUp } from "../../assets";

interface CustomVideoProps {
  src: string;
  alt?: string;
  className?: string;
  poster?: string;
  loop?: boolean;
  autoPlay?: boolean;
}

export const CustomVideo = ({
  src,
  alt,
  className = "",
  poster,
  loop,
  autoPlay = false,
}: CustomVideoProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && autoPlay) {
      setIsPlaying(true);
      videoRef.current.play();
    }
  }, [src, autoPlay]);

  const handleToggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  const handleTogglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div
      className={`w-full h-full ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        muted={isMuted}
        loop={loop}
        playsInline
        poster={poster}
        aria-label={alt}
      />

      {isHovered && (
        <>
          <button
            type="button"
            onClick={handleTogglePlayPause}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-4 transition-all duration-200 flex items-center justify-center w-16 h-16"
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="absolute bottom-4 right-4 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-2 transition-all duration-200 flex items-center justify-center w-10 h-10"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? <VolumeMute /> : <VolumeUp />}
          </button>
        </>
      )}
    </div>
  );
};
