
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
  useSubmitQuizAttemptMutation: vi.fn(),
  useGetCourseDiscussionQuery: vi.fn(),
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

  it("shows the discussion thread below the content when hasDiscussion is true", async () => {
    const mockTrackWithDiscussion = {
      ...mockTrackDetail,
      sections: [
        {
          ...mockTrackDetail.sections[0],
          items: [{ ...mockTrackDetail.sections[0].items[0], hasDiscussion: true }],
        },
      ],
    };
    (api.useGetLearnTrackDetailQuery as vi.Mock).mockReturnValue({
      data: mockTrackWithDiscussion,
      isError: false,
      refetch: vi.fn(),
    });
    (api.useStartTrackItemMutation as vi.Mock).mockReturnValue(mockStartTrackItemMutation);
    (api.useGetCourseDiscussionQuery as vi.Mock).mockReturnValue({
      data: {
        enabled: true,
        isLocked: false,
        postCount: 0,
        posts: [],
        viewer: { canPost: true, maxLength: 1000, canModerate: false },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/track/track1/item1"]}>
          <Routes>
            <Route path="/track/:trackId/:itemId" element={<TrackPlayer />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("discussion-thread")).toBeInTheDocument();
    });

    const scrollContainer = screen.getByTestId("track-item-scroll");
    // The bug is that the first child of the scroll container has h-full
    expect(scrollContainer.firstChild).not.toHaveClass("h-full");
  });

  it("defers the track-complete celebration when the last item has a discussion", async () => {
    const mockTrackWithDiscussion = {
      ...mockTrackDetail,
      sections: [
        {
          ...mockTrackDetail.sections[0],
          items: [
            { ...mockTrackDetail.sections[0].items[0], type: TrackItemType.QUIZ, hasDiscussion: true },
          ],
        },
      ],
    };
    (api.useGetLearnTrackDetailQuery as vi.Mock).mockReturnValue({
      data: mockTrackWithDiscussion,
      isError: false,
      refetch: vi.fn(),
    });

    const mockSubmitQuizAttempt = vi.fn().mockResolvedValue({
      passed: true,
      itemCompleted: true,
      unlockedItemIds: [],
      sectionCompleted: true,
      trackCompleted: true,
      attemptsUsed: 1,
    });
    (api.useStartTrackItemMutation as vi.Mock).mockReturnValue([
      vi.fn().mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
          type: TrackItemType.QUIZ,
quiz: {
            id: "q1",
            title: "Test Quiz",
            settings: { passScore: 80 },
            questions: [{ id: "q1-1", type: "true_false", prompt: "Is this a test?" }],
          },
        }),
      }),
    ]);
    (api.useSubmitQuizAttemptMutation as vi.Mock).mockReturnValue([mockSubmitQuizAttempt, { isLoading: false }]);
    (api.useGetCourseDiscussionQuery as vi.Mock).mockReturnValue({
      data: { enabled: true, isLocked: false, postCount: 0, posts: [], viewer: { canPost: true, maxLength: 1000, canModerate: false } },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/track/track1/item1"]}>
          <Routes>
            <Route path="/track/:trackId/:itemId" element={<TrackPlayer />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // 1. Start the quiz
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    });
    screen.getByRole("button", { name: "Start" }).click();

    // 2. Answer the question and submit
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "True" })).toBeInTheDocument();
    });
    screen.getByRole("radio", { name: "True" }).click();
    screen.getByRole("button", { name: "Submit" }).click();

    // 3. The results screen is shown, but NOT the celebration overlay
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Quiz Results" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Course complete!" })).not.toBeInTheDocument();

    // 4. Clicking Next on the results screen triggers the deferred celebration
    screen.getByRole("button", { name: "Next" }).click();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Course complete!" })).toBeInTheDocument();
    });
  });
});
