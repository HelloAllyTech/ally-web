"use client";

import React, { useCallback, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Maximum gap (seconds) between two time samples that still counts as
 * continuous playback. Larger jumps are treated as seeks and are NOT
 * credited as watched time.
 */
const MAX_PLAYBACK_STEP_SECONDS = 2;

export interface ProgressVideoPlayerProgress {
  /** 0-100, computed from UNIQUE watched seconds (seek-ahead doesn't count). */
  watchedPct: number;
  /** Current playhead position in seconds. */
  position: number;
}

export interface ProgressVideoPlayerProps {
  src: string;
  className?: string;
  /** Poster image shown before playback. */
  poster?: string;
  /**
   * Called on every progress sample (timeupdate/pause/end) with the
   * percentage of unique seconds watched. Throttle reporting upstream.
   */
  onProgress?: (progress: ProgressVideoPlayerProgress) => void;
  /** Fired when playback pauses or ends — a good moment to flush reports. */
  onPauseOrEnd?: (progress: ProgressVideoPlayerProgress) => void;
  /** Known duration (seconds) fallback when metadata hasn't loaded yet. */
  durationSeconds?: number;
}

/** Imperative controls exposed via `ref`, for callers that need to drive
 * playback from the outside (e.g. hard-pausing at a video interjection). */
export interface ProgressVideoPlayerHandle {
  pause: () => void;
  play: () => void;
  seek: (seconds: number) => void;
}

/**
 * HTML5 video player with native controls that tracks UNIQUE watched
 * seconds: each integer second of the timeline is only counted once, and
 * seeking ahead does not credit the skipped span. Used by the Track 2.0
 * learner video player and admin previews.
 */
export const ProgressVideoPlayer = React.forwardRef<
  ProgressVideoPlayerHandle,
  ProgressVideoPlayerProps
>(({ src, className = "", poster, onProgress, onPauseOrEnd, durationSeconds }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchedSecondsRef = useRef<Set<number>>(new Set());
  const lastSampleRef = useRef<number | null>(null);

  const computeProgress = useCallback((): ProgressVideoPlayerProgress => {
    const video = videoRef.current;
    const duration =
      video && Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : durationSeconds || 0;
    const unique = watchedSecondsRef.current.size;
    const watchedPct =
      duration > 0 ? Math.min(100, Math.round((unique / Math.floor(duration)) * 100)) : 0;
    return { watchedPct, position: video?.currentTime ?? 0 };
  }, [durationSeconds]);

  const sample = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.seeking) return;
    const time = video.currentTime;
    const last = lastSampleRef.current;
    if (last !== null && time > last && time - last <= MAX_PLAYBACK_STEP_SECONDS) {
      // Continuous playback: credit every integer second crossed.
      for (let s = Math.floor(last); s < Math.floor(time); s++) {
        watchedSecondsRef.current.add(s);
      }
      // Credit the second currently being played.
      watchedSecondsRef.current.add(Math.floor(time));
    }
    lastSampleRef.current = time;
  }, []);

  useEffect(() => {
    // Reset tracking when the source changes.
    watchedSecondsRef.current = new Set();
    lastSampleRef.current = null;
  }, [src]);

  const handleTimeUpdate = () => {
    sample();
    onProgress?.(computeProgress());
  };

  const handleSeeked = () => {
    // Re-anchor after a seek so the jumped span is not credited.
    lastSampleRef.current = videoRef.current?.currentTime ?? null;
  };

  const handlePauseOrEnd = () => {
    sample();
    const progress = computeProgress();
    onProgress?.(progress);
    onPauseOrEnd?.(progress);
  };

  useImperativeHandle(
    ref,
    () => ({
      pause: () => videoRef.current?.pause(),
      play: () => {
        const video = videoRef.current;
        if (!video) return;
        video.play().catch(() => {
          // Autoplay/interruption rejections are expected when a fast
          // Continue click races a pending pause — nothing to surface.
        });
      },
      seek: (seconds: number) => {
        const video = videoRef.current;
        if (video) video.currentTime = seconds;
      },
    }),
    [],
  );

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      controls
      controlsList="nodownload"
      playsInline
      preload="metadata"
      className={`w-full h-full bg-black ${className}`}
      onTimeUpdate={handleTimeUpdate}
      onSeeked={handleSeeked}
      onPause={handlePauseOrEnd}
      onEnded={handlePauseOrEnd}
      data-testid="progress-video-player"
    />
  );
});

ProgressVideoPlayer.displayName = "ProgressVideoPlayer";

export default ProgressVideoPlayer;
