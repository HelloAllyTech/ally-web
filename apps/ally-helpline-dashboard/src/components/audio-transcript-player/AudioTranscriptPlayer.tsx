import React, { useEffect, useRef, useMemo, useCallback } from "react";

import { PlayerControls } from "./PlayerControls";
import { TranscriptItemRow } from "./TranscriptItemRow";
import { useAudioPlayer } from "./useAudioPlayer";

export interface TranscriptItem {
  id: number;
  content: string;
  senderId: number;
  startSeconds: number;
  endSeconds: number | null;
}

export interface AudioTranscriptPlayerProps {
  audioUrl: string;
  transcript: TranscriptItem[];
  senderLabels?: Record<number, string>;
  onNearEnd?: () => void;
  nearEndThreshold?: number;
  isLoading?: boolean;
}

export const AudioTranscriptPlayer: React.FC<AudioTranscriptPlayerProps> = ({
  audioUrl,
  transcript,
  senderLabels = { [-1]: "User", [101]: "Agent" },
  onNearEnd,
  nearEndThreshold = 3,
  isLoading = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    skip,
    seekTo,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleProgressClick,
  } = useAudioPlayer();

  // Sort transcript by startSeconds for proper display
  const sortedTranscript = useMemo(
    () => [...transcript].sort((a, b) => a.startSeconds - b.startSeconds),
    [transcript],
  );

  // Find active segment index based on currentTime
  const activeIndex = useMemo(() => {
    for (let i = sortedTranscript.length - 1; i >= 0; i--) {
      if (currentTime >= sortedTranscript[i].startSeconds) {
        return i;
      }
    }
    return -1;
  }, [currentTime, sortedTranscript]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && scrollContainerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  // Trigger onNearEnd callback when active item is near the end of the list
  useEffect(() => {
    if (
      onNearEnd &&
      !isLoading &&
      activeIndex >= 0 &&
      sortedTranscript.length > 0 &&
      activeIndex >= sortedTranscript.length - nearEndThreshold
    ) {
      onNearEnd();
    }
  }, [activeIndex, isLoading, sortedTranscript, nearEndThreshold, onNearEnd]);

  const getSenderLabel = useCallback(
    (senderId: number): string => senderLabels[senderId] || `Speaker ${senderId}`,
    [senderLabels],
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <audio
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
        onSkip={skip}
        onProgressClick={handleProgressClick}
      />

      <div className="bg-white overflow-hidden flex flex-col max-h-[60vh]">
        <div ref={scrollContainerRef} className="overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-6">
            {sortedTranscript.map((item, index) => {
              const isActive = index === activeIndex;
              const isPast = activeIndex > index;

              return (
                <TranscriptItemRow
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  isPast={isPast}
                  senderLabel={getSenderLabel(item.senderId)}
                  onSeek={seekTo}
                  activeRef={isActive ? activeSegmentRef : null}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
