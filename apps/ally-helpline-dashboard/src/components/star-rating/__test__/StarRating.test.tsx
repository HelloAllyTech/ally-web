import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import StarRating from "../StarRating";

const mockSetRating = vi.fn();

const defaultProps = {
  rating: 0,
  setRating: mockSetRating,
};

const renderComponent = (props: Partial<typeof defaultProps> & Record<string, unknown> = {}) =>
  render(<StarRating {...defaultProps} {...props} />);

const stars = () => screen.getAllByRole("radio");

describe("StarRating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders a radiogroup with 5 star buttons", () => {
      renderComponent();
      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
      expect(stars()).toHaveLength(5);
    });

    it("renders an inline svg star inside every button (never an <img>/asset)", () => {
      const { container } = renderComponent();
      expect(container.querySelectorAll("button svg")).toHaveLength(5);
    });

    it("uses the provided aria-label on the group", () => {
      renderComponent({ ariaLabel: "Rate this session" });
      expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-label", "Rate this session");
    });

    it("labels each star via the starLabel callback", () => {
      renderComponent({ starLabel: (s: number, total: number) => `Star ${s} of ${total}` });
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByLabelText(`Star ${i} of 5`)).toBeInTheDocument();
      }
    });
  });

  describe("Filled state", () => {
    it("marks empty stars when rating is 0", () => {
      renderComponent({ rating: 0 });
      stars().forEach(star => expect(star).toHaveAttribute("data-state", "empty"));
    });

    it("fills stars up to the current rating", () => {
      renderComponent({ rating: 3 });
      const [s1, s2, s3, s4, s5] = stars();
      expect(s1).toHaveAttribute("data-state", "filled");
      expect(s2).toHaveAttribute("data-state", "filled");
      expect(s3).toHaveAttribute("data-state", "filled");
      expect(s4).toHaveAttribute("data-state", "empty");
      expect(s5).toHaveAttribute("data-state", "empty");
    });

    it("fills all stars when rating is 5", () => {
      renderComponent({ rating: 5 });
      stars().forEach(star => expect(star).toHaveAttribute("data-state", "filled"));
    });

    it("treats a null rating as empty", () => {
      renderComponent({ rating: null });
      stars().forEach(star => expect(star).toHaveAttribute("data-state", "empty"));
    });

    it("reflects rating prop changes", () => {
      const { rerender } = renderComponent({ rating: 0 });
      rerender(<StarRating rating={2} setRating={mockSetRating} />);
      const [s1, s2, s3] = stars();
      expect(s1).toHaveAttribute("data-state", "filled");
      expect(s2).toHaveAttribute("data-state", "filled");
      expect(s3).toHaveAttribute("data-state", "empty");
    });
  });

  describe("Accessibility", () => {
    it("checks only the currently selected star", () => {
      renderComponent({ rating: 3 });
      const [s1, , s3, , s5] = stars();
      expect(s3).toHaveAttribute("aria-checked", "true");
      expect(s1).toHaveAttribute("aria-checked", "false");
      expect(s5).toHaveAttribute("aria-checked", "false");
    });

    it("puts tabIndex 0 on the current star and -1 on the rest", () => {
      renderComponent({ rating: 3 });
      const [s1, , s3, , s5] = stars();
      expect(s3).toHaveAttribute("tabindex", "0");
      expect(s1).toHaveAttribute("tabindex", "-1");
      expect(s5).toHaveAttribute("tabindex", "-1");
    });

    it("falls back to star 1 for tab focus when rating is 0", () => {
      renderComponent({ rating: 0 });
      expect(stars()[0]).toHaveAttribute("tabindex", "0");
    });
  });

  describe("Click interaction", () => {
    it.each([
      [0, 1],
      [2, 3],
      [4, 5],
    ])("calls setRating(%i+1) when that star is clicked", async (index, expected) => {
      renderComponent({ rating: 0 });
      await userEvent.click(stars()[index]);
      expect(mockSetRating).toHaveBeenCalledWith(expected);
    });
  });

  describe("Hover preview", () => {
    it("previews stars up to the hovered one", () => {
      renderComponent({ rating: 0 });
      fireEvent.mouseEnter(stars()[3]); // hover 4th star
      const [s1, s2, s3, s4, s5] = stars();
      expect(s1).toHaveAttribute("data-state", "hover");
      expect(s4).toHaveAttribute("data-state", "hover");
      expect(s5).toHaveAttribute("data-state", "empty");
    });

    it("reverts to the committed rating on mouse leave", () => {
      renderComponent({ rating: 2 });
      const fourth = stars()[3];
      fireEvent.mouseEnter(fourth);
      fireEvent.mouseLeave(fourth);
      const [s1, s2, s3] = stars();
      expect(s1).toHaveAttribute("data-state", "filled");
      expect(s2).toHaveAttribute("data-state", "filled");
      expect(s3).toHaveAttribute("data-state", "empty");
    });
  });

  describe("Keyboard navigation", () => {
    it("moves right/up to the next star", () => {
      renderComponent({ rating: 2 });
      fireEvent.keyDown(stars()[1], { key: "ArrowRight" });
      expect(mockSetRating).toHaveBeenCalledWith(3);
      fireEvent.keyDown(stars()[1], { key: "ArrowUp" });
      expect(mockSetRating).toHaveBeenCalledWith(3);
    });

    it("moves left/down to the previous star", () => {
      renderComponent({ rating: 3 });
      fireEvent.keyDown(stars()[2], { key: "ArrowLeft" });
      expect(mockSetRating).toHaveBeenCalledWith(2);
      fireEvent.keyDown(stars()[2], { key: "ArrowDown" });
      expect(mockSetRating).toHaveBeenCalledWith(2);
    });

    it("clamps at the ends", () => {
      const { rerender } = renderComponent({ rating: 5 });
      fireEvent.keyDown(stars()[4], { key: "ArrowRight" });
      expect(mockSetRating).toHaveBeenCalledWith(5);

      rerender(<StarRating rating={1} setRating={mockSetRating} />);
      fireEvent.keyDown(stars()[0], { key: "ArrowLeft" });
      expect(mockSetRating).toHaveBeenCalledWith(1);
    });

    it("selects on Space and Enter", () => {
      renderComponent({ rating: 0 });
      fireEvent.keyDown(stars()[2], { key: " " });
      expect(mockSetRating).toHaveBeenCalledWith(3);
      fireEvent.keyDown(stars()[3], { key: "Enter" });
      expect(mockSetRating).toHaveBeenCalledWith(4);
    });

    it("ignores unrelated keys", () => {
      renderComponent({ rating: 3 });
      fireEvent.keyDown(stars()[2], { key: "Tab" });
      expect(mockSetRating).not.toHaveBeenCalled();
    });
  });

  describe("readOnly", () => {
    it("disables the buttons and does not call setRating", async () => {
      renderComponent({ rating: 3, readOnly: true });
      stars().forEach(star => expect(star).toBeDisabled());
      await userEvent.click(stars()[0]);
      expect(mockSetRating).not.toHaveBeenCalled();
    });
  });
});
