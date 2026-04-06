import { useState, useRef, useEffect, useCallback } from "react";

interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  handleEnded: () => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  seekToFraction: (fraction: number) => void;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      setDuration(Number.isFinite(duration) ? duration : 0);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const seekTo = useCallback(
    (time: number) => {
      if (!audioRef.current) return;
      const maxT = Number.isFinite(duration) && duration > 0 ? duration : undefined;
      const clamped = maxT !== undefined ? Math.max(0, Math.min(time, maxT)) : Math.max(0, time);
      audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration],
  );

  const seekToFraction = useCallback(
    (fraction: number) => {
      if (!audioRef.current || !Number.isFinite(duration) || duration <= 0) return;
      const clamped = Math.max(0, Math.min(1, fraction));
      const newTime = clamped * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration],
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const w = rect.width;
      if (w <= 0) return;
      const x = e.clientX - rect.left;
      seekToFraction(x / w);
    },
    [seekToFraction],
  );

  const progress =
    Number.isFinite(duration) && duration > 0 && Number.isFinite(currentTime)
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    seekTo,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleProgressClick,
    seekToFraction,
  };
};
