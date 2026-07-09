import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { SessionRatingTrigger } from "../SessionRatingTrigger";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === "simulationFeedback.starLabel") {
        return `Star ${options?.star} of ${options?.total}`;
      }
      return key;
    },
  }),
}));

vi.mock("@assets", () => ({
  StarYellowIcon: ({ fill }: { fill: string }) => <svg data-testid="star-icon" data-fill={fill} />,
}));

describe("SessionRatingTrigger", () => {
  const defaultProps = {
    value: 0,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render a radiogroup with 5 star buttons", () => {
      render(<SessionRatingTrigger {...defaultProps} />);

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(5);
    });

    it("should render with correct aria-label on the group", () => {
      render(<SessionRatingTrigger {...defaultProps} />);

      expect(screen.getByRole("radiogroup")).toHaveAttribute(
        "aria-label",
        "simulationFeedback.rateTitle",
      );
    });

    it("should render correct aria-label on each star button", () => {
      render(<SessionRatingTrigger {...defaultProps} />);

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByLabelText(`Star ${i} of 5`)).toBeInTheDocument();
      }
    });

    it("should set aria-checked true only on the currently selected star", () => {
      render(<SessionRatingTrigger {...defaultProps} value={3} />);

      const stars = screen.getAllByRole("radio");
      expect(stars[2]).toHaveAttribute("aria-checked", "true");
      expect(stars[0]).toHaveAttribute("aria-checked", "false");
      expect(stars[4]).toHaveAttribute("aria-checked", "false");
    });

    it("should set aria-checked false on all stars when value is 0", () => {
      render(<SessionRatingTrigger {...defaultProps} value={0} />);

      screen.getAllByRole("radio").forEach(star => {
        expect(star).toHaveAttribute("aria-checked", "false");
      });
    });
  });

  describe("Fill Color", () => {
    it("should fill stars up to and including the current value", () => {
      render(<SessionRatingTrigger {...defaultProps} value={3} />);

      const icons = screen.getAllByTestId("star-icon");
      expect(icons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[2]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[3]).toHaveAttribute("data-fill", "#8D8D8D");
      expect(icons[4]).toHaveAttribute("data-fill", "#8D8D8D");
    });

    it("should show all stars unfilled when value is 0", () => {
      render(<SessionRatingTrigger {...defaultProps} value={0} />);

      screen.getAllByTestId("star-icon").forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#8D8D8D");
      });
    });

    it("should show all stars filled when value is 5", () => {
      render(<SessionRatingTrigger {...defaultProps} value={5} />);

      screen.getAllByTestId("star-icon").forEach(icon => {
        expect(icon).toHaveAttribute("data-fill", "#F9CC49");
      });
    });
  });

  describe("Size Variants", () => {
    it("should apply sm icon size class", () => {
      render(<SessionRatingTrigger {...defaultProps} size="sm" />);

      screen.getAllByRole("radio").forEach(button => {
        expect(button).toHaveClass("w-5", "h-5");
      });
    });

    it("should apply md icon size class by default", () => {
      render(<SessionRatingTrigger {...defaultProps} />);

      screen.getAllByRole("radio").forEach(button => {
        expect(button).toHaveClass("w-6", "h-6");
      });
    });

    it("should apply md icon size class when size prop is md", () => {
      render(<SessionRatingTrigger {...defaultProps} size="md" />);

      screen.getAllByRole("radio").forEach(button => {
        expect(button).toHaveClass("w-6", "h-6");
      });
    });
  });

  describe("Click Interaction", () => {
    it("should call onSelect with the clicked star value", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={0} onSelect={onSelect} />);

      await user.click(screen.getByLabelText("Star 3 of 5"));

      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it("should call onSelect with correct value for each star", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={0} onSelect={onSelect} />);

      for (let i = 1; i <= 5; i++) {
        await user.click(screen.getByLabelText(`Star ${i} of 5`));
        expect(onSelect).toHaveBeenCalledWith(i);
      }
    });

    it("should not throw when onSelect is not provided", async () => {
      const user = userEvent.setup();
      render(<SessionRatingTrigger value={0} />);

      await expect(user.click(screen.getByLabelText("Star 1 of 5"))).resolves.not.toThrow();
    });
  });

  describe("Hover Interaction", () => {
    it("should fill stars up to hovered star on mouse enter", () => {
      render(<SessionRatingTrigger value={0} />);

      const star4 = screen.getByLabelText("Star 4 of 5");
      fireEvent.mouseEnter(star4);

      const icons = screen.getAllByTestId("star-icon");
      expect(icons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[2]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[3]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[4]).toHaveAttribute("data-fill", "#8D8D8D");
    });

    it("should revert to value fill on mouse leave", () => {
      render(<SessionRatingTrigger value={2} />);

      const star4 = screen.getByLabelText("Star 4 of 5");
      fireEvent.mouseEnter(star4);
      fireEvent.mouseLeave(star4);

      const icons = screen.getAllByTestId("star-icon");
      expect(icons[0]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[1]).toHaveAttribute("data-fill", "#F9CC49");
      expect(icons[2]).toHaveAttribute("data-fill", "#8D8D8D");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should call onSelect with next star on ArrowRight", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={2} onSelect={onSelect} />);

      const star2 = screen.getByLabelText("Star 2 of 5");
      fireEvent.keyDown(star2, { key: "ArrowRight" });

      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it("should call onSelect with next star on ArrowUp", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={2} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 2 of 5"), { key: "ArrowUp" });

      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it("should call onSelect with prev star on ArrowLeft", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={3} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 3 of 5"), { key: "ArrowLeft" });

      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it("should call onSelect with prev star on ArrowDown", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={3} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 3 of 5"), { key: "ArrowDown" });

      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it("should clamp at 5 on ArrowRight from star 5", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={5} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 5 of 5"), { key: "ArrowRight" });

      expect(onSelect).toHaveBeenCalledWith(5);
    });

    it("should clamp at 1 on ArrowLeft from star 1", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={1} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 1 of 5"), { key: "ArrowLeft" });

      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it("should call onSelect with current star on Space", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={2} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 3 of 5"), { key: " " });

      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it("should call onSelect with current star on Enter", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={2} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 4 of 5"), { key: "Enter" });

      expect(onSelect).toHaveBeenCalledWith(4);
    });

    it("should not call onSelect for unrelated keys", () => {
      const onSelect = vi.fn();
      render(<SessionRatingTrigger value={3} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText("Star 3 of 5"), { key: "Tab" });

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe("tabIndex / Focus Management", () => {
    it("should set tabIndex 0 on the current value star and -1 on others", () => {
      render(<SessionRatingTrigger value={3} />);

      const stars = screen.getAllByRole("radio");
      expect(stars[2]).toHaveAttribute("tabindex", "0");
      expect(stars[0]).toHaveAttribute("tabindex", "-1");
      expect(stars[4]).toHaveAttribute("tabindex", "-1");
    });

    it("should set tabIndex 0 on star 1 when value is 0 (fallback)", () => {
      render(<SessionRatingTrigger value={0} />);

      expect(screen.getByLabelText("Star 1 of 5")).toHaveAttribute("tabindex", "0");
    });
  });
});
