import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useDeleteCallLogMutation } from "@api";

import DeleteCallLogConfirmationDialog from "../DeleteCallLogConfirmationDialog";

// Mock @api
const mockDeleteCallLog = vi.fn();
vi.mock("@api", () => ({
  useDeleteCallLogMutation: vi.fn(),
}));

// Mock @components
vi.mock("@components", () => ({
  ConfirmationDialog: ({
    isOpen,
    onClose,
    onButtonClick,
    title,
    content,
    buttonText,
    buttonVariant,
    secondaryButtonText,
    onSecondaryButtonClick,
  }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-dialog">
        <div data-testid="dialog-title-normal">{title?.normal}</div>
        <div data-testid="dialog-title-italic">{title?.italic}</div>
        <div data-testid="dialog-content">{content}</div>
        <button data-testid="delete-button" onClick={onButtonClick} data-variant={buttonVariant}>
          {buttonText}
        </button>
        <button data-testid="cancel-button" onClick={onSecondaryButtonClick || onClose}>
          {secondaryButtonText}
        </button>
      </div>
    );
  },
}));

describe("DeleteCallLogConfirmationDialog", () => {
  const mockCloseDialog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDeleteCallLogMutation).mockReturnValue([
      mockDeleteCallLog,
      { isLoading: false },
    ] as any);
  });

  // --- Snapshot Tests ---

  it("should match snapshot when chatId is provided", () => {
    const { asFragment } = render(
      <DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should not render dialog when chatId is null", () => {
    render(<DeleteCallLogConfirmationDialog chatId={null} closeDialog={mockCloseDialog} />);
    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });

  it("should not render dialog when chatId is undefined", () => {
    render(<DeleteCallLogConfirmationDialog chatId={undefined} closeDialog={mockCloseDialog} />);
    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });

  it("should render dialog when chatId is provided", () => {
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);
    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();
  });

  it("should render correct title", () => {
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);
    expect(screen.getByTestId("dialog-title-normal")).toHaveTextContent("Delete");
    expect(screen.getByTestId("dialog-title-italic")).toHaveTextContent("session log?");
  });

  it("should render correct content", () => {
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);
    expect(screen.getByTestId("dialog-content")).toHaveTextContent("This action cannot be undone.");
  });

  it("should render delete button with correct text and variant", () => {
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);
    const deleteButton = screen.getByTestId("delete-button");
    expect(deleteButton).toHaveTextContent("Delete");
    expect(deleteButton).toHaveAttribute("data-variant", "destructive");
  });

  it("should render cancel button with correct text", () => {
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);
    expect(screen.getByTestId("cancel-button")).toHaveTextContent("Cancel");
  });

  // --- Interaction Tests ---

  it("should call deleteCallLog when delete button is clicked", async () => {
    mockDeleteCallLog.mockResolvedValue({});
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);

    const deleteButton = screen.getByTestId("delete-button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteCallLog).toHaveBeenCalledWith(1);
    });
  });

  it("should call closeDialog with true after successful delete", async () => {
    mockDeleteCallLog.mockResolvedValue({});
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);

    const deleteButton = screen.getByTestId("delete-button");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockCloseDialog).toHaveBeenCalledWith(true);
    });
  });

  it("should call closeDialog with false when cancel button is clicked", () => {
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);

    const cancelButton = screen.getByTestId("cancel-button");
    fireEvent.click(cancelButton);

    expect(mockCloseDialog).toHaveBeenCalledWith(false);
  });

  it("should call closeDialog with false when dialog is closed", () => {
    render(<DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />);

    const cancelButton = screen.getByTestId("cancel-button");
    fireEvent.click(cancelButton);

    expect(mockCloseDialog).toHaveBeenCalledWith(false);
  });

  it("should not call deleteCallLog when chatId is null", () => {
    render(<DeleteCallLogConfirmationDialog chatId={null} closeDialog={mockCloseDialog} />);
    expect(mockDeleteCallLog).not.toHaveBeenCalled();
  });

  // --- Edge Cases ---

  it("should handle different chatId values", () => {
    const { rerender } = render(
      <DeleteCallLogConfirmationDialog chatId={1} closeDialog={mockCloseDialog} />,
    );
    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();

    rerender(<DeleteCallLogConfirmationDialog chatId={999} closeDialog={mockCloseDialog} />);
    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();

    rerender(<DeleteCallLogConfirmationDialog chatId={null} closeDialog={mockCloseDialog} />);
    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });
});
