
import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@store";
import { TrackPlayer } from "../TrackPlayer";
import * as api from "@api";
import { TrackDetail, TrackItemStatus, TrackItemType } from "@types";

vi.mock("@api", async () => ({
  ...(await vi.importActual<typeof api>("@api")),
  useGetLearnTrackDetailQuery: vi.fn(),
  useStartTrackItemMutation: vi.fn(),
}));

const mockTrackDetail: TrackDetail = {
  id: "track1",
  title: "Test Track",
  description: "Test Track Description",
  coverImageUrl: null,
  status: "IN_PROGRESS",
  totalItems: 1,
  simulationsCount: 0,
  estimatedDurationMinutes: 10,
  enrolled: true,
  trackEnrollmentId: "enroll1",
  completedItems: 0,
  completedAt: null,
  sections: [
    {
      id: "section1",
      title: "Test Section",
      description: "Test Section Description",
      order: 1,
      items: [
        {
          id: "item1",
          type: TrackItemType.ARTICLE,
          order: 1,
          title: "Test Item Title",
          description: "Test Item Description",
          scenarioId: null,
          caseId: null,
          completionCriteria: null,
          contentMeta: null,
          status: TrackItemStatus.UNLOCKED,
          startedAt: null,
          completedAt: null,
          score: null,
          attemptCount: null,
          maxWatchedPct: null,
        },
      ],
    },
  ],
};

// RTK Query's trigger returns a thenable carrying `unwrap()` synchronously —
// the player calls `startTrackItem(...).unwrap()`, so the trigger itself must
// not be a bare promise or the item falls into its load-error state.
const mockStartTrackItemMutation = [
  vi.fn().mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({
      type: TrackItemType.ARTICLE,
      html: "<p>Hello</p>",
    }),
  }),
];

describe("TrackPlayer", () => {
  it("shows the item title and description in the header without hiding the player footer", async () => {
    (api.useGetLearnTrackDetailQuery as vi.Mock).mockReturnValue({
      data: mockTrackDetail,
      isError: false,
      refetch: vi.fn(),
    });
    (api.useStartTrackItemMutation as vi.Mock).mockReturnValue(mockStartTrackItemMutation);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/track/track1/item1"]}>
          <Routes>
            <Route path="/track/:trackId/:itemId" element={<TrackPlayer />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Test Item Title" })).toBeInTheDocument();
    expect(screen.getByText("Test Item Description")).toBeInTheDocument();
    // The section title stays as the eyebrow above the item title.
    expect(screen.getByText("Test Section")).toBeInTheDocument();

    // The header must not displace the player: the article's bottom bar
    // (its completion control) is still rendered once the item loads. jsdom
    // has no scroll extent, so the short-article path makes it "Mark as read".
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Mark as read" })).toBeInTheDocument(),
    );
  });
});
