import React, { useCallback, useEffect } from "react";

import { PlayerControls } from "./PlayerControls";
import { useAudioPlayer } from "./useAudioPlayer";

export interface AudioTranscriptPlayerProps {
  audioUrl: string;
  className?: string;
  onSeekSeconds?: (seconds: number) => void;
  onTimeChange?: (seconds: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const AudioTranscriptPlayer: React.FC<AudioTranscriptPlayerProps> = ({
  audioUrl,
  className = "",
  onSeekSeconds,
  onTimeChange,
  onPlayStateChange,
}) => {
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    seekToFraction,
  } = useAudioPlayer();

  useEffect(() => {
    onTimeChange?.(currentTime);
  }, [currentTime, onTimeChange]);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const handleSeekFraction = useCallback(
    (fraction: number) => {
      seekToFraction(fraction);
      if (!onSeekSeconds || !Number.isFinite(duration) || duration <= 0) return;
      const clamped = Math.max(0, Math.min(1, fraction));
      onSeekSeconds(clamped * duration);
    },
    [seekToFraction, onSeekSeconds, duration],
  );

  return (
    <div className={["w-full  mx-auto", className].filter(Boolean).join(" ")}>
      <audio
        key={audioUrl}
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        progress={progress}
        onTogglePlay={togglePlay}
        onSeekFraction={handleSeekFraction}
      />
    </div>
  );
};
