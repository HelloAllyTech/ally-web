import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { IssueOptions } from "@types";

import { FeedbackSectionProps } from "../../types";
import { CallFeedback } from "../CallFeedback";

// Mock API
const mockSubmitCallFeedback = vi.fn();
vi.mock("@api", () => ({
  useSubmitCallFeedbackMutation: () => [mockSubmitCallFeedback, { isLoading: false }],
}));

// Mock components
vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  TextField: ({
    value,
    onChange,
    placeholder,
    multiline,
    rows,
    fullWidth,
    className,
    ...props
  }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
      data-multiline={multiline}
      data-fullwidth={fullWidth}
      {...props}
    />
  ),
}));

vi.mock("@containers/simulation-summary-state/components/StarRating", () => ({
  default: ({ rating, setRating }: { rating: number | null; setRating: (v: number) => void }) => (
    <div data-testid="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          data-testid={`star-${star}`}
          onClick={() => setRating(star)}
          className={rating && star <= rating ? "filled" : "empty"}
        >
          ⭐
        </button>
      ))}
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("CallFeedback", () => {
  const defaultProps: FeedbackSectionProps = {
    id: "42",
    onSubmitComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitCallFeedback.mockResolvedValue({ data: { ok: true } });
  });

  it("renders initial UI and submit disabled", () => {
    render(<CallFeedback {...defaultProps} />);
    expect(screen.getByText("Rate the AI-generated summary?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("shows rating helper text and toggles issues UI for <5 ratings", async () => {
    const user = userEvent.setup();
    render(<CallFeedback {...defaultProps} />);

    await user.click(screen.getByTestId("star-5"));
    expect(screen.getByText("Excellent quality - Highly recommended")).toBeInTheDocument();
    expect(screen.queryByText("Please select one or more issues")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("star-3"));
    expect(screen.getByText("Average quality - Meets basic expectations")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Please select one or more issues")).toBeInTheDocument(),
    );
  });

  it("validates submit disabled rules for non-5 ratings", async () => {
    const user = userEvent.setup();
    render(<CallFeedback {...defaultProps} />);

    // pick rating 3, no issues selected
    await user.click(screen.getByTestId("star-3"));
    const submitButton = screen.getByRole("button", { name: "Submit" });
    expect(submitButton).toBeDisabled();

    // select one issue (non-OTHER)
    await user.click(screen.getByText(/Missing key information/i));
    expect(submitButton).not.toBeDisabled();

    // select OTHER without comment - should disable
    await user.click(screen.getByText("Other"));
    expect(submitButton).toBeDisabled();

    // add comment - should enable
    const otherTextarea = screen.getByPlaceholderText("Describe your concern here.");
    await user.type(otherTextarea, "details");
    expect(submitButton).not.toBeDisabled();
  });

  it("submits correctly for rating 5 (no issues UI)", async () => {
    const user = userEvent.setup();
    render(<CallFeedback {...defaultProps} />);

    await user.click(screen.getByTestId("star-5"));
    await user.type(
      screen.getByPlaceholderText("Anything else that you’d like to share about the summary?"),
      "Great!",
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockSubmitCallFeedback).toHaveBeenCalledWith({
      chatId: "42",
      rating: 5,
      feedback: { issues: [], comment: "Great!" },
    });
  });

  it("submits correctly for rating 3 with issues and comment", async () => {
    const user = userEvent.setup();
    render(<CallFeedback {...defaultProps} />);

    await user.click(screen.getByTestId("star-3"));
    await user.click(screen.getByText("Too short"));
    await user.click(screen.getByText("Other"));
    await user.type(screen.getByPlaceholderText("Describe your concern here."), "More detail");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mockSubmitCallFeedback).toHaveBeenCalledWith({
      chatId: "42",
      rating: 3,
      feedback: { issues: [IssueOptions.TOO_SHORT, IssueOptions.OTHER], comment: "More detail" },
    });
  });

  it("calls onSubmitComplete and shows toast on success", async () => {
    const user = userEvent.setup();
    const onSubmitComplete = vi.fn();
    const { toast } = await import("sonner");

    render(<CallFeedback {...defaultProps} onSubmitComplete={onSubmitComplete} />);

    await user.click(screen.getByTestId("star-5"));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmitComplete).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Feedback submitted successfully");
    });
  });
});
