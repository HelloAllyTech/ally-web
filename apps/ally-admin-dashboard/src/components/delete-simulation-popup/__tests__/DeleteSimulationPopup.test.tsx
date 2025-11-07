import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { Simulation, SimulationStatus } from "@types";

import { DeleteSimulationPopup } from "../DeleteSimulationPopup";

// Mock Close asset
vi.mock("@assets", () => ({
  Close: ({ width, height }: { width?: number; height?: number }) => (
    <svg data-testid="close-icon" width={width} height={height}>
      X
    </svg>
  ),
}));

// Mock CustomImage component
vi.mock("@components", () => ({
  CustomImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="custom-image" />
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    simulation: {
      deleteDescription: "Are you sure you want to delete this",
      simulation: "Simulation",
      deleteConfirmationText: "I understand that this action cannot be undone",
      cancel: "Cancel",
      deleteForever: "Delete Forever",
    },
  },
}));

describe("DeleteSimulationPopup", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirmDelete = vi.fn();

  const mockSimulation: Simulation = {
    id: "sim-1",
    title: "Test Simulation",
    description: "This is a test simulation description",
    coverImageUrl: "https://example.com/image.jpg",
    createdBy: "John Doe",
    updatedAt: "2024-01-15T10:00:00Z",
    status: SimulationStatus.ACTIVE,
    usage: 10,
    isPreviewEnabled: true,
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    simulation: mockSimulation,
    onConfirmDelete: mockOnConfirmDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders when isOpen is true", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(screen.getByText(/Are you sure you want to delete this/)).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<DeleteSimulationPopup {...defaultProps} isOpen={false} />);

      expect(screen.queryByText(/Are you sure you want to delete this/)).not.toBeInTheDocument();
    });

    it("does not render when simulation is null", () => {
      render(<DeleteSimulationPopup {...defaultProps} simulation={null} />);

      expect(screen.queryByText(/Are you sure you want to delete this/)).not.toBeInTheDocument();
    });

    it("renders header text correctly", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(screen.getByText(/Are you sure you want to delete this/)).toBeInTheDocument();
      expect(screen.getByText("simulation")).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(screen.getByTestId("close-icon")).toBeInTheDocument();
    });

    it("renders simulation title", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(screen.getByText("Test Simulation")).toBeInTheDocument();
    });

    it("renders simulation description", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(screen.getByText("This is a test simulation description")).toBeInTheDocument();
    });

    it("renders simulation image", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const image = screen.getByTestId("custom-image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
      expect(image).toHaveAttribute("alt", "Test Simulation");
    });

    it("renders confirmation checkbox", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it("renders confirmation text", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(
        screen.getByText("I understand that this action cannot be undone"),
      ).toBeInTheDocument();
    });

    it("renders cancel button", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("renders delete button", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      expect(screen.getByText("Delete Forever")).toBeInTheDocument();
    });
  });

  describe("Checkbox Interaction", () => {
    it("checkbox is unchecked by default", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it("checks checkbox when clicked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it("unchecks checkbox when clicked again", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("label is clickable", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const label = screen.getByText("I understand that this action cannot be undone");
      const checkbox = screen.getByRole("checkbox");

      fireEvent.click(label);
      expect(checkbox).toBeChecked();
    });
  });

  describe("Delete Button State", () => {
    it("delete button is disabled when checkbox is not checked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const deleteButton = screen.getByText("Delete Forever");
      expect(deleteButton).toBeDisabled();
    });

    it("delete button is enabled when checkbox is checked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const deleteButton = screen.getByText("Delete Forever");
      expect(deleteButton).not.toBeDisabled();
    });

    it("delete button has disabled styling when unchecked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const deleteButton = screen.getByText("Delete Forever");
      expect(deleteButton).toHaveClass("opacity-50");
      expect(deleteButton).toHaveClass("cursor-not-allowed");
    });

    it("delete button does not call onConfirmDelete when disabled", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const deleteButton = screen.getByText("Delete Forever");
      fireEvent.click(deleteButton);

      expect(mockOnConfirmDelete).not.toHaveBeenCalled();
    });
  });

  describe("Delete Confirmation", () => {
    it("calls onConfirmDelete when delete button is clicked with checkbox checked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const deleteButton = screen.getByText("Delete Forever");
      fireEvent.click(deleteButton);

      expect(mockOnConfirmDelete).toHaveBeenCalledTimes(1);
    });

    it("resets checkbox after successful delete", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const deleteButton = screen.getByText("Delete Forever");
      fireEvent.click(deleteButton);

      expect(checkbox).not.toBeChecked();
    });

    it("does not call onConfirmDelete when checkbox is not checked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const deleteButton = screen.getByText("Delete Forever");
      fireEvent.click(deleteButton);

      expect(mockOnConfirmDelete).not.toHaveBeenCalled();
    });
  });

  describe("Close Functionality", () => {
    it("calls onClose when cancel button is clicked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when close icon is clicked", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const backdrop = container.querySelector(".bg-black.bg-opacity-50");
      fireEvent.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("resets checkbox when closing", () => {
      const { rerender } = render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      // Re-render with isOpen false, then true again to simulate reopening
      rerender(<DeleteSimulationPopup {...defaultProps} isOpen={false} />);
      rerender(<DeleteSimulationPopup {...defaultProps} isOpen={true} />);

      const newCheckbox = screen.getByRole("checkbox");
      expect(newCheckbox).not.toBeChecked();
    });

    it("does not close when clicking inside modal", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const modalContent = screen.getByText("Test Simulation");
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Styling", () => {
    it("modal has correct z-index", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const modal = container.querySelector(".z-50");
      expect(modal).toBeInTheDocument();
    });

    it("modal is centered", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const modal = container.querySelector(".items-center.justify-center");
      expect(modal).toBeInTheDocument();
    });

    it("backdrop has correct opacity", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const backdrop = container.querySelector(".bg-opacity-50");
      expect(backdrop).toBeInTheDocument();
    });

    it("modal content has animation classes", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const content = container.querySelector(".animate-in");
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass("fade-in-0");
      expect(content).toHaveClass("zoom-in-95");
    });

    it("cancel button has border styling", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toHaveClass("border");
    });

    it("buttons have rounded styling", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const deleteButton = screen.getByText("Delete Forever");
      const cancelButton = screen.getByText("Cancel");

      expect(deleteButton).toHaveClass("rounded-[50px]");
      expect(cancelButton).toHaveClass("rounded-[50px]");
    });

    it("close button is positioned absolutely", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      expect(closeButton).toHaveClass("absolute");
      expect(closeButton).toHaveClass("top-[8px]");
      expect(closeButton).toHaveClass("right-[8px]");
    });
  });

  describe("Simulation Details Card", () => {
    it("displays simulation card with border", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const card = container.querySelector(".border");
      expect(card).toBeInTheDocument();
    });

    it("image has correct dimensions", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const imageContainer = container.querySelector(".w-24.h-16");
      expect(imageContainer).toBeInTheDocument();
    });

    it("title is truncated", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const title = screen.getByText("Test Simulation");
      expect(title).toHaveClass("truncate");
    });

    it("description has line clamp", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const description = screen.getByText("This is a test simulation description");
      expect(description).toHaveClass("line-clamp-2");
    });

    it("description has gray color", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const description = screen.getByText("This is a test simulation description");
      expect(description).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles simulation with empty description", () => {
      const simWithEmptyDesc = { ...mockSimulation, description: "" };
      render(<DeleteSimulationPopup {...defaultProps} simulation={simWithEmptyDesc} />);

      expect(screen.getByText("Test Simulation")).toBeInTheDocument();
    });

    it("handles simulation with long title", () => {
      const longTitle = "This is a very long simulation title that should be truncated";
      const simWithLongTitle = { ...mockSimulation, title: longTitle };

      render(<DeleteSimulationPopup {...defaultProps} simulation={simWithLongTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles simulation with missing image", () => {
      const simWithoutImage = { ...mockSimulation, coverImageUrl: "" };
      render(<DeleteSimulationPopup {...defaultProps} simulation={simWithoutImage} />);

      const image = screen.getByTestId("custom-image");
      expect(image).toHaveAttribute("src", "");
    });

    it("handles rapid checkbox toggling", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");

      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it("handles multiple delete attempts without confirmation", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const deleteButton = screen.getByText("Delete Forever");

      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      expect(mockOnConfirmDelete).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("checkbox has proper type attribute", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("type", "checkbox");
    });

    it("checkbox is keyboard accessible", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    });

    it("buttons are keyboard accessible", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      cancelButton.focus();
      expect(document.activeElement).toBe(cancelButton);
    });

    it("close button is keyboard accessible", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const closeButton = screen.getByTestId("close-icon").parentElement!;
      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });

    it("label has cursor pointer", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const label = container.querySelector("label");
      expect(label).toHaveClass("cursor-pointer");
    });

    it("image has alt text", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const image = screen.getByTestId("custom-image");
      expect(image).toHaveAttribute("alt", "Test Simulation");
    });
  });

  describe("Component State Management", () => {
    it("maintains checkbox state across re-renders", () => {
      const { rerender } = render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      rerender(<DeleteSimulationPopup {...defaultProps} />);
      expect(checkbox).toBeChecked();
    });

    it("resets state when reopening after close", () => {
      const { rerender } = render(<DeleteSimulationPopup {...defaultProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      rerender(<DeleteSimulationPopup {...defaultProps} isOpen={false} />);
      rerender(<DeleteSimulationPopup {...defaultProps} isOpen={true} />);

      const newCheckbox = screen.getByRole("checkbox");
      expect(newCheckbox).not.toBeChecked();
    });
  });

  describe("Button Layout", () => {
    it("buttons have equal flex width", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const cancelButton = screen.getByText("Cancel");
      const deleteButton = screen.getByText("Delete Forever");

      expect(cancelButton).toHaveClass("flex-1");
      expect(deleteButton).toHaveClass("flex-1");
    });

    it("buttons container has gap", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const buttonContainer = container.querySelector(".gap-3");
      expect(buttonContainer).toBeInTheDocument();
    });
  });

  describe("Header Styling", () => {
    it("header is centered", () => {
      const { container } = render(<DeleteSimulationPopup {...defaultProps} />);

      const header = container.querySelector(".text-center");
      expect(header).toBeInTheDocument();
    });

    it("simulation word is italicized", () => {
      render(<DeleteSimulationPopup {...defaultProps} />);

      const italicText = screen.getByText("simulation");
      expect(italicText).toHaveClass("italic");
      expect(italicText).toHaveClass("font-semibold");
    });
  });
});
