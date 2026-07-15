import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { SessionRatingTrigger } from "../SessionRatingTrigger";

// SessionRatingTrigger is a thin i18n wrapper over the shared StarRating (used
// live here, not mocked) — full star behaviour is covered by StarRating's own
// tests, so these focus on the wrapper's wiring.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) =>
      key === "simulationFeedback.starLabel" ? `Star ${options?.star} of ${options?.total}` : key,
  }),
}));

describe("SessionRatingTrigger", () => {
  const defaultProps = { value: 0, onSelect: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a radiogroup of 5 stars with the i18n group label", () => {
    render(<SessionRatingTrigger {...defaultProps} />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-label",
      "simulationFeedback.rateTitle",
    );
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("labels each star with the i18n star label", () => {
    render(<SessionRatingTrigger {...defaultProps} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Star ${i} of 5`)).toBeInTheDocument();
    }
  });

  it("checks the star matching the current value", () => {
    render(<SessionRatingTrigger {...defaultProps} value={3} />);
    const stars = screen.getAllByRole("radio");
    expect(stars[2]).toHaveAttribute("aria-checked", "true");
    expect(stars[0]).toHaveAttribute("aria-checked", "false");
  });

  it("forwards the clicked star value to onSelect", async () => {
    const onSelect = vi.fn();
    render(<SessionRatingTrigger value={0} onSelect={onSelect} />);
    await userEvent.click(screen.getByLabelText("Star 4 of 5"));
    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it("forwards keyboard selection to onSelect", () => {
    const onSelect = vi.fn();
    render(<SessionRatingTrigger value={2} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByLabelText("Star 2 of 5"), { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("does not throw when onSelect is omitted", async () => {
    render(<SessionRatingTrigger value={0} />);
    await expect(userEvent.click(screen.getByLabelText("Star 1 of 5"))).resolves.not.toThrow();
  });
});
