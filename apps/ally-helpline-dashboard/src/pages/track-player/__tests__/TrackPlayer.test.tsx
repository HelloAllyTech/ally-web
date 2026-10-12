import { vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@store";
import { TrackPlayer } from "../TrackPlayer";
import * as api from "@api";
import { TrackDetail, TrackItemStatus, TrackItemType } from "@types";

// The quiz player fires confetti on a pass; jsdom has no canvas context,
// so the real module throws inside a requestAnimationFrame callback.
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

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
      </Provider>,
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
      </Provider>,
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
            {
              ...mockTrackDetail.sections[0].items[0],
              type: TrackItemType.QUIZ,
              hasDiscussion: true,
            },
          ],
        },
      ],
    };
    (api.useGetLearnTrackDetailQuery as vi.Mock).mockReturnValue({
      data: mockTrackWithDiscussion,
      isError: false,
      refetch: vi.fn(),
    });

    const mockSubmitQuizAttempt = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        attemptId: "attempt1",
        attemptNumber: 1,
        status: "GRADED",
        scorePct: 100,
        passed: true,
        passScore: 80,
        attemptsUsed: 1,
        maxAttempts: null,
        questions: [{ questionId: "q1-1", correct: true, graded: true }],
        itemCompleted: true,
        unlockedItemIds: [],
        sectionCompleted: true,
        trackCompleted: true,
      }),
    });
    (api.useStartTrackItemMutation as vi.Mock).mockReturnValue([
      vi.fn().mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
          type: TrackItemType.QUIZ,
          quiz: {
            settings: { passScore: 80, maxAttempts: null, showExplanations: "always" },
            totalPoints: 1,
            questions: [
              {
                id: "q1-1",
                type: "true_false",
                prompt: "Is this a test?",
                points: 1,
                graded: true,
              },
            ],
          },
          attemptsUsed: 0,
          maxAttempts: null,
        }),
      }),
    ]);
    (api.useSubmitQuizAttemptMutation as vi.Mock).mockReturnValue([
      mockSubmitQuizAttempt,
      { isLoading: false },
    ]);
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
      </Provider>,
    );

    // 1. Start the quiz from its intro card.
    const startButton = await screen.findByRole("button", { name: "Start quiz" });
    fireEvent.click(startButton);

    // 2. Answer the only question and submit the attempt.
    fireEvent.click(await screen.findByRole("radio", { name: "True" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit quiz" }));

    // 3. The results screen is shown, but the course-complete overlay is
    //    held back so the learner can still reach the discussion below.
    await screen.findByText("Passed");
    expect(mockSubmitQuizAttempt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Course complete!" })).not.toBeInTheDocument();

    // 4. Next on the results screen (this is the last item, so the bottom
    //    nav reads "Finish" and the only "Next" is the quiz's) fires the
    //    deferred celebration.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("heading", { name: "Course complete!" })).toBeInTheDocument();
  });
});
