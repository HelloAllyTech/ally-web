import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VideoItemPlayer } from "../VideoItemPlayer";
import { StartVideoItemPayload, TrackItemType } from "../../../../../types/tracks";

const buildPayload = (requiredWatchPct: number, maxWatchedPct = 0): StartVideoItemPayload => ({
  type: TrackItemType.VIDEO,
  trackItemProgressId: "progress-1",
  // "loom" hits the ManualVideo branch, whose "Mark as watched" button is
  // the only remaining UI gated on requiredPct now that the "Watch X% to
  // continue" label has been removed.
  source: "loom",
  url: "https://example.com/video.mp4",
  durationSeconds: 300,
  requiredWatchPct,
  maxWatchedPct,
});

vi.mock("@assets", () => ({
  TickGreenBackground: () => <span data-testid="tick-icon" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  ProgressVideoPlayer: () => <div data-testid="progress-video-player" />,
}));

vi.mock("@api", () => ({
  useReportVideoProgressMutation: () => [vi.fn()],
}));

// The real `@hooks` barrel re-exports every hook in the app (including ones
// that pull in `@constants` → `@assets` for unrelated carousel images), which
// blows up under the narrow `@assets` mock above. Only `useVideoWatchProgress`
// is actually used by VideoItemPlayer, so re-export just that one, for real.
vi.mock("@hooks", async () => {
  const actual = await vi.importActual<typeof import("../../../../../hooks/useVideoWatchProgress")>(
    "../../../../../hooks/useVideoWatchProgress",
  );
  return { useVideoWatchProgress: actual.useVideoWatchProgress };
});

describe("VideoItemPlayer", () => {
  it("does not display a 'Watch X% to continue' label", () => {
    render(
      <VideoItemPlayer
        payload={buildPayload(70)}
        itemId="item-1"
        trackId="track-1"
        alreadyCompleted={false}
      />,
    );

    expect(screen.queryByText(/Watch \d+% to continue/)).not.toBeInTheDocument();
  });

  it("reads the required watch percentage as-is, not multiplied by 100", () => {
    // 75 >= 70 unlocks "Mark as watched"; a stray *100 (7000) would keep it
    // disabled and this assertion would fail.
    render(
      <VideoItemPlayer
        payload={buildPayload(70, 75)}
        itemId="item-1"
        trackId="track-1"
        alreadyCompleted={false}
      />,
    );

    expect(screen.getByText("Mark as watched")).toBeEnabled();
  });

  it("treats a 100% requirement as 100, not 10000", () => {
    render(
      <VideoItemPlayer
        payload={buildPayload(100, 100)}
        itemId="item-1"
        trackId="track-1"
        alreadyCompleted={false}
      />,
    );

    expect(screen.getByText("Mark as watched")).toBeEnabled();
  });

  it("keeps 'Mark as watched' disabled below the required percentage", () => {
    render(
      <VideoItemPlayer
        payload={buildPayload(70, 50)}
        itemId="item-1"
        trackId="track-1"
        alreadyCompleted={false}
      />,
    );

    expect(screen.getByText("Mark as watched")).toBeDisabled();
  });
});

describe("VideoItemPlayer — YouTube embed with no stored durationSeconds", () => {
  // Regression test: embedded (YouTube/Vimeo) videos are almost never saved
  // with a durationSeconds (the admin editor has no field for it), which
  // used to leave watchedPct permanently stuck at 0 — the player must fall
  // back to the duration the YouTube IFrame API itself reports.
  class MockYTPlayer {
    static instances: MockYTPlayer[] = [];
    currentTime = 0;
    duration: number;
    onReady?: () => void;

    constructor(_el: HTMLElement, opts: { events?: { onReady?: () => void } }, duration: number) {
      this.duration = duration;
      this.onReady = opts.events?.onReady;
      MockYTPlayer.instances.push(this);
    }

    getCurrentTime() {
      return this.currentTime;
    }

    getDuration() {
      return this.duration;
    }

    destroy() {
      // no-op
    }
  }

  beforeEach(() => {
    MockYTPlayer.instances = [];
    (window as unknown as { YT: unknown }).YT = {
      Player: class extends MockYTPlayer {
        constructor(el: HTMLElement, opts: { events?: { onReady?: () => void } }) {
          super(el, opts, 176);
        }
      },
    };
  });

  afterEach(() => {
    delete (window as unknown as { YT?: unknown }).YT;
    vi.useRealTimers();
  });

  it("recovers a nonzero watched percentage from the player's own duration", async () => {
    const payload: StartVideoItemPayload = {
      type: TrackItemType.VIDEO,
      trackItemProgressId: "progress-2",
      source: "youtube",
      url: "https://www.youtube.com/watch?v=abc123",
      durationSeconds: 0,
      requiredWatchPct: 90,
      maxWatchedPct: 0,
    };

    const { container } = render(
      <VideoItemPlayer
        payload={payload}
        itemId="item-2"
        trackId="track-1"
        alreadyCompleted={false}
      />,
    );

    // Let the loadYouTubeApi().then(...) microtask construct the player.
    await act(async () => {
      await Promise.resolve();
    });

    const instance = MockYTPlayer.instances[0];
    expect(instance).toBeDefined();

    vi.useFakeTimers();
    act(() => {
      instance.onReady?.();
    });

    // Simulate watching ~91% of the 176s video via the 1s poll.
    for (let t = 0; t <= 160; t += 1) {
      instance.currentTime = t;
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    const bar = container.querySelector<HTMLDivElement>(".bg-primary-500");
    expect(bar).not.toBeNull();
    // Before the fix this stayed "0%" forever because durationSeconds was
    // undefined, so watchedPctFromSeconds always returned 0.
    expect(bar?.style.width).not.toBe("0%");
    expect(parseInt(bar?.style.width ?? "0", 10)).toBeGreaterThanOrEqual(90);
  });
});
