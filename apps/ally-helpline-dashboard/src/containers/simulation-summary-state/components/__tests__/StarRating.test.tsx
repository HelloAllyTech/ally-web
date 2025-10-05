import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import StarRating from "../StarRating";
import { StarRatingProps } from "../types";

// Mock the assets
vi.mock("@assets", () => ({
  StarYellowIcon: ({ fill }: { fill: string }) => (
    <div data-testid="star-icon" data-fill={fill}>
      ⭐
    </div>
  ),
}));

// Mock the Button component
vi.mock("@components", () => ({
  Button: ({ children, onClick, className, variant }: any) => (
    <button
      data-testid="star-button"
      onClick={onClick}
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  ),
  ButtonVariant: {
    ICON: "icon",
  },
}));

describe("StarRating", () => {
  const defaultProps: StarRatingProps = {
    rating: 0,
    setRating: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render 5 star buttons", () => {
      render(<StarRating {...defaultProps} />);

      const starButtons = screen.getAllByTestId("star-button");
      expect(starButtons).toHaveLength(5);
    });

    it("should render star icons for each button", () => {
      render(<StarRating {...defaultProps} />);

      const starIcons = screen.getAllByTestId("star-icon");
      expect(starIcons).toHaveLength(5);
    });

    it("should have correct button styling", () => {
      render(<StarRating {...defaultProps} />);

      const starButtons = screen.getAllByTestId("star-button");
      starButtons.forEach(button => {
        expect(button).toHaveClass("text-2xl", "sm:text-3xl", "!p-0");
        expect(button).toHaveAttribute("data-variant", "icon");
      });
    });
  });

  describe("Rating Display", () => {
    it("should show correct fill colors for rated stars", () => {
      render(<StarRating {...defaultProps} rating={3} />);

      const starIcons = screen.getAllByTestId("star-icon");

      // First 3 stars should be filled
      expect(starIcons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[2]).toHaveAttribute("data-fill", "#F9CC49");

      // Last 2 stars should be unfilled
      expect(starIcons[3]).toHaveAttribute("data-fill", "#ffffff");
      expect(starIcons[4]).toHaveAttribute("data-fill", "#ffffff");
    });

    it("should show all stars unfilled when rating is 0", () => {
      render(<StarRating {...defaultProps} rating={0} />);

      const starIcons = screen.getAllByTestId("star-icon");
      starIcons.forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#ffffff");
      });
    });

    it("should show all stars filled when rating is 5", () => {
      render(<StarRating {...defaultProps} rating={5} />);

      const starIcons = screen.getAllByTestId("star-icon");
      starIcons.forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#F9CC49");
      });
    });
  });

  describe("User Interactions", () => {
    it("should call setRating when a star is clicked", async () => {
      const user = userEvent.setup();
      const mockSetRating = vi.fn();

      render(<StarRating {...defaultProps} setRating={mockSetRating} />);

      const starButtons = screen.getAllByTestId("star-button");
      await user.click(starButtons[2]); // Click 3rd star

      expect(mockSetRating).toHaveBeenCalledWith(3);
    });

    it("should call setRating with correct value for each star", async () => {
      const user = userEvent.setup();
      const mockSetRating = vi.fn();

      render(<StarRating {...defaultProps} setRating={mockSetRating} />);

      const starButtons = screen.getAllByTestId("star-button");

      // Test clicking each star
      for (let i = 0; i < 5; i++) {
        await user.click(starButtons[i]);
        expect(mockSetRating).toHaveBeenCalledWith(i + 1);
      }
    });

    it("should handle multiple clicks", async () => {
      const user = userEvent.setup();
      const mockSetRating = vi.fn();

      render(<StarRating {...defaultProps} setRating={mockSetRating} />);

      const starButtons = screen.getAllByTestId("star-button");

      // Click different stars
      await user.click(starButtons[0]); // 1 star
      await user.click(starButtons[2]); // 3 stars
      await user.click(starButtons[4]); // 5 stars

      expect(mockSetRating).toHaveBeenCalledTimes(3);
      expect(mockSetRating).toHaveBeenNthCalledWith(1, 1);
      expect(mockSetRating).toHaveBeenNthCalledWith(2, 3);
      expect(mockSetRating).toHaveBeenNthCalledWith(3, 5);
    });
  });

  describe("Rating Updates", () => {
    it("should update display when rating prop changes", () => {
      const { rerender } = render(<StarRating {...defaultProps} rating={2} />);

      let starIcons = screen.getAllByTestId("star-icon");
      expect(starIcons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[2]).toHaveAttribute("data-fill", "#ffffff");

      // Update rating
      rerender(<StarRating {...defaultProps} rating={4} />);

      starIcons = screen.getAllByTestId("star-icon");
      expect(starIcons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[2]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[3]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[4]).toHaveAttribute("data-fill", "#ffffff");
    });

    it("should handle rating changes from 0 to 5", () => {
      const { rerender } = render(<StarRating {...defaultProps} rating={0} />);

      let starIcons = screen.getAllByTestId("star-icon");
      starIcons.forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#ffffff");
      });

      rerender(<StarRating {...defaultProps} rating={5} />);

      starIcons = screen.getAllByTestId("star-icon");
      starIcons.forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#F9CC49");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle rating of 0", () => {
      render(<StarRating {...defaultProps} rating={0} />);

      const starIcons = screen.getAllByTestId("star-icon");
      starIcons.forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#ffffff");
      });
    });

    it("should handle rating of 5", () => {
      render(<StarRating {...defaultProps} rating={5} />);

      const starIcons = screen.getAllByTestId("star-icon");
      starIcons.forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#F9CC49");
      });
    });

    it("should handle partial ratings correctly", () => {
      render(<StarRating {...defaultProps} rating={3} />);

      const starIcons = screen.getAllByTestId("star-icon");

      // First 3 should be filled, last 2 should be empty
      expect(starIcons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[2]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[3]).toHaveAttribute("data-fill", "#ffffff");
      expect(starIcons[4]).toHaveAttribute("data-fill", "#ffffff");
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      const mockSetRating = vi.fn();

      render(<StarRating {...defaultProps} setRating={mockSetRating} />);

      const starButtons = screen.getAllByTestId("star-button");

      // Test keyboard navigation
      await user.tab();
      expect(starButtons[0]).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(mockSetRating).toHaveBeenCalledWith(1);
    });

    it("should have proper button elements", () => {
      render(<StarRating {...defaultProps} />);

      const starButtons = screen.getAllByTestId("star-button");
      starButtons.forEach(button => {
        expect(button.tagName).toBe("BUTTON");
      });
    });
  });

  describe("Component Integration", () => {
    it("should maintain state consistency", () => {
      const mockSetRating = vi.fn();
      const { rerender } = render(<StarRating {...defaultProps} setRating={mockSetRating} />);

      // Initial state
      let starIcons = screen.getAllByTestId("star-icon");
      starIcons.forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#ffffff");
      });

      // Update rating
      rerender(<StarRating {...defaultProps} rating={2} setRating={mockSetRating} />);

      starIcons = screen.getAllByTestId("star-icon");
      expect(starIcons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(starIcons[2]).toHaveAttribute("data-fill", "#ffffff");
    });
  });
});
