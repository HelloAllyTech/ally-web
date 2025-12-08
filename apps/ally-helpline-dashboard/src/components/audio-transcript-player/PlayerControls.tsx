import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  progress,
  onTogglePlay,
  onSkip,
  onProgressClick,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 sticky top-6 z-10">
    <div className="flex items-center gap-4">
      <button
        onClick={() => onSkip(-10)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Rewind 10s"
      >
        <RotateCcw className="w-5 h-5" />
        <span className="sr-only">Rewind 10s</span>
      </button>

      <button
        onClick={onTogglePlay}
        className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 hover:bg-brand-200 transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" strokeWidth={3} />
        ) : (
          <Play className="w-5 h-5 ml-0.5" strokeWidth={3} />
        )}
      </button>

      <button
        onClick={() => onSkip(10)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Forward 10s"
      >
        <RotateCw className="w-5 h-5" />
        <span className="sr-only">Forward 10s</span>
      </button>

      <span className="text-sm font-mono text-gray-500 min-w-[48px] text-right">
        {formatTime(currentTime)}
      </span>

      <div
        className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer overflow-hidden"
        onClick={onProgressClick}
      >
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="text-sm font-mono text-gray-500 min-w-[48px]">{formatTime(duration)}</span>
    </div>
  </div>
);
