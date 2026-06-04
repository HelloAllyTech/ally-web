import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { FeedbackSectionProps } from "../../types";
import { SimulationFeedback } from "../SimulationFeedback";

const TAGS: Record<number, string[]> = {
  1: ["Poor", "Not helpful", "Very bad"],
  2: ["Below average", "Lacking", "Unsatisfying"],
  3: ["Neutral", "Okay", "Average"],
  4: ["Good", "Helpful", "Satisfying"],
  5: ["Excellent", "Amazing", "Highly useful"],
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.returnObjects) {
        const match = key.match(/rating\.tags\.(\d)$/);
        return match ? (TAGS[Number(match[1])] ?? []) : [];
      }
      return key;
    },
    i18n: { language: "en" },
  }),
}));

const mockSubmitSimulationFeedback = vi.fn();
vi.mock("@api", () => ({
  useSubmitSimulationFeedbackMutation: () => [mockSubmitSimulationFeedback, { isLoading: false }],
}));

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
  StarRating: ({ rating, setRating }: { rating: number; setRating: (rating: number) => void }) => (
    <div data-testid="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          data-testid={`star-${star}`}
          onClick={() => setRating(star)}
          className={star <= rating ? "filled" : "empty"}
        >
          ⭐
        </button>
      ))}
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SimulationFeedback", () => {
  const defaultProps: FeedbackSectionProps = {
    id: "test-session-123",
    onSubmitComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitSimulationFeedback.mockResolvedValue({ data: { success: true } });
  });

  describe("Basic Rendering", () => {
    it("should render the component with initial state", () => {
      render(<SimulationFeedback {...defaultProps} />);

      expect(screen.getByTestId("star-rating")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Tell us how we can improve...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });

    it("should render with correct initial values when no initial props", () => {
      render(<SimulationFeedback {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Tell us how we can improve...");
      expect(textarea).toHaveValue("");
      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });

    it("should render all star rating buttons", () => {
      render(<SimulationFeedback {...defaultProps} />);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByTestId(`star-${i}`)).toBeInTheDocument();
      }
    });

    it("should render textarea with correct props", () => {
      render(<SimulationFeedback {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Tell us how we can improve...");
      expect(textarea).toHaveAttribute("data-multiline", "true");
      expect(textarea).toHaveAttribute("data-fullwidth", "true");
      expect(textarea).toHaveAttribute("rows", "4");
    });

    it("should not show tags when rating is 0", () => {
      render(<SimulationFeedback {...defaultProps} />);

      expect(screen.queryByText("Good")).not.toBeInTheDocument();
      expect(screen.queryByText("Poor")).not.toBeInTheDocument();
    });
  });

  describe("Initial Props", () => {
    it("should pre-populate rating from initialRating", () => {
      render(<SimulationFeedback {...defaultProps} initialRating={4} />);

      expect(screen.getByRole("button", { name: "Submit" })).not.toBeDisabled();
      expect(screen.getByTestId("star-4")).toHaveClass("filled");
    });

    it("should pre-populate comment from initialComment", () => {
      render(<SimulationFeedback {...defaultProps} initialComment="Great session" />);

      expect(screen.getByPlaceholderText("Tell us how we can improve...")).toHaveValue(
        "Great session",
      );
    });

    it("should pre-select tags from initialTags when initialRating matches", () => {
      render(
        <SimulationFeedback
          {...defaultProps}
          initialRating={4}
          initialTags={["Good", "Helpful"]}
        />,
      );

      const goodTag = screen.getByRole("button", { name: "Good" });
      const helpfulTag = screen.getByRole("button", { name: "Helpful" });
      const satisfyingTag = screen.getByRole("button", { name: "Satisfying" });

      expect(goodTag).toHaveClass("bg-primary-600");
      expect(helpfulTag).toHaveClass("bg-primary-600");
      expect(satisfyingTag).not.toHaveClass("bg-primary-600");
    });

    it("should enable submit when initialRating >= 1", () => {
      render(<SimulationFeedback {...defaultProps} initialRating={3} />);

      expect(screen.getByRole("button", { name: "Submit" })).not.toBeDisabled();
    });
  });

  describe("Star Rating Interaction", () => {
    it("should update rating when star is clicked", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-3"));

      expect(screen.getByTestId("star-3")).toHaveClass("filled");
    });

    it("should show rating text when rating is selected", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-4"));

      expect(screen.getByText("postSim.feedback.dialog.rating.4")).toBeInTheDocument();
    });

    it("should enable submit button when rating is selected", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

      await user.click(screen.getByTestId("star-3"));

      expect(screen.getByRole("button", { name: "Submit" })).not.toBeDisabled();
    });

    it("should handle rating changes correctly", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-2"));
      await user.click(screen.getByTestId("star-4"));

      expect(screen.getByTestId("star-4")).toHaveClass("filled");
    });
  });

  describe("Tag Behavior", () => {
    it("should show tags when rating >= 1", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-4"));

      expect(screen.getByRole("button", { name: "Good" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Helpful" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Satisfying" })).toBeInTheDocument();
    });

    it("should show different tags for different ratings", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-1"));
      expect(screen.getByRole("button", { name: "Poor" })).toBeInTheDocument();

      await user.click(screen.getByTestId("star-5"));
      expect(screen.getByRole("button", { name: "Excellent" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Poor" })).not.toBeInTheDocument();
    });

    it("should toggle a tag on click", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-4"));
      const goodTag = screen.getByRole("button", { name: "Good" });

      await user.click(goodTag);
      expect(goodTag).toHaveClass("bg-primary-600");

      await user.click(goodTag);
      expect(goodTag).not.toHaveClass("bg-primary-600");
    });

    it("should allow selecting multiple tags", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-4"));
      await user.click(screen.getByRole("button", { name: "Good" }));
      await user.click(screen.getByRole("button", { name: "Helpful" }));

      expect(screen.getByRole("button", { name: "Good" })).toHaveClass("bg-primary-600");
      expect(screen.getByRole("button", { name: "Helpful" })).toHaveClass("bg-primary-600");
    });

    it("should clear selected tags when rating changes", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-4"));
      await user.click(screen.getByRole("button", { name: "Good" }));
      expect(screen.getByRole("button", { name: "Good" })).toHaveClass("bg-primary-600");

      await user.click(screen.getByTestId("star-5"));
      expect(screen.queryByRole("button", { name: "Good" })).not.toBeInTheDocument();
      const excellentTag = screen.getByRole("button", { name: "Excellent" });
      expect(excellentTag).not.toHaveClass("bg-primary-600");
    });
  });

  describe("Comment Input", () => {
    it("should update comment when text is entered", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Tell us how we can improve...");
      await user.type(textarea, "This is a test comment");

      expect(textarea).toHaveValue("This is a test comment");
    });

    it("should handle special characters in comments", async () => {
      render(<SimulationFeedback {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Tell us how we can improve...");
      fireEvent.change(textarea, { target: { value: "Special: !@#$%^&*()" } });

      expect(textarea).toHaveValue("Special: !@#$%^&*()");
    });

    it("should handle long comments", () => {
      render(<SimulationFeedback {...defaultProps} />);

      const textarea = screen.getByPlaceholderText("Tell us how we can improve...");
      const longText = "a".repeat(1000);
      fireEvent.change(textarea, { target: { value: longText } });

      expect(textarea).toHaveValue(longText);
    });
  });

  describe("Submit Behavior", () => {
    it("should call API with rating, feedback, and selected tags", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-4"));
      await user.click(screen.getByRole("button", { name: "Good" }));
      fireEvent.change(screen.getByPlaceholderText("Tell us how we can improve..."), {
        target: { value: "Great simulation!" },
      });
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(mockSubmitSimulationFeedback).toHaveBeenCalledWith({
        sessionId: "test-session-123",
        sessionFeedback: { rating: 4, feedback: "Great simulation!", tags: ["Good"] },
      });
    });

    it("should submit with empty tags array when no tags selected", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-3"));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(mockSubmitSimulationFeedback).toHaveBeenCalledWith({
        sessionId: "test-session-123",
        sessionFeedback: { rating: 3, feedback: "", tags: [] },
      });
    });

    it("should submit pre-populated initialTags when not changed", async () => {
      const user = userEvent.setup();
      render(
        <SimulationFeedback
          {...defaultProps}
          initialRating={4}
          initialTags={["Good", "Helpful"]}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(mockSubmitSimulationFeedback).toHaveBeenCalledWith({
        sessionId: "test-session-123",
        sessionFeedback: { rating: 4, feedback: "", tags: ["Good", "Helpful"] },
      });
    });

    it("should call onSubmitComplete on successful submission", async () => {
      const user = userEvent.setup();
      const onSubmitCompleteMock = vi.fn();
      render(<SimulationFeedback {...defaultProps} onSubmitComplete={onSubmitCompleteMock} />);

      await user.click(screen.getByTestId("star-3"));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(onSubmitCompleteMock).toHaveBeenCalledTimes(1);
      });
    });

    it("should show success toast on successful submission", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-5"));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it("should handle numeric id by converting to string", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} id={12345} />);

      await user.click(screen.getByTestId("star-3"));
      await user.click(screen.getByRole("button", { name: "Submit" }));

      expect(mockSubmitSimulationFeedback).toHaveBeenCalledWith({
        sessionId: "12345",
        sessionFeedback: { rating: 3, feedback: "", tags: [] },
      });
    });

    it("should not submit when rating is 0", () => {
      render(<SimulationFeedback {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero rating — no tags shown", () => {
      render(<SimulationFeedback {...defaultProps} />);

      expect(screen.queryByText("Neutral")).not.toBeInTheDocument();
    });

    it("should not throw when onSubmitComplete is undefined", () => {
      const propsWithoutCallback = { ...defaultProps };
      delete (propsWithoutCallback as any).onSubmitComplete;

      expect(() => render(<SimulationFeedback {...propsWithoutCallback} />)).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible star rating buttons", () => {
      render(<SimulationFeedback {...defaultProps} />);

      for (let i = 1; i <= 5; i++) {
        const star = screen.getByTestId(`star-${i}`);
        expect(star.tagName).toBe("BUTTON");
      }
    });

    it("should have accessible tag buttons", async () => {
      const user = userEvent.setup();
      render(<SimulationFeedback {...defaultProps} />);

      await user.click(screen.getByTestId("star-3"));

      const neutralTag = screen.getByRole("button", { name: "Neutral" });
      expect(neutralTag).toBeInTheDocument();
      expect(neutralTag).toHaveAttribute("type", "button");
    });
  });
});
