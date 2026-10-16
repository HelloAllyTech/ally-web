import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { TrackItemType } from "@types";

import { QuizItemPlayer } from "./QuizItemPlayer";

vi.mock("@api", () => ({
  useSubmitQuizAttemptMutation: () => [vi.fn(), { isLoading: false }],
  useRegradeQuizAttemptMutation: () => [vi.fn(), { isLoading: false }],
  useStartTrackItemMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  RichTextRenderer: ({ content }: { content: string }) => (
    <div data-testid="rich-text">{content}</div>
  ),
  htmlToPlainText: (html: string) => html.replace(/<[^>]*>/g, ""),
}));

vi.mock("../QuestionMedia", () => ({
  QuestionMedia: () => <div data-testid="question-media" />,
}));

vi.mock("./QuizIntro", () => ({
  QuizIntro: ({ onStart }: { onStart: () => void }) => (
    <button onClick={onStart}>Start Quiz</button>
  ),
}));

const mockPayload = {
  type: TrackItemType.QUIZ,
  quiz: {
    questions: [
      {
        id: "q1",
        type: "mcq_single",
        prompt: "Plain prompt",
        promptHtml: "<p>Rich prompt</p>",
        options: [],
        points: 1,
      },
    ],
    settings: {
      passScore: 70,
      maxAttempts: null,
      showExplanations: "never",
    },
    totalPoints: 1,
  },
  attemptsUsed: 0,
  maxAttempts: null,
  trackItemProgressId: "progress-1",
};

describe("QuizItemPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders promptHtml with RichTextRenderer when present", async () => {
    render(
      <QuizItemPlayer
        payload={mockPayload as any}
        itemId="item-1"
        onCompleted={vi.fn()}
        onRequestNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Start Quiz"));

    expect(await screen.findByTestId("rich-text")).toHaveTextContent("<p>Rich prompt</p>");
  });

  it("falls back to plain prompt when promptHtml is absent", async () => {
    const fallbackPayload = {
      ...mockPayload,
      quiz: {
        ...mockPayload.quiz,
        questions: [
          {
            id: "q2",
            type: "mcq_single",
            prompt: "Fallback prompt",
            options: [],
            points: 1,
          },
        ],
      },
    };

    render(
      <QuizItemPlayer
        payload={fallbackPayload as any}
        itemId="item-2"
        onCompleted={vi.fn()}
        onRequestNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Start Quiz"));

    expect(await screen.findByText("Fallback prompt")).toBeInTheDocument();
    expect(screen.queryByTestId("rich-text")).not.toBeInTheDocument();
  });
});
