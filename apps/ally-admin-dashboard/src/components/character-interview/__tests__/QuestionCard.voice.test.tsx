import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuestionCard } from "../QuestionCard";

/**
 * The interview's voice question. Covers the three things that were lost on it:
 * the agent's per-voice reasoning was never rendered, no voice could be heard
 * before it was chosen, and "None of these" had no control despite the
 * interviewer setting allowNone on this very question.
 *
 * Both question kinds are covered on purpose. The interviewer prompt says to
 * ask about voices with `dropdown`, but a live run with a four-voice shortlist
 * asked with `singleSelect` — and an earlier version of this gated the whole
 * feature on `kind === "dropdown"`, so the real voice question rendered with no
 * play buttons at all while these tests passed.
 */

const VOICES = [
  { id: "voice-a", name: "Anushka", provider: "SARVAM", config: { gender: "female" } },
  { id: "voice-b", name: "Abhilash", provider: "SARVAM", config: { gender: "male" } },
];

const mocks = vi.hoisted(() => ({ play: vi.fn(), pause: vi.fn() }));

// `@constants` (via en) reaches @store, which reads baseAPI.reducerPath at
// module load — undefined while @api is mocked. A stub store keeps it out.
vi.mock("@store", () => ({
  store: { dispatch: vi.fn(), getState: () => ({}), subscribe: vi.fn() },
}));

vi.mock("@api", () => ({
  useGetScenarioVoicesQuery: () => ({ data: VOICES }),
}));

vi.mock("@hooks/useVoicePreview", () => ({
  useVoicePreview: () => ({
    playingVoiceId: null,
    isLoading: false,
    play: mocks.play,
    pause: mocks.pause,
  }),
}));

const OPTIONS = [
  { id: "voice-a", label: "Anushka — English (India)", description: "Warm, mid-30s female" },
  { id: "voice-b", label: "Abhilash — English (India)", description: "Male, would not fit" },
];

/** How the prompt documents the voice question. */
const voiceQuestion = {
  id: "q-voice",
  prompt: "Which voice fits her?",
  kind: "dropdown" as const,
  allowNone: true,
  options: OPTIONS,
};

/** How a live agent actually asked it, with a short shortlist. */
const voiceQuestionAsChips = { ...voiceQuestion, kind: "singleSelect" as const };

beforeEach(() => {
  mocks.play.mockClear();
  mocks.pause.mockClear();
});

describe("QuestionCard — voice question", () => {
  it("shows the agent's reason for each voice", () => {
    render(<QuestionCard question={voiceQuestion} onAnswer={vi.fn()} />);

    // The reason is the whole point of the shortlist and was previously
    // rendered only for multiSelect, never for the voice dropdown.
    expect(screen.getByText("Warm, mid-30s female")).toBeInTheDocument();
    expect(screen.getByText("Male, would not fit")).toBeInTheDocument();
  });

  it("auditions a voice without selecting it", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={voiceQuestion} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByLabelText("Play Anushka — English (India)"));

    expect(mocks.play).toHaveBeenCalledWith("voice-a");
    // Listening through the shortlist must neither answer the question nor
    // select the voice being auditioned — Confirm stays unavailable.
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
  });

  it("keeps the pick single, since a character holds one voice", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={voiceQuestion} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByText("Anushka — English (India)"));
    fireEvent.click(screen.getByText("Abhilash — English (India)"));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    // The second pick replaced the first rather than adding to it.
    expect(onAnswer.mock.calls[0][0].answer).toMatchObject({
      selectedOptionIds: ["voice-b"],
    });
  });

  it("offers None of these, so a character can be saved without a voice", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={voiceQuestion} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByLabelText("None of these"));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(onAnswer.mock.calls[0][0].answer).toMatchObject({ none: true });
  });

  it("renders play controls when the agent asks as singleSelect", () => {
    render(<QuestionCard question={voiceQuestionAsChips} onAnswer={vi.fn()} />);

    expect(screen.getByLabelText("Play Anushka — English (India)")).toBeInTheDocument();
    expect(screen.getByText("Warm, mid-30s female")).toBeInTheDocument();
  });

  it("auditions without answering a singleSelect voice question", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={voiceQuestionAsChips} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByLabelText("Play Abhilash — English (India)"));

    expect(mocks.play).toHaveBeenCalledWith("voice-b");
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("answers on click for a singleSelect voice question", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={voiceQuestionAsChips} onAnswer={onAnswer} />);

    // singleSelect answers immediately everywhere else in this card; picking a
    // voice must not suddenly require a Confirm.
    fireEvent.click(screen.getByText("Anushka — English (India)"));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer.mock.calls[0][0].answer).toEqual({ selectedOptionIds: ["voice-a"] });
  });

  it("still offers None on a singleSelect voice question", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={voiceQuestionAsChips} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByRole("button", { name: /none of these/i }));

    expect(onAnswer.mock.calls[0][0].answer).toMatchObject({ none: true });
  });

  it("leaves a non-voice dropdown on the plain combobox", () => {
    render(
      <QuestionCard
        question={{
          ...voiceQuestion,
          options: [{ id: "guarded", label: "Guarded" }],
        }}
        onAnswer={vi.fn()}
      />,
    );

    // No option id resolves to a catalog voice, so no play controls appear.
    expect(screen.queryByLabelText(/^Play /)).not.toBeInTheDocument();
  });
});
