import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArticleItemPlayer } from "../ArticleItemPlayer";
import {
  ArticleQuestion,
  StartArticleItemPayload,
  TrackItemType,
} from "../../../../../types/tracks";

const markArticleRead = vi.fn();
const submitArticleQuestionAnswer = vi.fn();

vi.mock("@api", () => ({
  useMarkArticleReadMutation: () => [markArticleRead, { isLoading: false }],
  useSubmitArticleQuestionAnswerMutation: () => [submitArticleQuestionAnswer, { isLoading: false }],
}));

vi.mock("@assets", () => ({
  TickGreenBackground: () => <span data-testid="tick-icon" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  RichTextRenderer: ({ content }: { content: string }) => (
    <div data-testid="prose" dangerouslySetInnerHTML={{ __html: content }} />
  ),
}));

const question = (id: string, overrides: Partial<ArticleQuestion> = {}): ArticleQuestion => ({
  id,
  type: "mcq_single",
  prompt: `Prompt ${id}`,
  points: 1,
  options: [
    { id: "a", text: `Option A (${id})` },
    { id: "b", text: `Option B (${id})` },
  ],
  answered: null,
  correctOptionId: null,
  explanation: null,
  ...overrides,
});

const payload = (questions: ArticleQuestion[]): StartArticleItemPayload => ({
  type: TrackItemType.ARTICLE,
  trackItemProgressId: "progress-1",
  html: `<p>Body</p>${questions.map(q => `<div data-ally-question="${q.id}"></div>`).join("")}`,
  minReadSeconds: 0,
  questions,
  answeredQuestionCount: questions.filter(q => q.answered).length,
});

const renderPlayer = (questions: ArticleQuestion[], onCompleted = vi.fn()) => {
  render(
    <ArticleItemPlayer
      payload={payload(questions)}
      itemId="item-1"
      alreadyCompleted={false}
      onCompleted={onCompleted}
    />,
  );
  return { onCompleted };
};

/** Shape of one successful answer response. */
const answerResponse = (over: Record<string, unknown> = {}) => ({
  unwrap: () =>
    Promise.resolve({
      correct: false,
      selectedOptionId: "b",
      correctOptionId: "a",
      explanation: null,
      answeredQuestionCount: 1,
      totalQuestionCount: 1,
      completion: null,
      ...over,
    }),
});

