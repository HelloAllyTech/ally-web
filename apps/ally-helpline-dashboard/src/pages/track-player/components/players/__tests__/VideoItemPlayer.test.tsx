import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VideoItemPlayer } from "../VideoItemPlayer";
import { StartVideoItemPayload, TrackItemType } from "../../../../../types/tracks";

const buildPayload = (requiredWatchPct: number): StartVideoItemPayload => ({
  type: TrackItemType.VIDEO,
  trackItemProgressId: "progress-1",
  source: "s3",
  url: "https://example.com/video.mp4",
  durationSeconds: 300,
  requiredWatchPct,
  maxWatchedPct: 0,
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
  it("renders the required watch percentage as-is, not multiplied by 100", () => {
    render(
      <VideoItemPlayer
        payload={buildPayload(70)}
        itemId="item-1"
        trackId="track-1"
        alreadyCompleted={false}
      />,
    );

    expect(screen.getByText("Watch 70% to continue")).toBeInTheDocument();
    expect(screen.queryByText(/7000%/)).not.toBeInTheDocument();
  });

  it("treats a 100% requirement as 100, not 10000", () => {
    render(
      <VideoItemPlayer
        payload={buildPayload(100)}
        itemId="item-1"
        trackId="track-1"
        alreadyCompleted={false}
      />,
    );

    expect(screen.getByText("Watch 100% to continue")).toBeInTheDocument();
  });
});
