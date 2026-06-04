import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@assets", () => ({
  Plus: () => <span data-testid="plus-icon" />,
}));

import { AddItemButton } from "../AddItemButton";

describe("AddItemButton", () => {
  it("renders the label", () => {
    render(<AddItemButton onClick={vi.fn()} label="Add field" />);
    expect(screen.getByText("Add field")).toBeInTheDocument();
  });

  it("renders the plus icon", () => {
    render(<AddItemButton onClick={vi.fn()} label="Add" />);
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<AddItemButton onClick={onClick} label="Add" />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<AddItemButton onClick={vi.fn()} label="Add" disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<AddItemButton onClick={onClick} label="Add" disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies additional className", () => {
    render(<AddItemButton onClick={vi.fn()} label="Add" className="mt-2" />);
    expect(screen.getByRole("button").className).toContain("mt-2");
  });

  it("has dashed border styling", () => {
    render(<AddItemButton onClick={vi.fn()} label="Add" />);
    expect(screen.getByRole("button").className).toContain("border-dashed");
  });
});
