import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { CharacterInterviewQuestionEvent } from "@types";
import { QuestionCard } from "../QuestionCard";

// Mock @constants for en.characterInterview strings
vi.mock("@constants", () => ({
  en: {
    characterInterview: {
      selectPlaceholder: "Select an option...",
      addCustom: "Add custom",
      addCustomPlaceholder: "Enter custom value",
      noneOfThese: "None of these",
      submitAnswer: "Submit Answer",
      confirmSelection: "Confirm Selection",
      freeTextPlaceholder: "Type your answer here...",
      selectedCountLabel: (count: number) => `Selected ${count} item(s)`,
      minSelectionsHint: (min: number) => `Select at least ${min} item(s)`,
    },
  },
}));

describe("QuestionCard", () => {
  const mockOnAnswer = vi.fn();

  const mockDropdownQuestion: CharacterInterviewQuestionEvent = {
    id: "q1",
    prompt: "Which options apply?",
    kind: "dropdown",
    options: [
      { id: "opt1", label: "Option 1" },
      { id: "opt2", label: "Option 2" },
    ],
    allowCustom: false,
    allowNone: false,
  };

  it("should render a dropdown question with an accessible label", () => {
    render(
      <QuestionCard
        question={mockDropdownQuestion}
        onAnswer={mockOnAnswer}
      />
    );

    // Expecting to find a combobox with the accessible name "Select an option..."
    // This should fail initially because titleText is empty in FilterableMultiSelect.
    expect(screen.getByRole("combobox", { name: /select an option\.\.\./i })).toBeInTheDocument();
  });
});
