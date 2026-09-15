import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionCard } from "../QuestionCard";

vi.mock("@store", () => ({
  store: { dispatch: vi.fn(), getState: () => ({}), subscribe: vi.fn() },
}));

vi.mock("@api", () => ({
  useGetScenarioVoicesQuery: () => ({ data: [] }),
}));

const multiSelectQuestion = {
  id: "q-multi",
  prompt: "Select multiple options",
  kind: "multiSelect" as const,
  allowCustom: true,
  options: [
    { id: "opt-1", label: "Option 1" },
    { id: "opt-2", label: "Option 2" },
  ],
};

describe("QuestionCard — multiSelect with custom value", () => {
  it("submits the answer when adding a custom value", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={multiSelectQuestion} onAnswer={onAnswer} />);

    const customInput = screen.getByPlaceholderText("Add your own…");
    fireEvent.change(customInput, { target: { value: "Custom Value" } });

    const addButton = screen.getByRole("button", { name: "Add" });
    fireEvent.click(addButton);

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Custom Value",
        answer: {
          customValues: ["Custom Value"],
        },
      }),
    );
  });
});
