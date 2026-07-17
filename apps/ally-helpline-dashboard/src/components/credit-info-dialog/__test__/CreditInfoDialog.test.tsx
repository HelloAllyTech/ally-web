import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import CreditInfoDialog from "../CreditInfoDialog";
import { CreditInfoProps } from "../types";

// --- Mocks Setup ---

// Mock @assets icons
vi.mock("@assets", () => ({
  CloseIcon: ({ onClick, className, ...props }: any) => (
    <svg data-testid="mock-close-icon" onClick={onClick} className={className} {...props} />
  ),
  NoCreditLeft: (props: any) => <svg data-testid="mock-no-credit-left-icon" {...props} />,
}));

// --- Test Setup ---

const mockOnClose = vi.fn();

const defaultProps: CreditInfoProps = {
  open: true,
  onClose: mockOnClose,
  title: "No Credits Available",
  description: "You have run out of credits. Please purchase more to continue.",
  autoCloseDuration: undefined,
};

const renderComponent = (props: Partial<CreditInfoProps> = {}) => {
  return render(<CreditInfoDialog {...defaultProps} {...props} />);
};

describe("CreditInfoDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // --- Snapshot Test ---

  it("should match snapshot when fully populated", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the dialog when open is true", () => {
    renderComponent({ open: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should not render the dialog when open is false", () => {
    renderComponent({ open: false });
    // Carbon keeps the modal mounted but marks it aria-hidden when closed,
    // so it is absent from the accessibility tree.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render the title correctly", () => {
    const title = "Test Title";
    renderComponent({ title });
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("should render the description correctly", () => {
    const description = "Test description message";
    renderComponent({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("should render the CloseIcon", () => {
    renderComponent();
    const closeIcon = screen.getByTestId("mock-close-icon");
    expect(closeIcon).toBeInTheDocument();
    expect(closeIcon).toHaveClass("cursor-pointer", "self-end");
  });

  it("should render the NoCreditLeft icon", () => {
    renderComponent();
    expect(screen.getByTestId("mock-no-credit-left-icon")).toBeInTheDocument();
  });

  it("should render the dialog content inside a modal dialog", () => {
    renderComponent();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(defaultProps.title);
  });

  // --- Auto-close Tests ---

  it("should not auto-close when autoCloseDuration is not provided", () => {
    renderComponent({ autoCloseDuration: undefined });
    vi.advanceTimersByTime(5000);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should clear timer when component unmounts", () => {
    const autoCloseDuration = 5000;
    const { unmount } = renderComponent({ autoCloseDuration, open: true });

    vi.advanceTimersByTime(2000);
    unmount();
    vi.advanceTimersByTime(5000);

    // onClose should not be called after unmount
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should reset timer when open changes from false to true", () => {
    const autoCloseDuration = 3000;
    const { rerender } = renderComponent({ autoCloseDuration, open: false });

    expect(mockOnClose).not.toHaveBeenCalled();

    rerender(
      <CreditInfoDialog {...defaultProps} open={true} autoCloseDuration={autoCloseDuration} />,
    );

    vi.advanceTimersByTime(autoCloseDuration);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should not set timer when dialog is closed", () => {
    const autoCloseDuration = 3000;
    renderComponent({ autoCloseDuration, open: false });

    vi.advanceTimersByTime(autoCloseDuration);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should handle long title text", () => {
    const longTitle = "This is a very long title that might wrap or cause layout issues";
    renderComponent({ title: longTitle });
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it("should handle long description text", () => {
    const longDescription =
      "This is a very long description that contains a lot of text and might wrap across multiple lines in the dialog component.";
    renderComponent({ description: longDescription });
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it("should update when props change", () => {
    const { rerender } = renderComponent();

    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();

    const newTitle = "New Title";
    const newDescription = "New Description";

    rerender(<CreditInfoDialog {...defaultProps} title={newTitle} description={newDescription} />);

    expect(screen.getByText(newTitle)).toBeInTheDocument();
    expect(screen.getByText(newDescription)).toBeInTheDocument();
    expect(screen.queryByText(defaultProps.title)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultProps.description)).not.toBeInTheDocument();
  });

  // --- Styling Tests ---

  it("should apply correct styling classes to the container", () => {
    const { container } = renderComponent();
    const containerDiv = container.querySelector(".bg-white");

    expect(containerDiv).toHaveClass(
      "bg-white",
      "h-fit",
      "w-[400px]",
      "flex",
      "flex-col",
      "gap-6",
      "rounded-[8px]",
      "items-center",
      "justify-center",
      "pb-10",
    );
  });
});
