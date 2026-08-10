import { FC, useEffect, useRef, useState } from "react";

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
  destroy: () => void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: { onReady?: () => void };
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
  const requiredPct = Math.round((payload.requiredWatchPct ?? 0) * 100) || 0;

  const { recordTime, recordPct, flush, watchedPct } = useVideoWatchProgress({
    durationSeconds: payload.durationSeconds,
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

  const renderTrackedControls = () => (
    <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border-light bg-white px-4 py-3">
      <span className="text-xs text-typography-700">
        {completed
          ? t("tracks2.video.watched")
          : t("tracks2.video.watchToUnlock", { pct: requiredPct })}
      </span>
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

  if (payload.source === "s3") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
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
    return (
      <YouTubeVideo url={payload.url} onTime={recordTime} controls={renderTrackedControls()} />
    );
  }

  if (payload.source === "vimeo") {
    return <VimeoVideo url={payload.url} onTime={recordTime} controls={renderTrackedControls()} />;
  }

  // loom / unknown — no reliable time API; foreground timer + explicit button.
  return (
    <ManualVideo
      url={payload.url}
      requiredPct={requiredPct}
      completed={completed}
      onTick={recordTime}
      onMarkWatched={() => {
        recordPct(100);
        flush();
      }}
      meetsRequirement={meetsRequirement}
    />
  );
};

// --- YouTube ---------------------------------------------------------------

const YouTubeVideo: FC<{
  url: string;
  onTime: (t: number) => void;
  controls: React.ReactNode;
}> = ({ url, onTime, controls }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;

  useEffect(() => {
    const id = youtubeId(url);
    const host = hostRef.current;
    if (!id || !host) return undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let destroyed = false;

    loadYouTubeApi().then(YT => {
      if (destroyed || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: id,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            poll = setInterval(() => {
              const time = playerRef.current?.getCurrentTime?.();
              if (typeof time === "number") onTimeRef.current(time);
            }, 1000);
          },
        },
      });
    });

    return () => {
      destroyed = true;
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
  controls: React.ReactNode;
}> = ({ url, onTime, controls }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    // `id` accepts a full video URL (VideoId = string | number | VimeoUrl).
    const player = new Vimeo(host, { id: url, responsive: true });
    const handler = (data: { seconds: number }) => onTimeRef.current(data.seconds);
    player.on("timeupdate", handler);
    return () => {
      player.off("timeupdate", handler);
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
  requiredPct: number;
  completed: boolean;
  onTick: (t: number) => void;
  onMarkWatched: () => void;
  meetsRequirement: boolean;
}> = ({ url, requiredPct, completed, onTick, onMarkWatched, meetsRequirement }) => {
  const { t } = useTranslation();
  const elapsedRef = useRef(0);

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
          />
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border-light bg-white px-4 py-3">
        <span className="text-xs text-typography-700">
          {completed
            ? t("tracks2.video.watched")
            : t("tracks2.video.watchToUnlock", { pct: requiredPct })}
        </span>
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
