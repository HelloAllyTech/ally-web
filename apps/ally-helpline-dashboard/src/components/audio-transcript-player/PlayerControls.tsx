import { useCallback, useRef, useState } from "react";

import { Pause, Play } from "lucide-react";

import { PLAYBACK_RATES, PlaybackRate } from "./useAudioPlayer";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  playbackRate: PlaybackRate;
  onTogglePlay: () => void;
  onSeekFraction: (fraction: number) => void;
  onPlaybackRateChange: (rate: PlaybackRate) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/** Timestamp for seek hover/drag tooltip (sub-second for scrub feedback). */
const formatSeekTooltip = (seconds: number, durationCap: number): string => {
  const s = Math.max(0, Math.min(seconds, durationCap));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toFixed(2).padStart(5, "0")}`;
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  progress,
  playbackRate,
  onTogglePlay,
  onSeekFraction,
  onPlaybackRateChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canSeek = Number.isFinite(duration) && duration > 0;

  const getFractionFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    if (w <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / w));
  }, []);

  const handleTrackMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canSeek) return;
      setHoverFraction(getFractionFromClientX(e.clientX));
    },
    [canSeek, getFractionFromClientX],
  );

  const handleTrackMouseLeave = useCallback(() => {
    if (!isDragging) setHoverFraction(null);
  }, [isDragging]);

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canSeek) return;
      e.preventDefault();
      const f = getFractionFromClientX(e.clientX);
      onSeekFraction(f);
      setIsDragging(true);
      setHoverFraction(f);

      const onMove = (ev: MouseEvent) => {
        const next = getFractionFromClientX(ev.clientX);
        onSeekFraction(next);
        setHoverFraction(next);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setIsDragging(false);
        setHoverFraction(null);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [canSeek, getFractionFromClientX, onSeekFraction],
  );

  const showSeekHint = canSeek && (hoverFraction !== null || isDragging);
  const showSeekTimestamp = canSeek && hoverFraction !== null && duration > 0;

  const handleCyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    onPlaybackRateChange(nextRate);
  }, [playbackRate, onPlaybackRateChange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 sticky top-6 z-10 w-full min-w-0">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onTogglePlay}
          className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 hover:bg-brand-200 transition-colors"
        >
          {isPlaying ? (
            <div className="bg-primary-50 p-3 rounded-full">
              <Pause className="w-5 h-5 text-primary-500 fill-primary-500" strokeWidth={3} />
            </div>
          ) : (
            <div className="bg-neutral-100 p-3 rounded-full">
              <Play className="w-5 h-5 ml-0.5 text-neutral-700 fill-neutral-700" strokeWidth={3} />
            </div>
          )}
        </button>

        <span className="text-sm font-mono text-gray-500 min-w-[48px] text-right">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 flex items-center min-w-0 py-2 -my-2">
          <div
            ref={trackRef}
            className={`relative w-full h-2.5 rounded-full bg-gray-200 overflow-visible cursor-pointer select-none transition-[box-shadow] ${
              showSeekHint ? "ring-2ring-offset-2 ring-offset-white" : ""
            }`}
            onMouseMove={handleTrackMouseMove}
            onMouseLeave={handleTrackMouseLeave}
            onMouseDown={handleTrackMouseDown}
          >
            <div className="absolute inset-0 rounded-full overflow-hidden">
              {canSeek && hoverFraction !== null && (
                <div
                  className="absolute inset-y-0 left-0 z-[1] rounded-full bg-primary-300/70"
                  style={{ width: `${hoverFraction * 100}%` }}
                />
              )}
              <div
                className={`absolute inset-y-0 left-0 z-[2] rounded-full ${
                  isDragging ? "bg-primary-600" : "bg-primary-500"
                } ${isDragging ? "" : "transition-[width] duration-150 ease-out"}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {canSeek && (
              <div
                className="absolute top-1/2 z-[3] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary-500 shadow-md pointer-events-none transition-[left] duration-150 ease-out"
                style={{ left: `${progress}%` }}
              />
            )}

            {showSeekTimestamp && hoverFraction !== null && (
              <div
                className="absolute z-[4] pointer-events-none -translate-x-1/2 bottom-[calc(100%+10px)] flex flex-col items-center"
                style={{ left: `${hoverFraction * 100}%` }}
              >
                <div className="relative rounded bg-neutral-900 px-2 py-1 text-xs font-mono font-medium text-white shadow-md whitespace-nowrap">
                  {formatSeekTooltip(hoverFraction * duration, duration)}
                </div>
                <div
                  className="h-0 w-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-neutral-900"
                  aria-hidden
                />
              </div>
            )}
          </div>
        </div>

        <span className="text-sm font-mono text-gray-500 min-w-[48px]">{formatTime(duration)}</span>

        <button
          type="button"
          onClick={handleCyclePlaybackRate}
          title="Playback speed"
          aria-label={`Playback speed, currently ${playbackRate}x. Click to change.`}
          className="shrink-0 min-w-[44px] px-2 py-1 rounded-full text-xs font-semibold font-mono text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};
