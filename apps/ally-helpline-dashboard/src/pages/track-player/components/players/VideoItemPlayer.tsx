import { FC, useCallback, useEffect, useRef, useState } from "react";

import Vimeo from "@vimeo/player";
import { useTranslation } from "react-i18next";

import { ProgressVideoPlayer } from "@ally-ui-mono/ui-shared";
import { useReportVideoProgressMutation } from "@api";
import { TickGreenBackground } from "@assets";
import { useVideoWatchProgress } from "@hooks";
import { StartVideoItemPayload } from "@types";

interface VideoItemPlayerProps {
  payload: StartVideoItemPayload;
  itemId: string;
  trackId: string;
  alreadyCompleted: boolean;
}

/** Minimal shape of the YouTube IFrame API we touch. */
interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: { onReady?: () => void; onError?: () => void };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_API_SRC = "https://www.youtube.com/iframe_api";

/**
 * How long an embed gets to prove itself before we give up on it. Both
 * YouTube's IFrame API and @vimeo/player fire an explicit error event for
 * most failure modes (deleted/private video, embedding disabled), but
 * neither fires anything if the API script itself never loads — an ad
 * blocker, an offline network, or a restrictive CSP all leave onReady and
 * onError equally silent. This timeout is the backstop for that case.
 */
const EMBED_READY_TIMEOUT_MS = 15000;

const loadYouTubeApi = (): Promise<YTNamespace> =>
  new Promise(resolve => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const existing = document.querySelector(`script[src="${YT_API_SRC}"]`);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    if (!existing) {
      const script = document.createElement("script");
      script.src = YT_API_SRC;
      document.head.appendChild(script);
    }
  });

/** Extracts the YouTube video id from any common URL form. */
const youtubeId = (url: string): string | null => {
  const patterns = [/[?&]v=([^&]+)/, /youtu\.be\/([^?&]+)/, /embed\/([^?&]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

/**
 * Video item player. Uses the shared ProgressVideoPlayer for S3 sources,
 * the YouTube IFrame API / @vimeo/player with 1s polling for those hosts,
 * and a foreground timer + explicit "Mark as watched" for loom/unknown.
 * All watch accounting flows through useVideoWatchProgress (throttled report).
 *
 * Every source can fail to load (expired S3 signature, deleted YouTube/Vimeo
 * video, a dead Loom link) and none of the embeds surfaced that before — a
 * broken video was just a black box forever, and when requiredWatchPct
 * gated progression there was no way out. Once a failure is detected
 * (`playbackError`), the broken embed is replaced with a fallback offering
 * "open externally" and a manual "mark as watched" escape hatch — never a
 * fake timer standing in for real playback.
 */
export const VideoItemPlayer: FC<VideoItemPlayerProps> = ({
  payload,
  itemId,
  trackId,
  alreadyCompleted,
}) => {
  const { t } = useTranslation();
  const [reportVideoProgress] = useReportVideoProgressMutation();
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [playbackError, setPlaybackError] = useState(false);
  const requiredPct = Math.round(payload.requiredWatchPct ?? 0);
  // YouTube/Vimeo embeds rarely have a stored durationSeconds (the admin
  // editor has no way to set one) — prefer the real duration the player
  // itself reports once ready, falling back to the stored value until then.
  const [duration, setDuration] = useState(payload.durationSeconds ?? 0);

  const { recordTime, recordPct, flush, watchedPct } = useVideoWatchProgress({
    durationSeconds: duration,
    initialMaxWatchedPct: payload.maxWatchedPct ?? 0,
    disabled: completed,
    onReport: async pct => {
      try {
        const result = await reportVideoProgress({
          itemId,
          trackId,
          watchedPct: pct,
        }).unwrap();
        if (result.completed) setCompleted(true);
      } catch {
        // Monotonic server-side; a dropped report is recovered by the next.
      }
    },
  });

  // Flush on unmount so the final position is persisted.
  useEffect(() => () => flush(), [flush]);

  const meetsRequirement = watchedPct >= requiredPct;

  const markWatchedManually = useCallback(() => {
    recordPct(100);
    flush();
  }, [recordPct, flush]);

  const handlePlaybackError = useCallback(() => setPlaybackError(true), []);

  // The S3 path renders the shared <video>-backed ProgressVideoPlayer, which
  // exposes no onError prop. A native media element's "error" event doesn't
  // bubble, but capturing on an ancestor still sees it on the way down, so
  // this needs no change to the shared component.
  const s3ContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (payload.source !== "s3" || playbackError) return undefined;
    const container = s3ContainerRef.current;
    if (!container) return undefined;
    const onError = (event: Event) => {
      if (event.target instanceof HTMLVideoElement) handlePlaybackError();
    };
    container.addEventListener("error", onError, true);
    return () => container.removeEventListener("error", onError, true);
  }, [payload.source, playbackError, handlePlaybackError]);

  const renderTrackedControls = () => (
    <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border-light bg-white px-4 py-3">
      {completed ? (
        <span className="inline-flex items-center gap-2 text-sm font-medium text-success-800">
          <TickGreenBackground className="h-4 w-4" />
          {t("tracks2.video.watched")}
        </span>
      ) : (
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full bg-primary-500 transition-[width] duration-300"
            style={{ width: `${watchedPct}%` }}
          />
        </div>
      )}
    </div>
  );

  const renderPlaybackErrorFallback = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        <div className="aspect-video w-full max-w-3xl">
          <VideoErrorFallback
            url={payload.url}
            completed={completed}
            onMarkWatched={markWatchedManually}
          />
        </div>
      </div>
      {renderTrackedControls()}
    </div>
  );

  if (payload.source === "s3") {
    if (playbackError) return renderPlaybackErrorFallback();
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          ref={s3ContainerRef}
          className="flex min-h-0 flex-1 items-center justify-center bg-black"
        >
          <div className="aspect-video w-full max-w-3xl">
            <ProgressVideoPlayer
              src={payload.url}
              durationSeconds={payload.durationSeconds}
              onProgress={p => recordPct(p.watchedPct)}
              onPauseOrEnd={() => flush()}
            />
          </div>
        </div>
        {renderTrackedControls()}
      </div>
    );
  }

  if (payload.source === "youtube") {
    if (playbackError) return renderPlaybackErrorFallback();
    return (
      <YouTubeVideo
        url={payload.url}
        onTime={recordTime}
        onDuration={setDuration}
        onError={handlePlaybackError}
        controls={renderTrackedControls()}
      />
    );
  }

  if (payload.source === "vimeo") {
    if (playbackError) return renderPlaybackErrorFallback();
    return (
      <VimeoVideo
        url={payload.url}
        onTime={recordTime}
        onDuration={setDuration}
        onError={handlePlaybackError}
        controls={renderTrackedControls()}
      />
    );
  }

  // loom / unknown — no reliable time API; foreground timer + explicit button.
  if (playbackError) return renderPlaybackErrorFallback();
  return (
    <ManualVideo
      url={payload.url}
      completed={completed}
      onTick={recordTime}
      onMarkWatched={markWatchedManually}
      onError={handlePlaybackError}
      meetsRequirement={meetsRequirement}
    />
  );
};

