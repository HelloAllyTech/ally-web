import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import StarRating from "../StarRating";

// --- Mocks Setup ---

vi.mock("@assets", () => ({
  StarYellowIcon: ({ fill, ...props }: any) => (
    <svg data-testid="star-yellow-icon" data-fill={fill} {...props} />
  ),
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button
      data-testid="mock-button"
      onClick={onClick}
      data-variant={variant}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
  ButtonVariant: {
    PRIMARY: "primary",
    DESTRUCTIVE: "destructive",
    SECONDARY: "secondary",
    ICON: "icon",
    TEXT: "text",
  },
}));

// --- Test Setup ---

const mockSetRating = vi.fn();

const defaultProps = {
  rating: 0,
  setRating: mockSetRating,
};

const renderComponent = (props: Partial<typeof defaultProps> = {}) => {
  return render(<StarRating {...defaultProps} {...props} />);
};

describe("StarRating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Test ---

  it("should match snapshot when fully rendered", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when rating is 3", () => {
    const { asFragment } = renderComponent({ rating: 3 });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when rating is 5", () => {
    const { asFragment } = renderComponent({ rating: 5 });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the container div", () => {
    const { container } = renderComponent();
    const containerDiv = container.querySelector(".flex");
    expect(containerDiv).toBeInTheDocument();
  });

  it("should render exactly 5 star buttons", () => {
    renderComponent();
    const buttons = screen.getAllByTestId("mock-button");
    expect(buttons).toHaveLength(5);
  });

  it("should render 5 StarYellowIcon components", () => {
    renderComponent();
    const stars = screen.getAllByTestId("star-yellow-icon");
    expect(stars).toHaveLength(5);
  });

  it("should render stars with correct fill colors when rating is 0", () => {
    renderComponent({ rating: 0 });
    const stars = screen.getAllByTestId("star-yellow-icon");
    stars.forEach(star => {
      expect(star).toHaveAttribute("data-fill", "#E0E0E0");
    });
  });

  it("should render stars with correct fill colors when rating is 3", () => {
    renderComponent({ rating: 3 });
    const stars = screen.getAllByTestId("star-yellow-icon");
    // First 3 stars should be filled (yellow), last 2 should be empty (white)
    expect(stars[0]).toHaveAttribute("data-fill", "#F9CC49");
    expect(stars[1]).toHaveAttribute("data-fill", "#F9CC49");
    expect(stars[2]).toHaveAttribute("data-fill", "#F9CC49");
    expect(stars[3]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[4]).toHaveAttribute("data-fill", "#E0E0E0");
  });

  it("should render all stars filled when rating is 5", () => {
    renderComponent({ rating: 5 });
    const stars = screen.getAllByTestId("star-yellow-icon");
    stars.forEach(star => {
      expect(star).toHaveAttribute("data-fill", "#F9CC49");
    });
  });

  it("should render stars with correct fill colors when rating is 1", () => {
    renderComponent({ rating: 1 });
    const stars = screen.getAllByTestId("star-yellow-icon");
    expect(stars[0]).toHaveAttribute("data-fill", "#F9CC49");
    expect(stars[1]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[2]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[3]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[4]).toHaveAttribute("data-fill", "#E0E0E0");
  });

  // --- Interaction Tests ---

  it("should call setRating with 1 when first star is clicked", () => {
    renderComponent({ rating: 0 });
    const buttons = screen.getAllByTestId("mock-button");
    fireEvent.click(buttons[0]);
    expect(mockSetRating).toHaveBeenCalledTimes(1);
    expect(mockSetRating).toHaveBeenCalledWith(1);
  });

  it("should call setRating with 3 when third star is clicked", () => {
    renderComponent({ rating: 0 });
    const buttons = screen.getAllByTestId("mock-button");
    fireEvent.click(buttons[2]);
    expect(mockSetRating).toHaveBeenCalledTimes(1);
    expect(mockSetRating).toHaveBeenCalledWith(3);
  });

  it("should call setRating with 5 when fifth star is clicked", () => {
    renderComponent({ rating: 0 });
    const buttons = screen.getAllByTestId("mock-button");
    fireEvent.click(buttons[4]);
    expect(mockSetRating).toHaveBeenCalledTimes(1);
    expect(mockSetRating).toHaveBeenCalledWith(5);
  });

  it("should call setRating with correct rating when multiple stars are clicked", () => {
    renderComponent({ rating: 0 });
    const buttons = screen.getAllByTestId("mock-button");

    fireEvent.click(buttons[1]);
    expect(mockSetRating).toHaveBeenCalledWith(2);

    fireEvent.click(buttons[3]);
    expect(mockSetRating).toHaveBeenCalledWith(4);

    fireEvent.click(buttons[0]);
    expect(mockSetRating).toHaveBeenCalledWith(1);

    expect(mockSetRating).toHaveBeenCalledTimes(3);
  });

  it("should update rating display when rating prop changes", () => {
    const { rerender } = renderComponent({ rating: 0 });
    let stars = screen.getAllByTestId("star-yellow-icon");
    stars.forEach(star => {
      expect(star).toHaveAttribute("data-fill", "#E0E0E0");
    });

    rerender(<StarRating rating={2} setRating={mockSetRating} />);
    stars = screen.getAllByTestId("star-yellow-icon");
    expect(stars[0]).toHaveAttribute("data-fill", "#F9CC49");
    expect(stars[1]).toHaveAttribute("data-fill", "#F9CC49");
    expect(stars[2]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[3]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[4]).toHaveAttribute("data-fill", "#E0E0E0");
  });

  // --- Edge Cases ---

  it("should handle rating change from 5 to 0", () => {
    const { rerender } = renderComponent({ rating: 5 });
    let stars = screen.getAllByTestId("star-yellow-icon");
    stars.forEach(star => {
      expect(star).toHaveAttribute("data-fill", "#F9CC49");
    });

    rerender(<StarRating rating={0} setRating={mockSetRating} />);
    stars = screen.getAllByTestId("star-yellow-icon");
    stars.forEach(star => {
      expect(star).toHaveAttribute("data-fill", "#E0E0E0");
    });
  });

  it("should handle rating change from 0 to 5", () => {
    const { rerender } = renderComponent({ rating: 0 });
    let stars = screen.getAllByTestId("star-yellow-icon");
    stars.forEach(star => {
      expect(star).toHaveAttribute("data-fill", "#E0E0E0");
    });

    rerender(<StarRating rating={5} setRating={mockSetRating} />);
    stars = screen.getAllByTestId("star-yellow-icon");
    stars.forEach(star => {
      expect(star).toHaveAttribute("data-fill", "#F9CC49");
    });
  });

  it("should handle rating change from 4 to 2", () => {
    const { rerender } = renderComponent({ rating: 4 });
    let stars = screen.getAllByTestId("star-yellow-icon");
    expect(stars[3]).toHaveAttribute("data-fill", "#F9CC49");
    expect(stars[4]).toHaveAttribute("data-fill", "#E0E0E0");

    rerender(<StarRating rating={2} setRating={mockSetRating} />);
    stars = screen.getAllByTestId("star-yellow-icon");
    expect(stars[2]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[3]).toHaveAttribute("data-fill", "#E0E0E0");
    expect(stars[4]).toHaveAttribute("data-fill", "#E0E0E0");
  });

  it("should maintain correct button structure across rating changes", () => {
    const { rerender } = renderComponent({ rating: 0 });
    expect(screen.getAllByTestId("mock-button")).toHaveLength(5);

    rerender(<StarRating rating={3} setRating={mockSetRating} />);
    expect(screen.getAllByTestId("mock-button")).toHaveLength(5);

    rerender(<StarRating rating={5} setRating={mockSetRating} />);
    expect(screen.getAllByTestId("mock-button")).toHaveLength(5);
  });
});