describe("ArticleItemPlayer — inline questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markArticleRead.mockReturnValue({ unwrap: () => Promise.resolve({ completed: true }) });
  });

  it("renders each question where its placeholder sat", () => {
    renderPlayer([question("q1"), question("q2")]);
    expect(screen.getByTestId("article-question-q1")).toBeInTheDocument();
    expect(screen.getByTestId("article-question-q2")).toBeInTheDocument();
  });

  it("does not submit on selection alone — the answer is final, so it takes a confirm", () => {
    renderPlayer([question("q1")]);
    fireEvent.click(screen.getByRole("radio", { name: /Option A \(q1\)/ }));
    expect(submitArticleQuestionAnswer).not.toHaveBeenCalled();
  });

  it("keeps the check button disabled until an option is picked", () => {
    renderPlayer([question("q1")]);
    const check = screen.getByRole("button", { name: "Check answer" });
    expect(check).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Option A \(q1\)/ }));
    expect(check).toBeEnabled();
  });

  it("marks the correct option and locks the choices after a wrong answer", async () => {
    submitArticleQuestionAnswer.mockReturnValue(answerResponse());
    renderPlayer([question("q1")]);

    fireEvent.click(screen.getByRole("radio", { name: /Option B \(q1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => expect(screen.getByText(/Incorrect/)).toBeInTheDocument());
    expect(screen.getByText(/The correct answer is marked below/)).toBeInTheDocument();
    // The correct option carries the success styling even though it wasn't picked.
    expect(screen.getByRole("radio", { name: /Option A \(q1\)/ }).className).toContain(
      "border-success-500",
    );
    screen.getAllByRole("radio").forEach(option => expect(option).toBeDisabled());
    expect(screen.queryByRole("button", { name: "Check answer" })).not.toBeInTheDocument();
  });

  it("confirms a correct answer", async () => {
    submitArticleQuestionAnswer.mockReturnValue(
      answerResponse({ correct: true, selectedOptionId: "a" }),
    );
    renderPlayer([question("q1")]);

    fireEvent.click(screen.getByRole("radio", { name: /Option A \(q1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => expect(screen.getByText("Correct")).toBeInTheDocument());
  });

  it("reports completion up when the last answer finishes the article", async () => {
    const completion = {
      completed: true,
      unlockedItemIds: ["item-2"],
      sectionCompleted: false,
      trackCompleted: false,
    };
    submitArticleQuestionAnswer.mockReturnValue(
      answerResponse({ correct: true, selectedOptionId: "a", completion }),
    );
    const { onCompleted } = renderPlayer([question("q1")]);

    fireEvent.click(screen.getByRole("radio", { name: /Option A \(q1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() => expect(onCompleted).toHaveBeenCalledWith(completion));
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("blocks mark-as-read while a question is unanswered, and says why", () => {
    renderPlayer([question("q1")]);
    const footer = screen.getByRole("button", { name: "Answer the question to continue" });
    expect(footer).toBeDisabled();
    fireEvent.click(footer);
    expect(markArticleRead).not.toHaveBeenCalled();
  });

  it("pluralises the blocked footer for several questions", () => {
    renderPlayer([question("q1"), question("q2")]);
    expect(
      screen.getByRole("button", { name: "Answer the questions to continue" }),
    ).toBeInTheDocument();
  });

  it("redraws a question answered in an earlier visit, with no way to change it", () => {
    renderPlayer([
      question("q1", {
        answered: { selectedOptionId: "b", correct: false, answeredAt: "2026-09-15T10:00:00Z" },
        correctOptionId: "a",
        explanation: null,
      }),
    ]);

    expect(screen.getByText(/Incorrect/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check answer" })).not.toBeInTheDocument();
    screen.getAllByRole("radio").forEach(option => expect(option).toBeDisabled());
    // Nothing outstanding, so the footer is back to the ordinary read flow.
    expect(screen.queryByRole("button", { name: /Answer the question/ })).not.toBeInTheDocument();
  });

  it("shows the author's explanation when one came back", async () => {
    submitArticleQuestionAnswer.mockReturnValue(
      answerResponse({ explanation: "B is a common mix-up because…" }),
    );
    renderPlayer([question("q1")]);

    fireEvent.click(screen.getByRole("radio", { name: /Option B \(q1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    await waitFor(() =>
      expect(screen.getByText("B is a common mix-up because…")).toBeInTheDocument(),
    );
  });

  it("leaves an article with no questions completing exactly as before", () => {
    render(
      <ArticleItemPlayer
        payload={{
          type: TrackItemType.ARTICLE,
          trackItemProgressId: "progress-1",
          html: "<p>Body</p>",
          minReadSeconds: 0,
        }}
        itemId="item-1"
        alreadyCompleted={false}
        onCompleted={vi.fn()}
      />,
    );
    expect(screen.queryByTestId(/article-question-/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark as read|Keep reading/ })).toBeInTheDocument();
  });
});

/**
 * A translated body can come back without a placeholder. The server already
 * stops counting that question; the footer has to agree, or the reader is
 * held behind a question that is nowhere on screen.
 */
describe("ArticleItemPlayer — a question the body no longer anchors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markArticleRead.mockReturnValue({ unwrap: () => Promise.resolve({ completed: true }) });
  });

  it("does not hold the footer shut for a question that never renders", () => {
    const q1 = question("q1");
    const q2 = question("q2");
    render(
      <ArticleItemPlayer
        payload={{
          type: TrackItemType.ARTICLE,
          trackItemProgressId: "progress-1",
          html: `<p>Body</p><div data-ally-question="q1"></div>`,
          minReadSeconds: 0,
          questions: [q1, q2],
          answeredQuestionCount: 0,
        }}
        itemId="item-1"
        alreadyCompleted={false}
        onCompleted={vi.fn()}
      />,
    );

    expect(screen.getByTestId("article-question-q1")).toBeInTheDocument();
    expect(screen.queryByTestId("article-question-q2")).not.toBeInTheDocument();
    // One outstanding question, not two.
    expect(
      screen.getByRole("button", { name: "Answer the question to continue" }),
    ).toBeInTheDocument();
  });
});
