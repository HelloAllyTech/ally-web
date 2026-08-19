import { useState, useRef, useEffect, useCallback } from "react";

export const PLAYBACK_RATE_STORAGE_KEY = "ally-audio-playback-rate";
export const PLAYBACK_RATES = [1, 1.5, 2, 2.5] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

const getStoredPlaybackRate = (): PlaybackRate => {
  if (typeof window === "undefined") return 1;
  const stored = window.localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return (PLAYBACK_RATES as readonly number[]).includes(parsed) ? (parsed as PlaybackRate) : 1;
};

interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  playbackRate: PlaybackRate;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  handleTimeUpdate: () => void;
  handleLoadedMetadata: () => void;
  handleEnded: () => void;
  handleProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  seekToFraction: (fraction: number) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState<PlaybackRate>(getStoredPlaybackRate);
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

  // Applies immediately, including mid-playback.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    setPlaybackRateState(rate);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(rate));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      setDuration(Number.isFinite(duration) ? duration : 0);
      // The underlying <audio> element is remounted when its `src` changes
      // (parent keys it by audioUrl), which resets playbackRate to 1.
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

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
    playbackRate,
    togglePlay,
    seekTo,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleProgressClick,
    seekToFraction,
    setPlaybackRate,
  };
};
