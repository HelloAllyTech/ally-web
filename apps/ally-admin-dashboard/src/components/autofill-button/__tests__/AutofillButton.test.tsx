import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AutofillButton } from "../AutofillButton";

vi.mock("@assets", () => ({
  WandStars: () => <span data-testid="wand-stars" />,
}));

describe("AutofillButton", () => {
  it("renders the label", () => {
    render(<AutofillButton onClick={vi.fn()} isLoading={false} label="Generate" />);
    expect(screen.getByText("Generate")).toBeInTheDocument();
  });

  it("shows the wand icon when not loading", () => {
    render(<AutofillButton onClick={vi.fn()} isLoading={false} label="Generate" />);
    expect(screen.getByTestId("wand-stars")).toBeInTheDocument();
  });

  it("shows a spinner when loading", () => {
    const { container } = render(
      <AutofillButton onClick={vi.fn()} isLoading={true} label="Generating" />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByTestId("wand-stars")).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<AutofillButton onClick={onClick} isLoading={false} label="Generate" />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when isLoading is true", () => {
    render(<AutofillButton onClick={vi.fn()} isLoading={true} label="Generating" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<AutofillButton onClick={vi.fn()} isLoading={false} label="Generate" disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is not disabled by default", () => {
    render(<AutofillButton onClick={vi.fn()} isLoading={false} label="Generate" />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<AutofillButton onClick={onClick} isLoading={false} label="Generate" disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("compact variant uses smaller padding classes", () => {
    render(<AutofillButton onClick={vi.fn()} isLoading={false} label="Generate" compact />);
    expect(screen.getByRole("button").className).toContain("px-2");
    expect(screen.getByRole("button").className).toContain("py-1");
  });

  it("compact variant fades color when disabled instead of opacity", () => {
    render(
      <AutofillButton onClick={vi.fn()} isLoading={false} label="Generate" compact disabled />,
    );
    expect(screen.getByRole("button").className).toContain("text-primary-300");
    expect(screen.getByRole("button").className).toContain("border-primary-300");
  });
});
