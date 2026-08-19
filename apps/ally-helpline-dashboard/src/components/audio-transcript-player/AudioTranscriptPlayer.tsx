import React, { FC, useCallback, useEffect } from "react";

import { PlayerControls } from "./PlayerControls";
import { useAudioPlayer } from "./useAudioPlayer";

/** Parent bumps `requestId` each time so seeks to the same `seconds` still run. */
export type AudioTranscriptSeekRequest = {
  seconds: number;
  requestId: number;
};

export interface AudioTranscriptPlayerProps {
  audioUrl: string;
  className?: string;
  seekRequest?: AudioTranscriptSeekRequest | null;
  onSeekSeconds?: (seconds: number) => void;
  onTimeChange?: (seconds: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export const AudioTranscriptPlayer: FC<AudioTranscriptPlayerProps> = ({
  audioUrl,
  className = "",
  seekRequest,
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
    playbackRate,
    togglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    seekToFraction,
    seekTo,
    setPlaybackRate,
  } = useAudioPlayer();

  useEffect(() => {
    if (!seekRequest) return;
    if (!Number.isFinite(seekRequest.seconds)) return;
    seekTo(seekRequest.seconds);
    onSeekSeconds?.(seekRequest.seconds);
  }, [seekRequest?.requestId, seekRequest?.seconds, seekTo, onSeekSeconds]);

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
        playbackRate={playbackRate}
        onTogglePlay={togglePlay}
        onSeekFraction={handleSeekFraction}
        onPlaybackRateChange={setPlaybackRate}
      />
    </div>
  );
};