// --- Broken-video fallback ---------------------------------------------

/**
 * Shown in place of a video that failed to load, for every source. Mirrors
 * ally-mobile's VideoFallbackCard: offer to open the raw URL externally, and
 * a manual "mark as watched" escape hatch — deliberately not a fake progress
 * timer standing in for playback that never happened. The mark-watched
 * action is only offered while there's something left to unblock.
 */
const VideoErrorFallback: FC<{
  url: string;
  completed: boolean;
  onMarkWatched: () => void;
}> = ({ url, completed, onMarkWatched }) => {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-white/80">{t("tracks2.video.loadFailed")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          className="rounded-full border border-white/40 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          {t("tracks2.video.openExternally")}
        </button>
        {!completed && (
          <button
            type="button"
            onClick={onMarkWatched}
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            {t("tracks2.video.markWatched")}
          </button>
        )}
      </div>
    </div>
  );
};

// --- YouTube ---------------------------------------------------------------

const YouTubeVideo: FC<{
  url: string;
  onTime: (t: number) => void;
  onDuration: (d: number) => void;
  onError: () => void;
  controls: React.ReactNode;
}> = ({ url, onTime, onDuration, onError, controls }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;
  const onDurationRef = useRef(onDuration);
  onDurationRef.current = onDuration;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const id = youtubeId(url);
    const host = hostRef.current;
    if (!id || !host) {
      // A URL we can't even parse an id from is unplayable — no point
      // waiting out the timeout below.
      onErrorRef.current();
      return undefined;
    }
    let poll: ReturnType<typeof setInterval> | undefined;
    let destroyed = false;

    // Backstop for a script that never loads at all (ad blocker, offline,
    // CSP) — see EMBED_READY_TIMEOUT_MS.
    const readyTimeout = setTimeout(() => {
      if (!destroyed && !playerRef.current) onErrorRef.current();
    }, EMBED_READY_TIMEOUT_MS);

    loadYouTubeApi().then(YT => {
      if (destroyed || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: id,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            // The stored durationSeconds is usually absent for embeds (the
            // admin editor has no field for it) — the player itself is the
            // authoritative source once its metadata has loaded.
            const duration = playerRef.current?.getDuration?.();
            if (typeof duration === "number" && duration > 0) {
              onDurationRef.current(duration);
            }
            poll = setInterval(() => {
              const time = playerRef.current?.getCurrentTime?.();
              if (typeof time === "number") onTimeRef.current(time);
            }, 1000);
          },
          // Fires for a deleted/private video, embedding disabled, etc.
          onError: () => onErrorRef.current(),
        },
      });
    });

    return () => {
      destroyed = true;
      clearTimeout(readyTimeout);
      if (poll) clearInterval(poll);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [url]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        <div className="aspect-video w-full max-w-3xl">
          <div ref={hostRef} className="h-full w-full" />
        </div>
      </div>
      {controls}
    </div>
  );
};

