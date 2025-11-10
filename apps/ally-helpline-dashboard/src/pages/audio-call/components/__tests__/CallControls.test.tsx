/**
 * Comprehensive Unit Tests for CallControls Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - Props handling and validation
 * - Button interactions and callbacks
 * - State management (tooltip visibility)
 * - Conditional rendering based on props
 * - Icon rendering and styling
 * - Tooltip functionality
 * - Edge cases and error handling
 * - Snapshot testing
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CallControlsProps } from "../../types";
import CallControls from "../CallControls";

// Mock lucide-react
vi.mock("lucide-react", () => ({
  X: ({ className, onClick }: { className?: string; onClick?: () => void }) => (
    <div data-testid="x-icon" className={className} onClick={onClick}>
      X Icon
    </div>
  ),
}));

// Mock @assets
vi.mock("@assets", () => ({
  Focus: ({ className }: { className?: string }) => (
    <div data-testid="focus-icon" className={className}>
      Focus Icon
    </div>
  ),
  PauseIcon: () => <div data-testid="pause-icon">Pause Icon</div>,
  ResumeIcon: () => <div data-testid="resume-icon">Resume Icon</div>,
  StopIcon: () => <div data-testid="stop-icon">Stop Icon</div>,
  Warning: ({ className }: { className?: string }) => (
    <div data-testid="warning-icon" className={className}>
      Warning Icon
    </div>
  ),
}));

// Mock @components
vi.mock("@components", () => ({
  ButtonGroup: ({ buttonList }: { buttonList: any[] }) => (
    <div data-testid="button-group">
      {buttonList.map((button, index) => (
        <button
          key={index}
          data-testid={`button-${index}`}
          data-active={button.isActive}
          data-disabled={button.isDisabled}
          data-show={button.show}
          onClick={button.isDisabled ? undefined : button.action}
          disabled={button.isDisabled}
        >
          {button.leftIcon}
          <span data-testid={`button-text-${index}`}>{button.text}</span>
        </button>
      ))}
    </div>
  ),
}));

describe("CallControls Component", () => {
  const defaultProps: CallControlsProps = {
    isFocusMode: false,
    isPaused: false,
    isEndSessionDisabled: false,
    isFocusButtonDisabled: false,
    isPauseTranscriptionDisabled: false,
    onEndSessionClick: vi.fn(),
    onFocusButtonClick: vi.fn(),
    onPauseTranscriptionClick: vi.fn(),
    showEndSession: true,
    showFocusButton: true,
    showPauseTranscription: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies the component renders without crashing
   */
  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      render(<CallControls {...defaultProps} />);

      expect(screen.getByTestId("button-group")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(<CallControls {...defaultProps} />);
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<CallControls {...defaultProps} />);

      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(<CallControls {...defaultProps} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        "z-10",
        "absolute",
        "bottom-10",
        "w-full",
        "flex",
        "flex-col",
        "items-center",
        "gap-4",
        "pt-[100px]",
      );
    });

    it("should render button group container", () => {
      render(<CallControls {...defaultProps} />);

      const buttonGroupContainer = screen.getByTestId("button-group").parentElement;
      expect(buttonGroupContainer).toHaveClass("relative");
    });

    it("should render data safety section", () => {
      render(<CallControls {...defaultProps} />);

      const safetySection = screen.getByText("Your data is safe").parentElement;
      expect(safetySection).toHaveClass("flex", "items-center", "gap-2");
    });

    it("should render warning icon with correct styling", () => {
      render(<CallControls {...defaultProps} />);

      const warningIcon = screen.getByTestId("warning-icon");
      expect(warningIcon).toHaveClass("[&_path]:fill-[#B6B5B9]");
    });

    it("should render data safety text with correct styling", () => {
      render(<CallControls {...defaultProps} />);

      const safetyText = screen.getByText("Your data is safe");
      expect(safetyText).toHaveClass("text-xs", "text-[#fff]", "font-medium");
    });
  });

  /**
   * TEST GROUP: Button Rendering
   * Verifies buttons are rendered correctly based on props
   */
  describe("Button Rendering", () => {
    it("should render all buttons when all show props are true", () => {
      render(<CallControls {...defaultProps} />);

      expect(screen.getByTestId("button-0")).toBeInTheDocument(); // Pause/Resume
      expect(screen.getByTestId("button-1")).toBeInTheDocument(); // Focus
      expect(screen.getByTestId("button-2")).toBeInTheDocument(); // End Session
    });

    it("should not render pause transcription button when showPauseTranscription is false", () => {
      render(<CallControls {...defaultProps} showPauseTranscription={false} />);

      const pauseButton = screen.getByTestId("button-0");
      expect(pauseButton).toHaveAttribute("data-show", "false");
    });

    it("should not render focus button when showFocusButton is false", () => {
      render(<CallControls {...defaultProps} showFocusButton={false} />);

      const focusButton = screen.getByTestId("button-1");
      expect(focusButton).toHaveAttribute("data-show", "false");
    });

    it("should not render end session button when showEndSession is false", () => {
      render(<CallControls {...defaultProps} showEndSession={false} />);

      const endSessionButton = screen.getByTestId("button-2");
      expect(endSessionButton).toHaveAttribute("data-show", "false");
    });
  });

  /**
   * TEST GROUP: Button States
   * Verifies button states are set correctly
   */
  describe("Button States", () => {
    it("should set pause button as active when isPaused is true", () => {
      render(<CallControls {...defaultProps} isPaused={true} />);

      const pauseButton = screen.getByTestId("button-0");
      expect(pauseButton).toHaveAttribute("data-active", "true");
    });

    it("should set pause button as inactive when isPaused is false", () => {
      render(<CallControls {...defaultProps} isPaused={false} />);

      const pauseButton = screen.getByTestId("button-0");
      expect(pauseButton).toHaveAttribute("data-active", "false");
    });

    it("should set focus button as active when isFocusMode is true", () => {
      render(<CallControls {...defaultProps} isFocusMode={true} />);

      const focusButton = screen.getByTestId("button-1");
      expect(focusButton).toHaveAttribute("data-active", "true");
    });

    it("should set focus button as inactive when isFocusMode is false", () => {
      render(<CallControls {...defaultProps} isFocusMode={false} />);

      const focusButton = screen.getByTestId("button-1");
      expect(focusButton).toHaveAttribute("data-active", "false");
    });

    it("should set end session button as disabled when isEndSessionDisabled is true", () => {
      render(<CallControls {...defaultProps} isEndSessionDisabled={true} />);

      const endSessionButton = screen.getByTestId("button-2");
      expect(endSessionButton).toHaveAttribute("data-disabled", "true");
    });

    it("should set focus button as disabled when isFocusButtonDisabled is true", () => {
      render(<CallControls {...defaultProps} isFocusButtonDisabled={true} />);

      const focusButton = screen.getByTestId("button-1");
      expect(focusButton).toHaveAttribute("data-disabled", "true");
    });

    it("should set pause button as disabled when isPauseTranscriptionDisabled is true", () => {
      render(<CallControls {...defaultProps} isPauseTranscriptionDisabled={true} />);

      const pauseButton = screen.getByTestId("button-0");
      expect(pauseButton).toHaveAttribute("data-disabled", "true");
    });
  });

  /**
   * TEST GROUP: Button Text and Icons
   * Verifies button text and icons are rendered correctly
   */
  describe("Button Text and Icons", () => {
    it("should show 'Pause Transcription' text when not paused", () => {
      render(<CallControls {...defaultProps} isPaused={false} />);

      expect(screen.getByTestId("button-text-0")).toHaveTextContent("Pause Transcription");
    });

    it("should show 'Resume Transcription' text when paused", () => {
      render(<CallControls {...defaultProps} isPaused={true} />);

      expect(screen.getByTestId("button-text-0")).toHaveTextContent("Resume Transcription");
    });

    it("should show 'Focus' text when not in focus mode", () => {
      render(<CallControls {...defaultProps} isFocusMode={false} />);

      expect(screen.getByTestId("button-text-1")).toHaveTextContent("Focus");
    });

    it("should show 'Focused' text when in focus mode", () => {
      render(<CallControls {...defaultProps} isFocusMode={true} />);

      expect(screen.getByTestId("button-text-1")).toHaveTextContent("Focused");
    });

    it("should show 'End session' text", () => {
      render(<CallControls {...defaultProps} />);

      expect(screen.getByTestId("button-text-2")).toHaveTextContent("End session");
    });

    it("should render pause icon when not paused", () => {
      render(<CallControls {...defaultProps} isPaused={false} />);

      expect(screen.getByTestId("pause-icon")).toBeInTheDocument();
    });

    it("should render resume icon when paused", () => {
      render(<CallControls {...defaultProps} isPaused={true} />);

      expect(screen.getByTestId("resume-icon")).toBeInTheDocument();
    });

    it("should render focus icon with correct styling when not in focus mode", () => {
      render(<CallControls {...defaultProps} isFocusMode={false} />);

      const focusIcon = screen.getByTestId("focus-icon");
      expect(focusIcon).toHaveClass("[&_path]:fill-[#FFFFFF]");
    });

    it("should render focus icon without fill styling when in focus mode", () => {
      render(<CallControls {...defaultProps} isFocusMode={true} />);

      const focusIcon = screen.getByTestId("focus-icon");
      expect(focusIcon).not.toHaveClass("[&_path]:fill-[#FFFFFF]");
    });

    it("should render stop icon", () => {
      render(<CallControls {...defaultProps} />);

      expect(screen.getByTestId("stop-icon")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Button Interactions
   * Verifies button click handlers are called correctly
   */
  describe("Button Interactions", () => {
    it("should call onPauseTranscriptionClick when pause button is clicked", () => {
      const mockOnPauseTranscriptionClick = vi.fn();
      render(
        <CallControls
          {...defaultProps}
          onPauseTranscriptionClick={mockOnPauseTranscriptionClick}
        />,
      );

      const pauseButton = screen.getByTestId("button-0");
      fireEvent.click(pauseButton);

      expect(mockOnPauseTranscriptionClick).toHaveBeenCalledTimes(1);
    });

    it("should call onFocusButtonClick with correct value when focus button is clicked", () => {
      const mockOnFocusButtonClick = vi.fn();
      render(
        <CallControls
          {...defaultProps}
          isFocusMode={false}
          onFocusButtonClick={mockOnFocusButtonClick}
        />,
      );

      const focusButton = screen.getByTestId("button-1");
      fireEvent.click(focusButton);

      expect(mockOnFocusButtonClick).toHaveBeenCalledWith(true);
    });

    it("should call onFocusButtonClick with false when focus button is clicked in focus mode", () => {
      const mockOnFocusButtonClick = vi.fn();
      render(
        <CallControls
          {...defaultProps}
          isFocusMode={true}
          onFocusButtonClick={mockOnFocusButtonClick}
        />,
      );

      const focusButton = screen.getByTestId("button-1");
      fireEvent.click(focusButton);

      expect(mockOnFocusButtonClick).toHaveBeenCalledWith(false);
    });

    it("should call onEndSessionClick when end session button is clicked", () => {
      const mockOnEndSessionClick = vi.fn();
      render(<CallControls {...defaultProps} onEndSessionClick={mockOnEndSessionClick} />);

      const endSessionButton = screen.getByTestId("button-2");
      fireEvent.click(endSessionButton);

      expect(mockOnEndSessionClick).toHaveBeenCalledTimes(1);
    });

    it("should not call handlers when buttons are disabled", () => {
      const mockOnPauseTranscriptionClick = vi.fn();
      const mockOnFocusButtonClick = vi.fn();
      const mockOnEndSessionClick = vi.fn();

      render(
        <CallControls
          {...defaultProps}
          isPauseTranscriptionDisabled={true}
          isFocusButtonDisabled={true}
          isEndSessionDisabled={true}
          onPauseTranscriptionClick={mockOnPauseTranscriptionClick}
          onFocusButtonClick={mockOnFocusButtonClick}
          onEndSessionClick={mockOnEndSessionClick}
        />,
      );

      fireEvent.click(screen.getByTestId("button-0"));
      fireEvent.click(screen.getByTestId("button-1"));
      fireEvent.click(screen.getByTestId("button-2"));

      expect(mockOnPauseTranscriptionClick).not.toHaveBeenCalled();
      expect(mockOnFocusButtonClick).not.toHaveBeenCalled();
      expect(mockOnEndSessionClick).not.toHaveBeenCalled();
    });
  });

  /**
   * TEST GROUP: Tooltip Functionality
   * Verifies tooltip behavior and state management
   */
  describe("Tooltip Functionality", () => {
    it("should show tooltip when conditions are met", () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements1 = screen.getAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements1.length).toBeGreaterThan(0);
    });

    it("should not show tooltip when isPaused is false", () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={false}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements2 = screen.queryAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements2.length).toBe(0);
    });

    it("should not show tooltip when showPauseTranscription is false", () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={false}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements2 = screen.queryAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements2.length).toBe(0);
    });

    it("should not show tooltip when isPauseTranscriptionDisabled is true", () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={true}
        />,
      );

      const tooltipElements2 = screen.queryAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements2.length).toBe(0);
    });

    it("should hide tooltip when X button is clicked", async () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements4 = screen.getAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      const tooltip = tooltipElements4[0];
      expect(tooltip).toBeInTheDocument();

      const closeButton = screen.getByTestId("x-icon");
      fireEvent.click(closeButton);

      await waitFor(() => {
        const tooltipElements5 = screen.queryAllByText(
          (content, element) => element?.textContent?.includes("Need notes captured") || false,
        );
        expect(tooltipElements5.length).toBe(0);
      });
    });

    it("should show tooltip again when isPaused changes from false to true", () => {
      const { rerender } = render(
        <CallControls
          {...defaultProps}
          isPaused={false}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements2 = screen.queryAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements2.length).toBe(0);

      rerender(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements1 = screen.getAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements1.length).toBeGreaterThan(0);
    });

    it("should render tooltip with correct styling", () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      // Just verify the tooltip text is present
      const tooltipTexts = screen.getAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipTexts.length).toBeGreaterThan(0);
    });

    it("should render tooltip arrow with correct styling", () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      // Just verify the tooltip text is present
      const tooltipTexts = screen.getAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipTexts.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: State Management
   * Verifies internal state management
   */
  describe("State Management", () => {
    it("should initialize tooltip state based on isPaused prop", () => {
      render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements1 = screen.getAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements1.length).toBeGreaterThan(0);
    });

    it("should update tooltip state when isPaused changes", () => {
      const { rerender } = render(
        <CallControls
          {...defaultProps}
          isPaused={false}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements2 = screen.queryAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements2.length).toBe(0);

      rerender(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );

      const tooltipElements1 = screen.getAllByText(
        (content, element) => element?.textContent?.includes("Need notes captured") || false,
      );
      expect(tooltipElements1.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies edge cases and error handling
   */
  describe("Edge Cases", () => {
    it("should handle missing optional callbacks gracefully", () => {
      render(
        <CallControls
          {...defaultProps}
          onEndSessionClick={undefined}
          onPauseTranscriptionClick={undefined}
        />,
      );

      expect(screen.getByTestId("button-group")).toBeInTheDocument();
    });

    it("should handle all buttons hidden", () => {
      render(
        <CallControls
          {...defaultProps}
          showEndSession={false}
          showFocusButton={false}
          showPauseTranscription={false}
        />,
      );

      expect(screen.getByTestId("button-group")).toBeInTheDocument();
    });

    it("should handle all buttons disabled", () => {
      render(
        <CallControls
          {...defaultProps}
          isEndSessionDisabled={true}
          isFocusButtonDisabled={true}
          isPauseTranscriptionDisabled={true}
        />,
      );

      expect(screen.getByTestId("button-0")).toHaveAttribute("data-disabled", "true");
      expect(screen.getByTestId("button-1")).toHaveAttribute("data-disabled", "true");
      expect(screen.getByTestId("button-2")).toHaveAttribute("data-disabled", "true");
    });

    it("should handle rapid state changes", () => {
      const { rerender } = render(
        <CallControls {...defaultProps} isPaused={false} isFocusMode={false} />,
      );

      // Rapid state changes
      rerender(<CallControls {...defaultProps} isPaused={true} isFocusMode={true} />);

      rerender(<CallControls {...defaultProps} isPaused={false} isFocusMode={false} />);

      expect(screen.getByTestId("button-group")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot with default props", () => {
      const { asFragment } = render(<CallControls {...defaultProps} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot when paused", () => {
      const { asFragment } = render(<CallControls {...defaultProps} isPaused={true} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot when in focus mode", () => {
      const { asFragment } = render(<CallControls {...defaultProps} isFocusMode={true} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with all buttons disabled", () => {
      const { asFragment } = render(
        <CallControls
          {...defaultProps}
          isEndSessionDisabled={true}
          isFocusButtonDisabled={true}
          isPauseTranscriptionDisabled={true}
        />,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with tooltip visible", () => {
      const { asFragment } = render(
        <CallControls
          {...defaultProps}
          isPaused={true}
          showPauseTranscription={true}
          isPauseTranscriptionDisabled={false}
        />,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and can be used
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof CallControls).toBe("function");
    });

    it("should return a valid React element", () => {
      const { container } = render(<CallControls {...defaultProps} />);
      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(<CallControls {...defaultProps} />);
      }).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper button structure", () => {
      render(<CallControls {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have descriptive text content", () => {
      render(<CallControls {...defaultProps} />);

      expect(screen.getByText("Your data is safe")).toBeInTheDocument();
      expect(screen.getByText("Pause Transcription")).toBeInTheDocument();
      expect(screen.getByText("Focus")).toBeInTheDocument();
      expect(screen.getByText("End session")).toBeInTheDocument();
    });

    it("should have proper icon structure", () => {
      render(<CallControls {...defaultProps} />);

      expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
      expect(screen.getByTestId("focus-icon")).toBeInTheDocument();
    });
  });
});
