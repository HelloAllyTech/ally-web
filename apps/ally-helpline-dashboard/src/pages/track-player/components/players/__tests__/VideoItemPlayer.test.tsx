import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
