import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ProgressBar } from "../ProgressBar";

const renderComponent = (props: React.ComponentProps<typeof ProgressBar> = {}) => {
  return render(<ProgressBar {...props} />);
};

describe("ProgressBar", () => {
  it("renders a progressbar with the correct fill width for a given value", () => {
    renderComponent({ value: 45 });

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ width: "45%" });
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("renders a zero-width fill for value 0", () => {
    renderComponent({ value: 0 });

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ width: "0%" });
  });

  it("renders a full bar for value 100", () => {
    renderComponent({ value: 100 });

    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ width: "100%" });
  });

  it("clamps values above 100", () => {
    renderComponent({ value: 150 });

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ width: "100%" });
  });

  it("clamps values below 0", () => {
    renderComponent({ value: -20 });

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByTestId("progress-bar-fill")).toHaveStyle({ width: "0%" });
  });

  it("renders the -- fallback when value is undefined", () => {
    renderComponent();

    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders the -- fallback when value is null", () => {
    renderComponent({ value: null });

    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("appends a custom className to the wrapper", () => {
    const { container } = renderComponent({ value: 50, className: "custom-class" });

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
