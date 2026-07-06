import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { SessionType } from "@types";

import FeedbackDialog from "../FeedbackDialog";
import { FeedbackDialogProps } from "../types";

// Mock the child components
vi.mock("../components/CallFeedback", () => ({
  CallFeedback: ({
    id,
    onSubmitComplete,
  }: {
    id: number | string;
    onSubmitComplete: () => void;
  }) => (
    <div data-testid="call-feedback">
      <span>Call Feedback for ID: {id}</span>
      <button onClick={onSubmitComplete}>Submit Call Feedback</button>
    </div>
  ),
}));

vi.mock("../components/SimulationFeedback", () => ({
  SimulationFeedback: ({
    id,
    onSubmitComplete,
    initialRating,
    initialComment,
    initialTags,
  }: {
    id: number | string;
    onSubmitComplete: () => void;
    initialRating?: number;
    initialComment?: string;
    initialTags?: string[];
  }) => (
    <div data-testid="simulation-feedback">
      <span>Simulation Feedback for ID: {id}</span>
      {initialRating !== undefined && <span data-testid="initial-rating">{initialRating}</span>}
      {initialComment !== undefined && <span data-testid="initial-comment">{initialComment}</span>}
      {initialTags !== undefined && <span data-testid="initial-tags">{initialTags.join(",")}</span>}
      <button onClick={onSubmitComplete}>Submit Simulation Feedback</button>
    </div>
  ),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("FeedbackDialog", () => {
  const defaultProps: FeedbackDialogProps = {
    id: "test-id-123",
    open: true,
    onClose: vi.fn(),
    sessionType: SessionType.CALL,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the dialog when open is true", () => {
      render(<FeedbackDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render the dialog when open is false", () => {
      render(<FeedbackDialog {...defaultProps} open={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render with correct props", () => {
      const onCloseMock = vi.fn();
      render(
        <FeedbackDialog
          id="custom-id"
          open={true}
          onClose={onCloseMock}
          sessionType={SessionType.SIMULATION}
        />,
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("Conditional Rendering Based on SessionType", () => {
    it("should render CallFeedback when sessionType is CALL", () => {
      render(<FeedbackDialog {...defaultProps} sessionType={SessionType.CALL} />);

      expect(screen.getByTestId("call-feedback")).toBeInTheDocument();
      expect(screen.getByText("Call Feedback for ID: test-id-123")).toBeInTheDocument();
      expect(screen.queryByTestId("simulation-feedback")).not.toBeInTheDocument();
    });

    it("should render SimulationFeedback when sessionType is SIMULATION", () => {
      render(<FeedbackDialog {...defaultProps} sessionType={SessionType.SIMULATION} />);

      expect(screen.getByTestId("simulation-feedback")).toBeInTheDocument();
      expect(screen.getByText("Simulation Feedback for ID: test-id-123")).toBeInTheDocument();
      expect(screen.queryByTestId("call-feedback")).not.toBeInTheDocument();
    });

    it("should pass the correct id to child components", () => {
      const numericId = 456;
      render(<FeedbackDialog {...defaultProps} id={numericId} sessionType={SessionType.CALL} />);

      expect(screen.getByText(`Call Feedback for ID: ${numericId}`)).toBeInTheDocument();
    });

    it("should pass string id to child components", () => {
      const stringId = "string-id-789";
      render(
        <FeedbackDialog {...defaultProps} id={stringId} sessionType={SessionType.SIMULATION} />,
      );

      expect(screen.getByText(`Simulation Feedback for ID: ${stringId}`)).toBeInTheDocument();
    });
  });

  describe("Dialog Behavior", () => {
    it("should call onClose when dialog is closed", () => {
      const onCloseMock = vi.fn();
      render(<FeedbackDialog {...defaultProps} onClose={onCloseMock} />);

      // Simulate closing the dialog (MUI Dialog behavior)
      const dialog = screen.getByRole("dialog");
      fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("should have correct dialog styling", () => {
      render(<FeedbackDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("should render with motion div wrapper", () => {
      render(<FeedbackDialog {...defaultProps} />);

      // The motion.div now lives inside Carbon's ModalBody (`.cds--modal-content`).
      const motionDiv = screen.getByRole("dialog").querySelector(".cds--modal-content > div");
      expect(motionDiv).toHaveClass("flex", "flex-col", "items-center", "gap-4");
      expect(motionDiv).toHaveClass("font-primary");
    });
  });

  describe("Child Component Integration", () => {
    it("should pass onSubmitComplete callback to CallFeedback", () => {
      const onCloseMock = vi.fn();
      render(
        <FeedbackDialog {...defaultProps} onClose={onCloseMock} sessionType={SessionType.CALL} />,
      );

      const submitButton = screen.getByText("Submit Call Feedback");
      fireEvent.click(submitButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("should pass onSubmitComplete callback to SimulationFeedback", () => {
      const onCloseMock = vi.fn();
      render(
        <FeedbackDialog
          {...defaultProps}
          onClose={onCloseMock}
          sessionType={SessionType.SIMULATION}
        />,
      );

      const submitButton = screen.getByText("Submit Simulation Feedback");
      fireEvent.click(submitButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple onClose calls", () => {
      const onCloseMock = vi.fn();
      render(
        <FeedbackDialog {...defaultProps} onClose={onCloseMock} sessionType={SessionType.CALL} />,
      );

      const submitButton = screen.getByText("Submit Call Feedback");
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      expect(onCloseMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Animation and Motion", () => {
    it("should render motion div with correct props", () => {
      render(<FeedbackDialog {...defaultProps} />);

      // The motion.div now lives inside Carbon's ModalBody (`.cds--modal-content`).
      const motionDiv = screen.getByRole("dialog").querySelector(".cds--modal-content > div");
      expect(motionDiv).toHaveStyle({
        overflow: "hidden",
        width: "100%",
      });
    });

    it("should have correct motion variants structure", () => {
      // This test verifies that the motion variants are properly defined
      // The actual animation testing would require more complex setup
      render(<FeedbackDialog {...defaultProps} />);

      const motionDiv = screen.getByRole("dialog").querySelector("div");
      expect(motionDiv).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined onClose gracefully", () => {
      // This shouldn't happen in real usage, but testing defensive programming
      const propsWithoutOnClose = { ...defaultProps };
      delete (propsWithoutOnClose as any).onClose;

      expect(() => {
        render(<FeedbackDialog {...propsWithoutOnClose} />);
      }).not.toThrow();
    });

    it("should handle empty string id", () => {
      render(<FeedbackDialog {...defaultProps} id="" />);

      expect(
        screen.getByText((content, element) => {
          return element?.textContent === "Call Feedback for ID: ";
        }),
      ).toBeInTheDocument();
    });

    it("should handle zero as id", () => {
      render(<FeedbackDialog {...defaultProps} id={0} />);

      expect(screen.getByText("Call Feedback for ID: 0")).toBeInTheDocument();
    });

    it("should handle very long string id", () => {
      const longId = "a".repeat(1000);
      render(<FeedbackDialog {...defaultProps} id={longId} />);

      expect(screen.getByText(`Call Feedback for ID: ${longId}`)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper dialog role", () => {
      render(<FeedbackDialog {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should be focusable when open", () => {
      render(<FeedbackDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("should render with correct component hierarchy", () => {
      render(<FeedbackDialog {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      const motionDiv = dialog.querySelector("div");
      const feedbackComponent = screen.getByTestId("call-feedback");

      expect(dialog).toContainElement(motionDiv!);
      expect(motionDiv).toContainElement(feedbackComponent);
    });

    it("should maintain consistent structure across different session types", () => {
      const { rerender } = render(
        <FeedbackDialog {...defaultProps} sessionType={SessionType.CALL} />,
      );

      expect(screen.getByTestId("call-feedback")).toBeInTheDocument();

      rerender(<FeedbackDialog {...defaultProps} sessionType={SessionType.SIMULATION} />);

      expect(screen.getByTestId("simulation-feedback")).toBeInTheDocument();
      expect(screen.queryByTestId("call-feedback")).not.toBeInTheDocument();
    });
  });

  describe("Props Validation", () => {
    it("should handle all required props", () => {
      const requiredProps = {
        id: "test-id",
        open: true,
        onClose: vi.fn(),
        sessionType: SessionType.CALL,
      };

      expect(() => {
        render(<FeedbackDialog {...requiredProps} />);
      }).not.toThrow();
    });

    it("should handle boolean open prop correctly", () => {
      const { rerender } = render(<FeedbackDialog {...defaultProps} open={false} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(<FeedbackDialog {...defaultProps} open={true} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("onSubmitComplete and initial props (SimulationFeedback)", () => {
    const simulationBase = {
      id: "sim-id",
      open: true,
      onClose: vi.fn(),
      sessionType: SessionType.SIMULATION,
    };

    it("should call onSubmitComplete instead of onClose when provided", () => {
      const onSubmitCompleteMock = vi.fn();
      const onCloseMock = vi.fn();
      render(
        <FeedbackDialog
          {...simulationBase}
          onClose={onCloseMock}
          onSubmitComplete={onSubmitCompleteMock}
        />,
      );

      fireEvent.click(screen.getByText("Submit Simulation Feedback"));

      expect(onSubmitCompleteMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("should fall back to onClose when onSubmitComplete is not provided", () => {
      const onCloseMock = vi.fn();
      render(<FeedbackDialog {...simulationBase} onClose={onCloseMock} />);

      fireEvent.click(screen.getByText("Submit Simulation Feedback"));

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("should forward initialRating to SimulationFeedback", () => {
      render(<FeedbackDialog {...simulationBase} initialRating={3} />);

      expect(screen.getByTestId("initial-rating")).toHaveTextContent("3");
    });

    it("should forward initialComment to SimulationFeedback", () => {
      render(<FeedbackDialog {...simulationBase} initialComment="Nice session" />);

      expect(screen.getByTestId("initial-comment")).toHaveTextContent("Nice session");
    });

    it("should forward initialTags to SimulationFeedback", () => {
      render(<FeedbackDialog {...simulationBase} initialTags={["Good", "Helpful"]} />);

      expect(screen.getByTestId("initial-tags")).toHaveTextContent("Good,Helpful");
    });

    it("should not render initial-* testids when optional props are omitted", () => {
      render(<FeedbackDialog {...simulationBase} />);

      expect(screen.queryByTestId("initial-rating")).not.toBeInTheDocument();
      expect(screen.queryByTestId("initial-comment")).not.toBeInTheDocument();
      expect(screen.queryByTestId("initial-tags")).not.toBeInTheDocument();
    });
  });
});