// --- Vimeo -----------------------------------------------------------------

const VimeoVideo: FC<{
  url: string;
  onTime: (t: number) => void;
  onDuration: (d: number) => void;
  onError: () => void;
  controls: React.ReactNode;
}> = ({ url, onTime, onDuration, onError, controls }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;
  const onDurationRef = useRef(onDuration);
  onDurationRef.current = onDuration;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let settled = false;
    // `id` accepts a full video URL (VideoId = string | number | VimeoUrl).
    const player = new Vimeo(host, { id: url, responsive: true });
    // Same reasoning as YouTube: the player's own duration is authoritative
    // since embeds are rarely saved with a stored durationSeconds.
    player
      .getDuration()
      .then(d => {
        settled = true;
        if (typeof d === "number" && d > 0) onDurationRef.current(d);
      })
      .catch(() => onErrorRef.current());
    const timeHandler = (data: { seconds: number }) => onTimeRef.current(data.seconds);
    player.on("timeupdate", timeHandler);
    // Fires for a deleted/private video, embedding disabled, etc.
    const errorHandler = () => onErrorRef.current();
    player.on("error", errorHandler);

    // Backstop for a player that never signals readiness OR an error at all
    // (network-level failure to load player.js/the iframe).
    const readyTimeout = setTimeout(() => {
      if (!settled) onErrorRef.current();
    }, EMBED_READY_TIMEOUT_MS);

    return () => {
      settled = true;
      clearTimeout(readyTimeout);
      player.off("timeupdate", timeHandler);
      player.off("error", errorHandler);
      player.destroy().catch(() => undefined);
    };
  }, [url]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        <div className="aspect-video w-full max-w-3xl">
          <div ref={hostRef} className="h-full w-full" />
        </div>
      </div>
      {controls}
    </div>
  );
};

// --- Manual (loom / unknown) ----------------------------------------------

const ManualVideo: FC<{
  url: string;
  completed: boolean;
  onTick: (t: number) => void;
  onMarkWatched: () => void;
  onError: () => void;
  meetsRequirement: boolean;
}> = ({ url, completed, onTick, onMarkWatched, onError, meetsRequirement }) => {
  const { t } = useTranslation();
  const elapsedRef = useRef(0);
  const loadedRef = useRef(false);

  // Foreground timer: credits watched seconds while the tab is visible.
  useEffect(() => {
    if (completed) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        elapsedRef.current += 1;
        onTick(elapsedRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [completed, onTick]);

  // A third-party embed page (Loom or otherwise) usually still fires `load`
  // even when it renders its own "video not found" page — cross-origin
  // iframes only really surface `error` for a navigation that fails outright
  // (bad host, connection refused). This timeout is the backstop for
  // everything in between: if the frame never finishes loading at all within
  // a reasonable window, treat it the same as a genuine error.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loadedRef.current) onError();
    }, EMBED_READY_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [url, onError]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        <div className="aspect-video w-full max-w-3xl">
          <iframe
            src={url}
            title="video"
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              loadedRef.current = true;
            }}
            onError={onError}
          />
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border-light bg-white px-4 py-3">
        {completed ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-success-800">
            <TickGreenBackground className="h-4 w-4" />
            {t("tracks2.video.watched")}
          </span>
        ) : (
          <button
            onClick={onMarkWatched}
            disabled={!meetsRequirement}
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-40"
          >
            {t("tracks2.video.markWatched")}
          </button>
        )}
      </div>
    </div>
  );
};
