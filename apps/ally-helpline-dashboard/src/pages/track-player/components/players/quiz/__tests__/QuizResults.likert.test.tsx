import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuizAttemptResult, SanitizedQuizQuestion } from "../../../../../../types/tracks";
import { isAnswered, toAnswerInput } from "../quizAnswerState";
import { QuizResults } from "../QuizResults";
import { LikertScaleQuestion } from "../widgets/LikertScaleQuestion";

vi.mock("@assets", () => ({
  ArrowDownFilled: () => <span />,
  TickGreenBackground: () => <span data-testid="tick-icon" />,
  CrossRedBackground: () => <span data-testid="cross-icon" />,
}));

vi.mock("@components", () => ({
  CircularProgress: ({ current }: { current: number }) => (
    <span data-testid="score-ring">{current}</span>
  ),
}));

const likert: SanitizedQuizQuestion = {
  id: "lk",
  type: "likert_scale",
  prompt: "How did the session feel?",
  points: 0,
  graded: false,
  statements: [
    { id: "s1", text: "I felt prepared" },
    { id: "s2", text: "The caller felt heard" },
  ],
  scale: [
    { id: "p1", text: "Disagree" },
    { id: "p2", text: "Neutral" },
    { id: "p3", text: "Agree" },
  ],
};

const mcq: SanitizedQuizQuestion = {
  id: "mcq",
  type: "mcq_single",
  prompt: "What comes first?",
  points: 1,
  graded: true,
  options: [
    { id: "a", text: "Listen" },
    { id: "b", text: "Advise" },
  ],
};

const trueFalse: SanitizedQuizQuestion = {
  id: "tf",
  type: "true_false",
  prompt: "Silence is always bad",
  points: 0,
  graded: false,
};

const baseResult = (overrides: Partial<QuizAttemptResult>): QuizAttemptResult => ({
  attemptId: "att-1",
  attemptNumber: 1,
  status: "GRADED",
  scorePct: 0,
  passed: false,
  passScore: 70,
  attemptsUsed: 1,
  maxAttempts: null,
  questions: [],
  itemCompleted: false,
  unlockedItemIds: [],
  sectionCompleted: false,
  trackCompleted: false,
  ...overrides,
});

const renderResults = (
  result: QuizAttemptResult,
  questions: SanitizedQuizQuestion[],
  answers = {},
) =>
  render(
    <QuizResults
      result={result}
      questions={questions}
      answers={answers}
      isRegrading={false}
      canRetry
      onRegrade={vi.fn()}
      onRetry={vi.fn()}
      onNext={vi.fn()}
    />,
  );

describe("LikertScaleQuestion", () => {
  it("rates each statement independently", () => {
    const onChange = vi.fn();
    render(<LikertScaleQuestion question={likert} state={{ ratings: {} }} onChange={onChange} />);
    const groups = screen.getAllByRole("radiogroup");
    expect(groups).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("radio", { name: "Agree" })[1]);
    expect(onChange).toHaveBeenCalledWith({ ratings: { s2: "p3" } });
  });

  it("marks the chosen point as checked", () => {
    render(
      <LikertScaleQuestion
        question={likert}
        state={{ ratings: { s1: "p1" } }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("radio", { name: "Disagree" })[0]).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("is answered only once every statement is rated, and submits ratings", () => {
    expect(isAnswered(likert, { ratings: { s1: "p1" } })).toBe(false);
    const state = { ratings: { s1: "p1", s2: "p3" } };
    expect(isAnswered(likert, state)).toBe(true);
    expect(toAnswerInput(likert, state)).toEqual({
      questionId: "lk",
      ratings: [
        { statementId: "s1", scaleOptionId: "p1" },
        { statementId: "s2", scaleOptionId: "p3" },
      ],
    });
  });
});

describe("QuizResults - survey, ungraded and correct answers", () => {
  it("shows a survey as submitted, with no score ring and a Next button", () => {
    renderResults(
      baseResult({
        scorePct: null,
        passed: true,
        questions: [
          { questionId: "lk", correct: null, graded: false, pointsAwarded: 0, pointsPossible: 0 },
        ],
      }),
      [likert],
    );
    expect(screen.getByText("Responses submitted")).toBeInTheDocument();
    expect(screen.queryByTestId("score-ring")).not.toBeInTheDocument();
    expect(screen.queryByText("Passed")).not.toBeInTheDocument();
    // An ungraded null is not "pending" — no grading button to get stuck on.
    expect(screen.queryByText("Finish grading")).not.toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("reads back the learner's Likert responses", () => {
    renderResults(
      baseResult({
        scorePct: null,
        passed: true,
        questions: [
          { questionId: "lk", correct: null, graded: false, pointsAwarded: 0, pointsPossible: 0 },
        ],
      }),
      [likert],
      { lk: { ratings: { s1: "p3" } } },
    );
    fireEvent.click(screen.getByText(/How did the session feel/));
    expect(screen.getByText("Your responses")).toBeInTheDocument();
    expect(screen.getByText("Agree")).toBeInTheDocument();
    expect(screen.getByText("No response")).toBeInTheDocument();
  });

  it("labels an ungraded question Not scored instead of 0/0", () => {
    renderResults(
      baseResult({
        scorePct: 100,
        passed: true,
        questions: [
          { questionId: "mcq", correct: true, graded: true, pointsAwarded: 1, pointsPossible: 1 },
          { questionId: "tf", correct: false, graded: false, pointsAwarded: 0, pointsPossible: 0 },
        ],
      }),
      [mcq, trueFalse],
    );
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("Not scored")).toBeInTheDocument();
    expect(screen.queryByText("0/0")).not.toBeInTheDocument();
  });

  it("reveals the correct answer on a wrong answer when the key is sent", () => {
    renderResults(
      baseResult({
        questions: [
          {
            questionId: "mcq",
            correct: false,
            graded: true,
            pointsAwarded: 0,
            pointsPossible: 1,
            correctAnswer: { selectedOptionIds: ["a"] },
          },
        ],
      }),
      [mcq],
    );
    fireEvent.click(screen.getByText(/What comes first/));
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(screen.getByText(/Correct answer/)).toBeInTheDocument();
    expect(screen.getByText("Listen")).toBeInTheDocument();
  });

  it("shows only the verdict when the trainer hid the answer", () => {
    renderResults(
      baseResult({
        questions: [
          { questionId: "mcq", correct: false, graded: true, pointsAwarded: 0, pointsPossible: 1 },
        ],
      }),
      [mcq],
    );
    fireEvent.click(screen.getByText(/What comes first/));
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
    expect(screen.queryByText(/Correct answer/)).not.toBeInTheDocument();
    expect(screen.queryByText("Listen")).not.toBeInTheDocument();
  });

  it("still treats a graded null as pending grading", () => {
    renderResults(
      baseResult({
        status: "PENDING_GRADING",
        questions: [
          { questionId: "mcq", correct: null, graded: true, pointsAwarded: 0, pointsPossible: 1 },
        ],
      }),
      [mcq],
    );
    expect(screen.getByText("Finish grading")).toBeInTheDocument();
  });
});
