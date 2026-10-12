
import { vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@store";
import { TrackPlayer } from "../TrackPlayer";
import * as api from "@api";
import { QuizAttemptResult, TrackDetail, TrackItemStatus, TrackItemType } from "@types";

vi.mock("canvas-confetti", () => ({
    __esModule: true,
    default: vi.fn(),
}));

vi.mock("@api", async () => ({
  ...(await vi.importActual<typeof api>("@api")),
  useGetLearnTrackDetailQuery: vi.fn(),
  useStartTrackItemMutation: vi.fn(),
  useGetCourseDiscussionQuery: vi.fn(),
  useSubmitQuizAttemptMutation: vi.fn(),
  useRegradeQuizAttemptMutation: vi.fn(),
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
          hasDiscussion: false,
        },
      ],
    },
  ],
};

const mockQuizTrackDetail = (hasDiscussion: boolean): TrackDetail => ({
    ...mockTrackDetail,
    sections: [
        {
            ...mockTrackDetail.sections[0],
            items: [
                {
                    ...mockTrackDetail.sections[0].items[0],
                    id: "quiz1",
                    type: TrackItemType.QUIZ,
                    title: "Test Quiz",
                    hasDiscussion,
                },
            ],
        },
    ],
});


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

const mockStartQuizItemMutation = [
    vi.fn().mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
            type: TrackItemType.QUIZ,
            quiz: {
                id: "q1",
                title: "Test Quiz",
                questions: [{ id: "qq1", type: "true_false", prompt: "Is this a test?" }],
                settings: {
                    passScore: 80,
                }
            },
            attemptsUsed: 0,
            maxAttempts: null,
        }),
    }),
];

const mockSubmitQuizAttemptMutation = (trackCompleted: boolean) => [
    vi.fn().mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
            passed: true,
            itemCompleted: true,
            trackCompleted,
            sectionCompleted: true,
            status: "PASSED",
            questions: [],
            scorePct: 100,
        } as QuizAttemptResult),
    }),
    { isLoading: false },
];

const mockRegradeQuizAttemptMutation = () => [
    vi.fn().mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
            passed: true,
            itemCompleted: true,
            trackCompleted: true,
            sectionCompleted: true,
            status: "PASSED",
        } as QuizAttemptResult),
    }),
    { isLoading: false },
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

  it("does not show celebration overlay for a completed track if the last item has a discussion", async () => {
    (api.useGetLearnTrackDetailQuery as vi.Mock).mockReturnValue({
      data: mockQuizTrackDetail(true),
      isError: false,
      refetch: vi.fn(),
    });
    (api.useStartTrackItemMutation as vi.Mock).mockReturnValue(mockStartQuizItemMutation);
    (api.useSubmitQuizAttemptMutation as vi.Mock).mockReturnValue(mockSubmitQuizAttemptMutation(true));
    (api.useRegradeQuizAttemptMutation as vi.Mock).mockReturnValue(mockRegradeQuizAttemptMutation());
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
        <MemoryRouter initialEntries={["/track/track1/quiz1"]}>
          <Routes>
            <Route path="/track/:trackId/:itemId" element={<TrackPlayer />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => expect(screen.getByText("Test Quiz")).toBeInTheDocument());

    const startButton = screen.getByRole("button", { name: "Start quiz" });
    fireEvent.click(startButton);

    await waitFor(() => expect(screen.getByText("Is this a test?")).toBeInTheDocument());
    
    const trueButton = screen.getByRole("radio", { name: "True" });
    fireEvent.click(trueButton);
    
    const nextButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
        expect(screen.queryByText("Course complete!")).not.toBeInTheDocument();
    });
  });

  it("shows celebration overlay for a completed track if the last item does not have a discussion", async () => {
    (api.useGetLearnTrackDetailQuery as vi.Mock).mockReturnValue({
      data: mockQuizTrackDetail(false),
      isError: false,
      refetch: vi.fn(),
    });
    (api.useStartTrackItemMutation as vi.Mock).mockReturnValue(mockStartQuizItemMutation);
    (api.useSubmitQuizAttemptMutation as vi.Mock).mockReturnValue(mockSubmitQuizAttemptMutation(true));
    (api.useRegradeQuizAttemptMutation as vi.Mock).mockReturnValue(mockRegradeQuizAttemptMutation());
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
        <MemoryRouter initialEntries={["/track/track1/quiz1"]}>
          <Routes>
            <Route path="/track/:trackId/:itemId" element={<TrackPlayer />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    
    await waitFor(() => expect(screen.getByText("Test Quiz")).toBeInTheDocument());

    const startButton = screen.getByRole("button", { name: "Start quiz" });
    fireEvent.click(startButton);

    await waitFor(() => expect(screen.getByText("Is this a test?")).toBeInTheDocument());
    
    const trueButton = screen.getByRole("radio", { name: "True" });
    fireEvent.click(trueButton);
    
    const nextButton = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
        expect(screen.getByText("Course complete!")).toBeInTheDocument();
    });
  });
});
